#!/usr/bin/env python3
"""Promote official offseason agreement notes into active contract deals.

The public contract table stores two related files:

* player_contracts_2025_2031.json keeps the compact row used by the app.
* player_contract_deals_2025_2031.json keeps deal windows used to decide
  whether a player is rostered, a two-way, non-rostered, or a free agent.

When a trusted source reports that a player agreed to a new deal but annual
salary/guarantee details are not public yet, the compact row may have a note
while the deal file remains expired. This script creates a pending deal window
from that official note so the finance pages do not incorrectly show the player
as a free agent.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


ROOT = Path(__file__).resolve().parents[1]
CONTRACTS_PATH = ROOT / "data/raw/player_contracts_2025_2031.json"
DEALS_PATH = ROOT / "data/raw/player_contract_deals_2025_2031.json"
NEWS_PATH = ROOT / "src/lib/data/news.json"
RUNTIME_PATH = ROOT / "src/lib/data/generated/runtime-fallbacks.json"

FIRST_FUTURE_START_YEAR = 2026
CONTRACT_SEASONS = ("2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31")
SEASON_START_YEAR = {season: 2025 + index for index, season in enumerate(CONTRACT_SEASONS)}

WORD_NUMBERS = {
    "one": 1,
    "two": 2,
    "three": 3,
    "four": 4,
    "five": 5,
    "six": 6,
}

AGREEMENT_RE = re.compile(
    r"\b(agree(?:d|s)?|agreement|intend(?:s)? to|plan(?:s)? to|sign(?:ed|s|ing)?|re-?sign(?:ed|s|ing)?|return(?:s|ing)?|extension|contract|deal)\b",
    re.IGNORECASE,
)
NEWS_SKIP_RE = re.compile(
    r"\b(trade|traded|trading|acquire|acquired|sent|send|shopped|shopping|interest|waive|waived|retire|retired|retirement|one-day contract|mock draft)\b",
    re.IGNORECASE,
)


def load_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def normalize(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", " ", value.lower()).strip()


def season_from_start_year(start_year: int) -> str:
    return f"{start_year}-{str(start_year + 1)[-2:]}"


def sha256_payload(payload: Any) -> str:
    source = json.dumps(payload, sort_keys=True, ensure_ascii=False).encode("utf-8")
    return hashlib.sha256(source).hexdigest()


def source_name_from_url(url: str | None) -> str:
    if not url:
        return "Official report"
    host = urlparse(url).netloc.lower().removeprefix("www.")
    if "nba.com" in host:
        return "NBA.com"
    if "hoopsrumors" in host:
        return "Hoops Rumors"
    if "spotrac" in host:
        return "Spotrac"
    if "salaryswish" in host:
        return "SalarySwish"
    return host or "Official report"


def money_to_int(text: str) -> int | None:
    pattern = re.compile(
        r"\$\s*([0-9][0-9,]*(?:\.[0-9]+)?)\s*(billion|million|mm|m|k)?",
        re.IGNORECASE,
    )
    matches = list(pattern.finditer(text))
    if not matches:
        return None

    best_value: int | None = None
    for match in matches:
        amount = float(match.group(1).replace(",", ""))
        unit = (match.group(2) or "").lower()
        if unit == "billion":
            value = round(amount * 1_000_000_000)
        elif unit in {"million", "mm", "m"}:
            value = round(amount * 1_000_000)
        elif unit == "k":
            value = round(amount * 1_000)
        else:
            value = round(amount)
        if best_value is None or value > best_value:
            best_value = value
    return best_value


def extract_years(text: str) -> int | None:
    digit_match = re.search(r"\b([1-6])\s*[- ]?\s*years?\b", text, re.IGNORECASE)
    if digit_match:
        return int(digit_match.group(1))

    word_match = re.search(r"\b(one|two|three|four|five|six)\s*[- ]?\s*years?\b", text, re.IGNORECASE)
    if word_match:
        return WORD_NUMBERS[word_match.group(1).lower()]

    return None


def row_text(row: dict[str, Any]) -> str:
    notes = row.get("contract_notes") or ""
    urls = " ".join(row.get("source_urls") or [])
    return f"{row.get('player_name', '')} {notes} {urls}"


def has_official_agreement_context(row: dict[str, Any]) -> bool:
    text = row_text(row)
    source_urls = row.get("source_urls") or []
    trusted_source = any("nba.com" in url.lower() or "hoopsrumors.com" in url.lower() for url in source_urls)
    return bool(trusted_source and AGREEMENT_RE.search(text))


def salary_season_items(row: dict[str, Any]) -> list[tuple[str, int]]:
    salaries = row.get("salaries") or {}
    items: list[tuple[str, int]] = []
    for season, raw_value in salaries.items():
        if season not in SEASON_START_YEAR:
            continue
        try:
            value = int(raw_value)
        except (TypeError, ValueError):
            continue
        items.append((season, value))
    return sorted(items, key=lambda item: SEASON_START_YEAR[item[0]])


def future_salary_items(row: dict[str, Any]) -> list[tuple[str, int]]:
    return [(season, value) for season, value in salary_season_items(row) if SEASON_START_YEAR[season] >= FIRST_FUTURE_START_YEAR]


def derive_deal_from_contract_row(row: dict[str, Any]) -> dict[str, Any] | None:
    text = row_text(row)
    future_salaries = future_salary_items(row)
    has_agreement_note = has_official_agreement_context(row)

    if not has_agreement_note:
        return None

    years = extract_years(text)
    if years is None and future_salaries:
        years = len(future_salaries)
    if years is None:
        years = 1

    if future_salaries:
        start_year = SEASON_START_YEAR[future_salaries[0][0]]
    else:
        start_year = FIRST_FUTURE_START_YEAR
    end_year = start_year + years - 1

    parsed_total = money_to_int(text)
    salary_by_season = {
        season: value
        for season, value in future_salaries
        if start_year <= SEASON_START_YEAR[season] <= end_year
    }
    salary_total = sum(salary_by_season.values()) if salary_by_season else None
    total = parsed_total or salary_total
    average_annual_value = round(total / years) if total else None

    options = row.get("options_by_season") or {}
    guarantees = row.get("guarantee_status_by_season") or {}
    options_by_season = {
        season: value
        for season, value in options.items()
        if season in SEASON_START_YEAR and start_year <= SEASON_START_YEAR[season] <= end_year
    }
    guarantee_status_by_season = {
        season: value
        for season, value in guarantees.items()
        if season in SEASON_START_YEAR and start_year <= SEASON_START_YEAR[season] <= end_year
    }

    salary_window_complete = len(salary_by_season) >= years
    needs_followup = bool(row.get("needs_followup")) or not salary_window_complete or row.get("guaranteed") is None
    if needs_followup:
        for year in range(start_year, end_year + 1):
            season = season_from_start_year(year)
            guarantee_status_by_season.setdefault(season, "Details Pending")

    source_url = (row.get("source_urls") or [None])[0]
    team = row.get("team_abbreviation") or ""
    label_years = f"{years}-year" if years else "new"
    label = f"Reported {label_years} agreement with {team}".strip()

    return {
        "source": source_name_from_url(source_url),
        "source_url": source_url,
        "label": label,
        "start_year": start_year,
        "end_year": end_year,
        "years": years,
        "total": total,
        "average_annual_value": average_annual_value,
        "guaranteed_at_sign": None,
        "total_guaranteed": row.get("guaranteed"),
        "free_agent": f"{end_year + 1} / UFA",
        "signed_using": None,
        "pending": needs_followup,
        "salary_by_season": salary_by_season,
        "options_by_season": options_by_season,
        "guarantee_status_by_season": guarantee_status_by_season,
    }


def deal_duplicate_key(deal: dict[str, Any]) -> tuple[Any, ...]:
    source_url = deal.get("source_url")
    if source_url:
        return ("url", source_url)
    return (
        "window",
        deal.get("start_year"),
        deal.get("end_year"),
        deal.get("total"),
        normalize(str(deal.get("label") or "")),
    )


def merge_deal(existing: dict[str, Any], incoming: dict[str, Any]) -> bool:
    changed = False
    for key, value in incoming.items():
        if key in {"salary_by_season", "options_by_season", "guarantee_status_by_season"}:
            current = existing.get(key) or {}
            merged = {**current, **(value or {})}
            if merged != current:
                existing[key] = merged
                changed = True
            continue

        if existing.get(key) in (None, "", {}, []) and value not in (None, "", {}, []):
            existing[key] = value
            changed = True
        elif key == "pending" and value is True and existing.get(key) is not True:
            existing[key] = True
            changed = True
    return changed


def find_or_create_deal_row(
    deal_rows: list[dict[str, Any]],
    source_row: dict[str, Any],
) -> dict[str, Any]:
    rank = source_row.get("source_rank")
    slug = source_row.get("matched_player_slug")
    normalized_name = normalize(source_row.get("player_name") or "")

    for row in deal_rows:
        if rank is not None and row.get("source_rank") == rank:
            return row
        if slug and row.get("matched_player_slug") == slug:
            return row
        if normalize(row.get("player_name") or "") == normalized_name:
            return row

    new_row = {
        "source_rank": source_row.get("source_rank"),
        "player_name": source_row.get("player_name"),
        "matched_player_slug": source_row.get("matched_player_slug"),
        "matched_player_name": source_row.get("matched_player_name"),
        "team_abbreviation": source_row.get("team_abbreviation"),
        "salaryswish_url": None,
        "spotrac_url": None,
        "deals": [],
        "needs_followup": True,
    }
    deal_rows.append(new_row)
    return new_row


def sync_deal_rows(contracts: list[dict[str, Any]], deals_payload: dict[str, Any]) -> tuple[int, int]:
    deal_rows = deals_payload.get("contracts") or []
    inserted = 0
    updated = 0

    for source_row in contracts:
        incoming = derive_deal_from_contract_row(source_row)
        if not incoming:
            continue

        deal_row = find_or_create_deal_row(deal_rows, source_row)
        for key in ("source_rank", "player_name", "matched_player_slug", "matched_player_name", "team_abbreviation"):
            value = source_row.get(key)
            if value is not None and deal_row.get(key) != value:
                deal_row[key] = value
                updated += 1

        existing_deals = deal_row.setdefault("deals", [])
        incoming_key = deal_duplicate_key(incoming)
        matched = next((deal for deal in existing_deals if deal_duplicate_key(deal) == incoming_key), None)
        if matched:
            if merge_deal(matched, incoming):
                updated += 1
        else:
            existing_deals.insert(0, incoming)
            inserted += 1

        needs_followup = bool(source_row.get("needs_followup")) or any(deal.get("pending") for deal in existing_deals)
        if deal_row.get("needs_followup") != needs_followup:
            deal_row["needs_followup"] = needs_followup
            updated += 1

        existing_deals.sort(
            key=lambda deal: (
                int(deal.get("start_year") or 0),
                int(deal.get("end_year") or 0),
                int(bool(deal.get("pending"))),
            ),
            reverse=True,
        )

    deals_payload["contracts"] = sorted(
        deal_rows,
        key=lambda row: int(row.get("source_rank") or 999_999),
    )
    return inserted, updated


def contract_name_index(contracts: list[dict[str, Any]]) -> list[tuple[str, dict[str, Any]]]:
    indexed: list[tuple[str, dict[str, Any]]] = []
    for row in contracts:
        for name in (row.get("matched_player_name"), row.get("player_name")):
            normalized = normalize(name or "")
            if len(normalized) >= 5:
                indexed.append((normalized, row))
    return sorted(indexed, key=lambda item: len(item[0]), reverse=True)


def team_alias_index(runtime: dict[str, Any]) -> list[tuple[str, str]]:
    aliases: list[tuple[str, str]] = []
    for team in runtime.get("teams") or []:
        abbreviation = team.get("abbreviation")
        if not abbreviation:
            continue
        values = {
            team.get("name"),
            team.get("city"),
            f"{team.get('city', '')} {team.get('name', '')}".strip(),
            team.get("slug", "").replace("-", " "),
            abbreviation,
        }
        for value in values:
            normalized = normalize(value or "")
            if len(normalized) >= 3:
                aliases.append((normalized, abbreviation))
    return sorted(set(aliases), key=lambda item: len(item[0]), reverse=True)


def contains_normalized_name(text: str, name: str) -> bool:
    return re.search(rf"(?:^|\s){re.escape(name)}(?:\s|$)", text) is not None


def sync_contract_rows_from_news(
    contracts: list[dict[str, Any]],
    news: list[dict[str, Any]],
    runtime: dict[str, Any],
) -> int:
    name_index = contract_name_index(contracts)
    teams = team_alias_index(runtime)
    changed = 0

    for item in news:
        if item.get("reportingStatus") != "Official":
            continue

        title = item.get("title") or ""
        summary = item.get("summary") or ""
        text = f"{title} {summary}"
        if not AGREEMENT_RE.search(title) or NEWS_SKIP_RE.search(text):
            continue

        normalized_text = normalize(text)
        normalized_title = normalize(title)
        player_row = next((row for name, row in name_index if contains_normalized_name(normalized_title, name)), None)
        if not player_row:
            continue

        team_abbreviation = next((abbr for alias, abbr in teams if contains_normalized_name(normalized_text, alias)), None)
        if not team_abbreviation:
            continue

        source_url = item.get("url")
        source_urls = list(player_row.get("source_urls") or [])
        row_changed = False
        if source_url and source_url not in source_urls:
            source_urls.append(source_url)
            player_row["source_urls"] = source_urls
            row_changed = True

        if player_row.get("team_abbreviation") != team_abbreviation:
            player_row["team_abbreviation"] = team_abbreviation
            row_changed = True

        existing_note = player_row.get("contract_notes") or ""
        if source_url and source_url not in existing_note:
            player_row["contract_notes"] = summary or title
            row_changed = True

        if player_row.get("needs_followup") is not True:
            player_row["needs_followup"] = True
            row_changed = True

        if row_changed:
            changed += 1

    return changed


def main() -> int:
    parser = argparse.ArgumentParser(description="Sync official agreement notes into contract deal windows.")
    parser.add_argument("--write", action="store_true", help="Write updated contract/deal JSON files.")
    parser.add_argument("--skip-news", action="store_true", help="Only use the existing contract source rows.")
    args = parser.parse_args()

    contracts_payload = load_json(CONTRACTS_PATH)
    deals_payload = load_json(DEALS_PATH)
    contracts = contracts_payload.get("contracts") or []

    news_updates = 0
    if not args.skip_news and NEWS_PATH.exists() and RUNTIME_PATH.exists():
        news_updates = sync_contract_rows_from_news(contracts, load_json(NEWS_PATH), load_json(RUNTIME_PATH))

    inserted_deals, updated_deals = sync_deal_rows(contracts, deals_payload)
    has_changes = bool(news_updates or inserted_deals or updated_deals)

    if has_changes:
        now = datetime.now(timezone.utc).replace(microsecond=0).isoformat().replace("+00:00", "Z")
        deals_payload.setdefault("metadata", {})["official_agreement_sync"] = {
            "generated_at": now,
            "contract_rows_updated_from_news": news_updates,
            "pending_deals_inserted": inserted_deals,
            "deal_rows_updated": updated_deals,
            "source_contracts_sha256": sha256_payload(contracts_payload.get("contracts") or []),
        }

        if news_updates:
            contracts_payload.setdefault("metadata", {})["official_agreement_sync"] = {
                "generated_at": now,
                "contract_rows_updated_from_news": news_updates,
            }

    print(
        json.dumps(
            {
                "contract_rows_updated_from_news": news_updates,
                "pending_deals_inserted": inserted_deals,
                "deal_rows_updated": updated_deals,
                "write": args.write,
                "files_written": bool(args.write and has_changes),
            },
            indent=2,
        )
    )

    if args.write and has_changes:
        if news_updates:
            write_json(CONTRACTS_PATH, contracts_payload)
        write_json(DEALS_PATH, deals_payload)

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
