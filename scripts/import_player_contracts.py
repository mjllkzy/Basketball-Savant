#!/usr/bin/env python3
"""Validate player contract salary data and optionally write it to Postgres."""

from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import sys
import unicodedata
from pathlib import Path
from typing import Any

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data" / "raw" / "player_contracts_2025_2031.json"
EXPECTED_ROWS = 530
EXPECTED_SEASONS = ("2025-26", "2026-27", "2027-28", "2028-29", "2029-30", "2030-31")
NAME_TRANSLATION = str.maketrans({"ё": "e", "Ё": "e", "ë": "e", "Ë": "e", "’": "'", "‘": "'"})
NAME_SUFFIXES = {"jr", "sr", "ii", "iii", "iv", "v"}
OPTION_DETAIL_FIELDS = ("options_by_season", "guarantee_status_by_season")


def database_url() -> str | None:
    value = os.environ.get("DATABASE_URL", "").strip()
    return value or None


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as file_handle:
        for chunk in iter(lambda: file_handle.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def normalize_player_name(value: str, *, drop_suffix: bool = True) -> str:
    text = value.translate(NAME_TRANSLATION)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()
    text = re.sub(r"[^a-z0-9]+", " ", text).strip()
    parts = text.split()
    if drop_suffix and parts and parts[-1] in NAME_SUFFIXES:
        parts = parts[:-1]
    return " ".join(parts)


def compact_player_name(value: str) -> str:
    text = value.translate(NAME_TRANSLATION)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", "", text)


def player_lookup_keys(value: str) -> tuple[str, ...]:
    keys = {
        normalize_player_name(value),
        normalize_player_name(value, drop_suffix=False),
        compact_player_name(value),
    }
    return tuple(key for key in keys if key)


def load_source(source_path: Path) -> dict[str, Any]:
    if not source_path.exists():
        raise RuntimeError(f"Contract source file not found: {source_path}")
    with source_path.open("r", encoding="utf-8") as file_handle:
        payload = json.load(file_handle)
    metadata = payload.get("metadata")
    contracts = payload.get("contracts")
    if not isinstance(metadata, dict) or not isinstance(contracts, list):
        raise RuntimeError("Contract source must contain metadata and contracts.")
    if int(metadata.get("row_count") or 0) != len(contracts):
        raise RuntimeError("Contract source metadata row_count does not match contracts length.")
    if len(contracts) != EXPECTED_ROWS:
        raise RuntimeError(f"Contract source has {len(contracts)} rows; expected {EXPECTED_ROWS}.")
    seasons = tuple(metadata.get("season_columns") or ())
    if seasons != EXPECTED_SEASONS:
        raise RuntimeError(f"Contract source seasons are {seasons}; expected {EXPECTED_SEASONS}.")
    ranks = [int(row.get("source_rank") or 0) for row in contracts if isinstance(row, dict)]
    if ranks != list(range(1, EXPECTED_ROWS + 1)):
        raise RuntimeError("Contract source ranks must be contiguous from 1 through 530.")
    for row in contracts:
        if not isinstance(row, dict):
            raise RuntimeError("Contract rows must be objects.")
        if not row.get("player_name") or not row.get("team_abbreviation"):
            raise RuntimeError(f"Contract row {row.get('source_rank')} is missing player or team.")
        salaries = row.get("salaries")
        if not isinstance(salaries, dict):
            raise RuntimeError(f"Contract row {row.get('source_rank')} is missing salaries.")
        guaranteed = row.get("guaranteed")
        if not salaries and guaranteed is None:
            raise RuntimeError(f"Contract row {row.get('source_rank')} has neither salary nor guaranteed amount.")
        for season, amount in salaries.items():
            if season not in EXPECTED_SEASONS:
                raise RuntimeError(f"Contract row {row.get('source_rank')} contains unsupported season {season}.")
            if not isinstance(amount, int) or amount < 0:
                raise RuntimeError(f"Contract row {row.get('source_rank')} has invalid salary for {season}.")
        if guaranteed is not None and (not isinstance(guaranteed, int) or guaranteed < 0):
            raise RuntimeError(f"Contract row {row.get('source_rank')} has invalid guaranteed amount.")
        for field_name in OPTION_DETAIL_FIELDS:
            detail = row.get(field_name, {})
            if detail is None:
                continue
            if not isinstance(detail, dict):
                raise RuntimeError(f"Contract row {row.get('source_rank')} has invalid {field_name}.")
            for season, label in detail.items():
                if season not in EXPECTED_SEASONS:
                    raise RuntimeError(f"Contract row {row.get('source_rank')} contains unsupported {field_name} season {season}.")
                if not isinstance(label, str) or not label.strip():
                    raise RuntimeError(f"Contract row {row.get('source_rank')} has invalid {field_name} value for {season}.")
        source_urls = row.get("source_urls", [])
        if source_urls is not None and (not isinstance(source_urls, list) or not all(isinstance(url, str) and url.strip() for url in source_urls)):
            raise RuntimeError(f"Contract row {row.get('source_rank')} has invalid source_urls.")
        if row.get("contract_notes") is not None and not isinstance(row.get("contract_notes"), str):
            raise RuntimeError(f"Contract row {row.get('source_rank')} has invalid contract_notes.")
        if row.get("needs_followup") is not None and not isinstance(row.get("needs_followup"), bool):
            raise RuntimeError(f"Contract row {row.get('source_rank')} has invalid needs_followup.")
    return payload


def object_field(row: dict[str, Any], field_name: str) -> dict[str, str]:
    value = row.get(field_name)
    if not isinstance(value, dict):
        return {}
    return {str(key): str(label) for key, label in value.items() if str(label).strip()}


def list_field(row: dict[str, Any], field_name: str) -> list[str]:
    value = row.get(field_name)
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def load_generated_player_lookup() -> dict[str, dict[str, Any]]:
    players_path = ROOT / "public" / "data" / "players.json"
    if not players_path.exists():
        return {}
    with players_path.open("r", encoding="utf-8") as file_handle:
        players = json.load(file_handle)
    lookup: dict[str, dict[str, Any]] = {}
    if not isinstance(players, list):
        return lookup
    for player in players:
        if not isinstance(player, dict) or not player.get("player_name"):
            continue
        for key in player_lookup_keys(str(player["player_name"])):
            lookup.setdefault(key, player)
    return lookup


def validate_source(source_path: Path) -> dict[str, Any]:
    payload = load_source(source_path)
    lookup = load_generated_player_lookup()
    matched = 0
    unmatched_rows: list[dict[str, Any]] = []
    for row in payload["contracts"]:
        matched_slug = row.get("matched_player_slug")
        if matched_slug:
            matched += 1
            continue
        matched_player = next((lookup.get(key) for key in player_lookup_keys(str(row["player_name"])) if lookup.get(key)), None)
        if matched_player:
            matched += 1
        else:
            unmatched_rows.append({
                "source_rank": row["source_rank"],
                "player_name": row["player_name"],
                "team_abbreviation": row["team_abbreviation"],
            })
    return {
        "status": "validated",
        "source_path": str(source_path),
        "source_sha256": sha256(source_path),
        "source_key": payload["metadata"]["source_key"],
        "rows": len(payload["contracts"]),
        "season_columns": payload["metadata"]["season_columns"],
        "matched_rows_against_generated_players": matched,
        "unmatched_rows_against_generated_players": len(unmatched_rows),
        "unmatched_rows": unmatched_rows,
    }


def connect(connection_string: str):
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("psycopg is required for Postgres contract imports. Install requirements.txt.") from exc

    return psycopg.connect(connection_string)


def ensure_schema(cursor) -> None:
    cursor.execute(
        """
        SELECT
          to_regclass('public.player_contract_sources') IS NOT NULL,
          to_regclass('public.player_contracts') IS NOT NULL,
          to_regclass('public.player_contract_salaries') IS NOT NULL
        """
    )
    row = cursor.fetchone()
    if not row or not all(row):
        raise RuntimeError("Postgres contract schema is missing. Run `pnpm db:migrate` before importing contracts.")


def read_player_lookup(cursor) -> dict[str, dict[str, str]]:
    cursor.execute("SELECT player_slug, player_name, normalized_player_name FROM players")
    lookup: dict[str, dict[str, str]] = {}
    for player_slug, player_name, normalized_name in cursor.fetchall():
        row = {
            "player_slug": str(player_slug),
            "player_name": str(player_name),
            "normalized_player_name": str(normalized_name or normalize_player_name(str(player_name))),
        }
        for key in (*player_lookup_keys(str(player_name)), normalize_player_name(str(normalized_name or ""))):
            if key:
                lookup.setdefault(key, row)
    return lookup


def read_team_lookup(cursor) -> dict[str, str]:
    cursor.execute("SELECT abbreviation, id FROM teams")
    return {str(abbreviation): str(team_id) for abbreviation, team_id in cursor.fetchall()}


def resolve_player(row: dict[str, Any], lookup: dict[str, dict[str, str]]) -> tuple[str | None, str, str]:
    if row.get("matched_player_slug"):
        matched_slug = str(row["matched_player_slug"])
        if any(player["player_slug"] == matched_slug for player in lookup.values()):
            return matched_slug, "source_slug", f"Matched to {row.get('matched_player_name') or matched_slug}"
    for key in player_lookup_keys(str(row["player_name"])):
        player = lookup.get(key)
        if player:
            return player["player_slug"], "normalized_name", f"Matched to {player['player_name']}"
    return None, "unmatched", "No matching player row was present in the current players table."


def write_postgres(source_path: Path, connection_string: str) -> dict[str, Any]:
    payload = load_source(source_path)
    metadata = payload["metadata"]
    contracts = payload["contracts"]
    source_key = str(metadata["source_key"])
    source_hash = sha256(source_path)

    from psycopg.types.json import Jsonb

    with connect(connection_string) as connection:
        with connection.cursor() as cursor:
            ensure_schema(cursor)
            player_lookup = read_player_lookup(cursor)
            team_lookup = read_team_lookup(cursor)
            contract_rows = []
            salary_rows = []
            matched = 0
            for row in contracts:
                player_slug, matched_by, match_notes = resolve_player(row, player_lookup)
                if player_slug:
                    matched += 1
                team_abbreviation = str(row["team_abbreviation"])
                contract_rows.append({
                    "source_key": source_key,
                    "source_rank": int(row["source_rank"]),
                    "player_slug": player_slug,
                    "source_player_name": row["player_name"],
                    "normalized_player_name": row.get("normalized_player_name") or normalize_player_name(str(row["player_name"])),
                    "team_abbreviation": team_abbreviation,
                    "team_id": team_lookup.get(team_abbreviation),
                    "guaranteed_amount": row.get("guaranteed"),
                    "salary_by_season": Jsonb(row["salaries"]),
                    "options_by_season": Jsonb(object_field(row, "options_by_season")),
                    "guarantee_status_by_season": Jsonb(object_field(row, "guarantee_status_by_season")),
                    "contract_notes": row.get("contract_notes"),
                    "source_urls": Jsonb(list_field(row, "source_urls")),
                    "needs_followup": bool(row.get("needs_followup", False)),
                    "matched_by": matched_by,
                    "match_notes": match_notes,
                })
                for season, amount in row["salaries"].items():
                    salary_rows.append((source_key, int(row["source_rank"]), season, int(amount)))

            cursor.execute(
                """
                INSERT INTO player_contract_sources (
                  source_key, source_label, source_file_sha256, received_date, row_count, metadata, imported_at
                )
                VALUES (%s, %s, %s, %s, %s, %s, now())
                ON CONFLICT (source_key) DO UPDATE SET
                  source_label = EXCLUDED.source_label,
                  source_file_sha256 = EXCLUDED.source_file_sha256,
                  received_date = EXCLUDED.received_date,
                  row_count = EXCLUDED.row_count,
                  metadata = EXCLUDED.metadata,
                  imported_at = now()
                """,
                (
                    source_key,
                    metadata["source_label"],
                    source_hash,
                    metadata["received_date"],
                    len(contracts),
                    Jsonb(metadata),
                ),
            )
            cursor.execute("DELETE FROM player_contracts WHERE source_key = %s", (source_key,))
            cursor.executemany(
                """
                INSERT INTO player_contracts (
                  source_key, source_rank, player_slug, source_player_name, normalized_player_name,
                  team_abbreviation, team_id, guaranteed_amount, salary_by_season, options_by_season,
                  guarantee_status_by_season, contract_notes, source_urls, needs_followup, matched_by,
                  match_notes, updated_at
                )
                VALUES (
                  %(source_key)s, %(source_rank)s, %(player_slug)s, %(source_player_name)s, %(normalized_player_name)s,
                  %(team_abbreviation)s, %(team_id)s, %(guaranteed_amount)s, %(salary_by_season)s, %(options_by_season)s,
                  %(guarantee_status_by_season)s, %(contract_notes)s, %(source_urls)s, %(needs_followup)s,
                  %(matched_by)s, %(match_notes)s, now()
                )
                """,
                contract_rows,
            )
            cursor.executemany(
                """
                INSERT INTO player_contract_salaries (source_key, source_rank, season, salary_amount)
                VALUES (%s, %s, %s, %s)
                """,
                salary_rows,
            )

    return {
        "status": "written",
        "source_key": source_key,
        "source_sha256": source_hash,
        "contracts": len(contract_rows),
        "salary_rows": len(salary_rows),
        "matched_contracts": matched,
        "unmatched_contracts": len(contract_rows) - matched,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--write-postgres", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source_path = args.source.resolve()
    connection_string = database_url()
    if args.write_postgres:
        if not connection_string:
            print("DATABASE_URL is required when --write-postgres is enabled.", file=sys.stderr)
            raise SystemExit(2)
        result = write_postgres(source_path, connection_string)
    else:
        result = validate_source(source_path)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
