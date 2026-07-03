#!/usr/bin/env python3
"""Validate the upcoming-season current roster transaction ledger."""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any


DEFAULT_LEDGER_PATH = Path("src/lib/data/current-roster-transactions.json")
RUNTIME_FALLBACKS_PATH = Path("src/lib/data/generated/runtime-fallbacks.json")
UPCOMING_SEASON = "2026-27"


def read_json(path: Path) -> Any:
    return json.loads(path.read_text(encoding="utf-8"))


def validate(ledger_path: Path) -> list[str]:
    errors: list[str] = []
    ledger = read_json(ledger_path)
    runtime = read_json(RUNTIME_FALLBACKS_PATH)
    players_by_slug = {player["player_slug"]: player for player in runtime.get("players", [])}
    team_codes = {team["abbreviation"] for team in runtime.get("teams", [])}
    seen_player_slugs: dict[tuple[str, str], str] = {}

    metadata = ledger.get("metadata", {})
    if metadata.get("season") != UPCOMING_SEASON:
        errors.append(f"metadata.season must be {UPCOMING_SEASON}.")

    for transaction in ledger.get("transactions", []):
        transaction_id = transaction.get("id")
        season = transaction.get("season")
        if not transaction_id:
            errors.append("Every transaction needs an id.")
        if season != UPCOMING_SEASON:
            errors.append(f"{transaction_id or '<missing id>'}: season must be {UPCOMING_SEASON}.")
        if transaction.get("type") != "trade":
            errors.append(f"{transaction_id}: only trade transactions are supported in this ledger.")
        if not re.match(r"^https://", str(transaction.get("sourceUrl", ""))):
            errors.append(f"{transaction_id}: sourceUrl must be an https URL.")
        if not transaction.get("moves"):
            errors.append(f"{transaction_id}: moves cannot be empty.")

        for move in transaction.get("moves", []):
            player_slug = move.get("playerSlug")
            move_key = (season, player_slug)
            if player_slug not in players_by_slug:
                errors.append(f"{transaction_id}: unknown playerSlug {player_slug}.")
            if move_key in seen_player_slugs:
                errors.append(
                    f"{transaction_id}: duplicate move for {player_slug}; "
                    f"already in {seen_player_slugs[move_key]}."
                )
            else:
                seen_player_slugs[move_key] = str(transaction_id)

            from_team = move.get("fromTeamAbbreviation")
            to_team = move.get("toTeamAbbreviation")
            if from_team not in team_codes:
                errors.append(f"{transaction_id}: unknown fromTeamAbbreviation {from_team} for {player_slug}.")
            if to_team not in team_codes:
                errors.append(f"{transaction_id}: unknown toTeamAbbreviation {to_team} for {player_slug}.")
            if from_team == to_team:
                errors.append(f"{transaction_id}: {player_slug} cannot move from and to {from_team}.")

    return errors


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--ledger", type=Path, default=DEFAULT_LEDGER_PATH)
    args = parser.parse_args()

    errors = validate(args.ledger)
    if errors:
        print("Current roster transaction validation failed:", file=sys.stderr)
        for error in errors:
            print(f"- {error}", file=sys.stderr)
        return 1

    move_count = sum(len(transaction.get("moves", [])) for transaction in read_json(args.ledger).get("transactions", []))
    print(f"Validated {move_count} current roster transaction moves.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
