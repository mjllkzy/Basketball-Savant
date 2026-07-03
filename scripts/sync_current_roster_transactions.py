#!/usr/bin/env python3
"""Sync upcoming-season roster trade overrides from NBA.com's offseason tracker."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import unicodedata
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen


DEFAULT_SOURCE_URL = "https://www.nba.com/news/nba-offseason-deals-2026"
DEFAULT_LEDGER_PATH = Path("src/lib/data/current-roster-transactions.json")
RUNTIME_FALLBACKS_PATH = Path("src/lib/data/generated/runtime-fallbacks.json")
UPCOMING_SEASON = "2026-27"
GENERATED_TRANSACTION_ID = "nba-offseason-deals-2026-trades"

TEAM_ALIASES = {
    "blazers": "portland trail blazers",
    "sixers": "philadelphia 76ers",
}


def normalized_name(value: str) -> str:
    value = value.replace("'", "").replace("’", "").replace("`", "")
    ascii_text = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    return re.sub(r"[^a-z0-9]+", " ", ascii_text.lower()).strip()


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, payload: Any) -> None:
    path.write_text(json.dumps(payload, indent=2, ensure_ascii=True) + "\n", encoding="utf-8")


def fetch_article(source_url: str) -> dict[str, Any]:
    request = Request(source_url, headers={"User-Agent": "Mozilla/5.0 ShotClock roster sync"})
    source = urlopen(request, timeout=30).read().decode("utf-8", "ignore")
    script_matches = re.finditer(
        r'<script[^>]+type="application/ld\+json"[^>]*>(.*?)</script>',
        source,
        re.DOTALL,
    )

    for match in script_matches:
        try:
            payload = json.loads(html.unescape(match.group(1)))
        except json.JSONDecodeError:
            continue
        if isinstance(payload, dict) and payload.get("@type") == "Article" and payload.get("articleBody"):
            return payload

    raise RuntimeError(f"Could not find NBA.com Article JSON-LD in {source_url}")


def runtime_lookups(runtime: dict[str, Any]) -> tuple[dict[str, dict[str, Any]], dict[str, dict[str, Any]]]:
    players = {normalized_name(player["player_name"]): player for player in runtime.get("players", [])}
    teams: dict[str, dict[str, Any]] = {}

    for team in runtime.get("teams", []):
        full_name = f"{team['city']} {team['name']}"
        teams[normalized_name(full_name)] = team
        teams[normalized_name(team["name"])] = team
        teams[normalized_name(team["abbreviation"])] = team

    for alias, target in TEAM_ALIASES.items():
        if normalized_name(target) in teams:
            teams[normalized_name(alias)] = teams[normalized_name(target)]

    return players, teams


def clean_line(value: str) -> str:
    return " ".join(value.replace("\xa0", " ").split())


def parse_trade_moves(article: dict[str, Any], runtime: dict[str, Any]) -> tuple[list[dict[str, str]], list[str]]:
    players_by_name, teams_by_name = runtime_lookups(runtime)
    body = str(article["articleBody"])
    current_team: dict[str, Any] | None = None
    mode: str | None = None
    moves_by_slug: dict[str, dict[str, str]] = {}
    unmatched: list[str] = []
    pattern = re.compile(
        r"^(?P<player>.+?)\s+(?P<verb>joins|departs)\s+via\s+"
        r"(?:3-team\s+)?(?:sign-and-)?trade\s+with\s+(?P<team>[^()]+)",
        re.IGNORECASE,
    )

    for raw_line in body.splitlines():
        line = clean_line(raw_line)
        if not line:
            continue

        team = teams_by_name.get(normalized_name(line))
        if team and len(line.split()) >= 2:
            current_team = team
            mode = None
            continue

        if line in {"Additions", "Departures", "Departure"}:
            mode = line
            continue

        if not current_team or mode not in {"Additions", "Departures", "Departure"}:
            continue

        match = pattern.match(line)
        if not match:
            continue

        verb = match.group("verb").lower()
        if (mode == "Additions" and verb != "joins") or (mode in {"Departures", "Departure"} and verb != "departs"):
            continue

        player_name = match.group("player").strip()
        other_team_name = match.group("team").strip()
        player = players_by_name.get(normalized_name(player_name))
        other_team = teams_by_name.get(normalized_name(other_team_name))

        if not player or not other_team:
            missing = []
            if not player:
                missing.append(f"player={player_name}")
            if not other_team:
                missing.append(f"team={other_team_name}")
            unmatched.append(f"{line} ({', '.join(missing)})")
            continue

        if verb == "joins":
            from_team = other_team["abbreviation"]
            to_team = current_team["abbreviation"]
        else:
            from_team = current_team["abbreviation"]
            to_team = other_team["abbreviation"]

        move = {
            "playerSlug": player["player_slug"],
            "playerName": player["player_name"],
            "nbaPlayerId": "",
            "fromTeamAbbreviation": from_team,
            "toTeamAbbreviation": to_team,
        }
        existing = moves_by_slug.get(move["playerSlug"])
        if existing and (
            existing["fromTeamAbbreviation"] != move["fromTeamAbbreviation"]
            or existing["toTeamAbbreviation"] != move["toTeamAbbreviation"]
        ):
            raise RuntimeError(
                "Conflicting trade destinations for "
                f"{move['playerName']}: {existing['fromTeamAbbreviation']}->{existing['toTeamAbbreviation']} "
                f"and {move['fromTeamAbbreviation']}->{move['toTeamAbbreviation']}"
            )
        moves_by_slug[move["playerSlug"]] = move

    return sorted(moves_by_slug.values(), key=lambda move: move["playerName"]), unmatched


def existing_player_ids(ledger: dict[str, Any]) -> dict[str, str]:
    ids: dict[str, str] = {}
    for transaction in ledger.get("transactions", []):
        for move in transaction.get("moves", []):
            player_id = str(move.get("nbaPlayerId", "")).strip()
            if player_id:
                ids[str(move["playerSlug"])] = player_id
    return ids


def sync_ledger(source_url: str, ledger_path: Path) -> tuple[dict[str, Any], list[str]]:
    runtime = read_json(RUNTIME_FALLBACKS_PATH)
    ledger = read_json(ledger_path) if ledger_path.exists() else {"metadata": {}, "transactions": []}
    article = fetch_article(source_url)
    moves, unmatched = parse_trade_moves(article, runtime)
    player_ids = existing_player_ids(ledger)

    for move in moves:
        move["nbaPlayerId"] = player_ids.get(move["playerSlug"], move["nbaPlayerId"])

    date_modified = str(article.get("dateModified") or datetime.now(timezone.utc).isoformat())
    official_date = date_modified[:10]
    generated_transaction = {
        "id": GENERATED_TRANSACTION_ID,
        "season": UPCOMING_SEASON,
        "type": "trade",
        "officialDate": official_date,
        "sourceLabel": "NBA.com offseason deals tracker",
        "sourceUrl": source_url,
        "moves": moves,
    }
    preserved_transactions = [
        transaction
        for transaction in ledger.get("transactions", [])
        if transaction.get("id") != GENERATED_TRANSACTION_ID
    ]

    next_ledger = {
        "metadata": {
            "season": UPCOMING_SEASON,
            "sourceLabel": "NBA.com offseason deals tracker",
            "sourceUrl": source_url,
            "updatedAt": date_modified,
            "description": (
                "Persistent roster-impacting trade ledger for the upcoming season. "
                "Generated from explicit NBA.com trade additions/departures and "
                "validated against local player/team data."
            ),
        },
        "transactions": [*preserved_transactions, generated_transaction],
    }

    return next_ledger, unmatched


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-url", default=DEFAULT_SOURCE_URL)
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER_PATH)
    parser.add_argument("--write", action="store_true", help="Write the synced ledger back to disk.")
    parser.add_argument(
        "--allow-unmatched",
        action="store_true",
        help="Print unknown parsed trade lines without failing the sync.",
    )
    args = parser.parse_args()

    ledger, unmatched = sync_ledger(args.source_url, args.ledger)

    if unmatched:
        print("Unmatched trade lines:", file=sys.stderr)
        for line in unmatched:
            print(f"- {line}", file=sys.stderr)
        if not args.allow_unmatched:
            return 1

    move_count = sum(len(transaction.get("moves", [])) for transaction in ledger.get("transactions", []))
    if args.write:
        write_json(args.ledger, ledger)
        print(f"Wrote {move_count} current roster trade moves to {args.ledger}.")
    else:
        print(json.dumps(ledger, indent=2, ensure_ascii=True))

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
