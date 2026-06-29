#!/usr/bin/env python3
"""Fetch deal-level NBA contract terms for the local player contract source."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import time
import unicodedata
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from html import unescape
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_CONTRACTS = ROOT / "data" / "raw" / "player_contracts_2025_2031.json"
DEFAULT_OUTPUT = ROOT / "data" / "raw" / "player_contract_deals_2025_2031.json"
SPOTRAC_CONTRACTS_URL = "https://www.spotrac.com/nba/contracts"
SPOTRAC_SEARCH_URL = "https://www.spotrac.com/search?q={query}"
USER_AGENT = "Mozilla/5.0 (compatible; ShotClockContractSync/1.0)"


def clean_text(value: str) -> str:
    return re.sub(r"\s+", " ", re.sub(r"<[^>]+>", " ", unescape(value))).strip()


def normalize_name(value: str) -> str:
    normalized = unicodedata.normalize("NFKD", value)
    ascii_text = "".join(char for char in normalized if not unicodedata.combining(char))
    tokens = re.sub(r"[^a-z0-9]+", " ", ascii_text.lower()).strip().split()
    while tokens and tokens[-1] in {"jr", "sr", "ii", "iii", "iv", "v"}:
        tokens.pop()
    return " ".join(tokens)


def money_to_int(value: str | None) -> int | None:
    if not value:
        return None
    cleaned = re.sub(r"[^0-9.]", "", value)
    if not cleaned:
        return None
    parsed = float(cleaned)
    return int(round(parsed))


def fetch_url(url: str) -> tuple[str, str]:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=25) as response:
        return response.geturl(), response.read().decode("utf-8", "ignore")


def top_contract_urls() -> dict[tuple[str, str], str]:
    try:
        _, html = fetch_url(SPOTRAC_CONTRACTS_URL)
    except Exception:
        return {}
    table_match = re.search(r'<table[^>]*id="table"[\s\S]*?</table>', html)
    if not table_match:
        return {}
    body_match = re.search(r"<tbody>([\s\S]*?)</tbody>", table_match.group(0))
    if not body_match:
        return {}
    urls: dict[tuple[str, str], str] = {}
    for tr in re.findall(r"<tr[^>]*>([\s\S]*?)</tr>", body_match.group(1)):
        cells = re.findall(r"<td[^>]*>([\s\S]*?)</td>", tr)
        if len(cells) < 3:
            continue
        href_match = re.search(r'href="([^"]+/nba/player/_/id/\d+[^"]*)"', cells[0])
        if not href_match:
            continue
        name = clean_text(cells[0])
        team_text = clean_text(cells[2])
        team_match = re.search(r"\b([A-Z]{2,3})\b\s*$", team_text)
        team = team_match.group(1) if team_match else ""
        urls[(normalize_name(name), team)] = href_match.group(1)
    return urls


def search_player_url(player_name: str, team_abbreviation: str) -> str | None:
    _, html = fetch_url(SPOTRAC_SEARCH_URL.format(query=urllib.parse.quote(player_name)))
    candidates: list[tuple[int, str]] = []
    pattern = re.compile(
        r'<a href="(https://www\.spotrac\.com/redirect/player/\d+\?ref=search)"[\s\S]*?'
        r'<span class="[^"]*text-danger[^"]*">([^<]+)</span>\s*\(([^)]*)\)',
        re.IGNORECASE,
    )
    target_name = normalize_name(player_name)
    for href, name, team in pattern.findall(html):
        candidate_name = normalize_name(clean_text(name))
        candidate_team = clean_text(team).upper()
        if candidate_name != target_name:
            continue
        score = 2 if candidate_team == team_abbreviation else 1
        candidates.append((score, href))
    if not candidates:
        return None
    candidates.sort(reverse=True)
    final_url, _ = fetch_url(candidates[0][1])
    return final_url


def parse_contract_deals(html: str, url: str) -> list[dict[str, Any]]:
    wrappers = re.findall(r'<div class="contract-wrapper[\s\S]*?(?=<div class="contract-wrapper|\Z)', html)
    deals: list[dict[str, Any]] = []
    for wrapper in wrappers:
        years_match = re.search(r'<span class="years">([\s\S]*?)</span>', wrapper)
        if not years_match:
            continue
        years_text = clean_text(years_match.group(1))
        year_match = re.search(r"\b(20\d{2})\s*-\s*(20\d{2})\b", years_text)
        if not year_match:
            continue
        start_year = int(year_match.group(1))
        end_year = int(year_match.group(2))
        label = re.sub(r"\b20\d{2}\s*-\s*20\d{2}\b", "", years_text).strip(" -")
        labels = [clean_text(item) for item in re.findall(r'<div class="label">([\s\S]*?)</div>', wrapper)]
        values = [clean_text(item) for item in re.findall(r'<div class="value">([\s\S]*?)</div>', wrapper)]
        detail = dict(zip(labels, values))
        terms = detail.get("Contract Terms:")
        term_match = re.search(r"(\d+)\s*yr\(s\)\s*/\s*(\$[\d,]+)", terms or "")
        if not term_match:
            continue
        years = int(term_match.group(1))
        total = money_to_int(term_match.group(2))
        average = money_to_int(detail.get("Average Salary:")) or (round(total / years) if total and years else None)
        deal = {
            "source": "Spotrac",
            "source_url": url,
            "label": re.sub(r"\s+", " ", label).strip(),
            "start_year": start_year,
            "end_year": end_year,
            "years": years,
            "total": total,
            "average_annual_value": average,
            "guaranteed_at_sign": money_to_int(detail.get("GTD at Sign:")),
            "total_guaranteed": money_to_int(detail.get("Total GTD:")),
            "free_agent": detail.get("Free Agent:"),
            "signed_using": detail.get("Signed Using:"),
            "pending": "(PENDING)" in wrapper.upper(),
        }
        deals.append(deal)
    unique: dict[tuple[int, int, int | None], dict[str, Any]] = {}
    for deal in deals:
        unique[(deal["start_year"], deal["end_year"], deal["total"])] = deal
    return sorted(unique.values(), key=lambda item: (item["start_year"], item["end_year"]), reverse=True)


def source_hash(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def sync_contract_deals(source: Path, output: Path, limit: int | None, sleep_seconds: float) -> dict[str, Any]:
    payload = json.loads(source.read_text(encoding="utf-8"))
    contracts = payload.get("contracts")
    if not isinstance(contracts, list):
        raise RuntimeError("Contract source must contain a contracts list.")

    top_urls = top_contract_urls()
    rows: list[dict[str, Any]] = []
    stats = {"searched": 0, "matched": 0, "with_deals": 0, "errors": 0}
    selected = contracts[:limit] if limit else contracts
    for index, row in enumerate(selected, start=1):
        name = str(row.get("matched_player_name") or row.get("player_name") or "")
        team = str(row.get("team_abbreviation") or "")
        url = top_urls.get((normalize_name(name), team))
        error = None
        deals: list[dict[str, Any]] = []
        try:
            if not url:
                stats["searched"] += 1
                url = search_player_url(name, team)
                if sleep_seconds:
                    time.sleep(sleep_seconds)
            if url:
                final_url, html = fetch_url(url)
                url = final_url
                deals = parse_contract_deals(html, url)
                stats["matched"] += 1
                if deals:
                    stats["with_deals"] += 1
        except (urllib.error.URLError, TimeoutError, RuntimeError, ValueError) as exc:
            stats["errors"] += 1
            error = str(exc)
        rows.append({
            "source_rank": row.get("source_rank"),
            "player_name": row.get("player_name"),
            "matched_player_slug": row.get("matched_player_slug"),
            "matched_player_name": row.get("matched_player_name"),
            "team_abbreviation": team,
            "spotrac_url": url,
            "deals": deals,
            "needs_followup": not bool(deals),
            **({"error": error} if error else {}),
        })
        print(f"{index:03d}/{len(selected):03d} {name} {team}: {len(deals)} deals", flush=True)
        if sleep_seconds:
            time.sleep(sleep_seconds)

    output.parent.mkdir(parents=True, exist_ok=True)
    result = {
        "metadata": {
            "source": "Spotrac public player contract pages",
            "source_contracts_file": str(source.relative_to(ROOT)),
            "source_contracts_sha256": source_hash(source),
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "row_count": len(rows),
            **stats,
        },
        "contracts": rows,
    }
    output.write_text(json.dumps(result, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    return result["metadata"]


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_CONTRACTS)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int)
    parser.add_argument("--sleep", type=float, default=0.05, help="Delay between requests.")
    args = parser.parse_args()
    metadata = sync_contract_deals(args.source, args.output, args.limit, args.sleep)
    print(json.dumps(metadata, indent=2))


if __name__ == "__main__":
    main()
