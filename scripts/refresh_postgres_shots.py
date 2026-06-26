#!/usr/bin/env python3
"""Validate compact shot-cache files and optionally write them to Postgres."""

from __future__ import annotations

import argparse
import gzip
import json
import os
import sys
from pathlib import Path
from typing import Any, Iterable


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SHOT_CACHE_DIR = ROOT / "src" / "lib" / "data" / "generated" / "team-shot-charts"
MINIMUM_SHOTS = 100_000
EXPECTED_TEAMS = 30


def database_url() -> str | None:
    value = os.environ.get("DATABASE_URL", "").strip()
    return value or None


def load_manifest(cache_dir: Path) -> dict[str, Any]:
    manifest_path = cache_dir / "manifest.json"
    if not manifest_path.exists():
        raise RuntimeError(f"Shot-cache manifest not found: {manifest_path}")
    with manifest_path.open("r", encoding="utf-8") as file_handle:
        manifest = json.load(file_handle)
    teams = manifest.get("teams")
    if not isinstance(teams, dict) or len(teams) < EXPECTED_TEAMS:
        raise RuntimeError(f"Shot-cache manifest has {len(teams or {})} teams; expected at least {EXPECTED_TEAMS}.")
    total_shots = sum(int(entry.get("shots") or 0) for entry in teams.values() if isinstance(entry, dict))
    if total_shots < MINIMUM_SHOTS:
        raise RuntimeError(f"Shot-cache manifest has {total_shots} shots; expected at least {MINIMUM_SHOTS}.")
    return manifest


def iter_compact_shots(cache_dir: Path, manifest: dict[str, Any]) -> Iterable[tuple[str, list[Any]]]:
    teams = manifest.get("teams") or {}
    for team_id, entry in sorted(teams.items()):
        if not isinstance(entry, dict):
            raise RuntimeError(f"Invalid shot-cache entry for team {team_id}.")
        file_name = str(entry.get("file") or "")
        if not file_name:
            raise RuntimeError(f"Shot-cache entry for team {team_id} is missing a file.")
        file_path = cache_dir / file_name
        if not file_path.exists():
            raise RuntimeError(f"Shot-cache file not found for team {team_id}: {file_path}")
        with gzip.open(file_path, "rt", encoding="utf-8") as file_handle:
            rows = json.load(file_handle)
        if not isinstance(rows, list):
            raise RuntimeError(f"Shot-cache file for team {team_id} does not contain a list.")
        expected = int(entry.get("shots") or 0)
        if expected and len(rows) != expected:
            raise RuntimeError(f"Shot-cache file for team {team_id} has {len(rows)} rows; manifest expected {expected}.")
        for row in rows:
            if not isinstance(row, list) or len(row) < 25:
                raise RuntimeError(f"Invalid compact shot row in {file_path}.")
            yield str(team_id), row


def validate_cache(cache_dir: Path) -> dict[str, Any]:
    manifest = load_manifest(cache_dir)
    teams = manifest.get("teams") or {}
    counted = 0
    for _, _row in iter_compact_shots(cache_dir, manifest):
        counted += 1
    return {
        "cache_dir": str(cache_dir),
        "metadata": manifest.get("metadata") or {},
        "teams": len(teams),
        "shots": counted,
    }


def connect(connection_string: str):
    try:
        import psycopg
    except ImportError as exc:
        raise RuntimeError("psycopg is required for Postgres shot imports. Install requirements.txt.") from exc

    return psycopg.connect(connection_string)


def read_player_slug_map(cursor) -> dict[str, str]:
    cursor.execute("SELECT nba_player_id, player_slug FROM players WHERE nba_player_id IS NOT NULL")
    return {str(player_id): str(slug) for player_id, slug in cursor.fetchall()}


def current_ingestion_run(cursor) -> str:
    cursor.execute("SELECT id::text FROM current_ingestion_run")
    row = cursor.fetchone()
    if not row:
        raise RuntimeError("No successful ingestion run exists. Refresh master data before importing shots.")
    return str(row[0])


def ensure_schema(cursor) -> None:
    cursor.execute("SELECT to_regclass('public.shot_attempts') IS NOT NULL")
    row = cursor.fetchone()
    if not row or not row[0]:
        raise RuntimeError("Postgres shot schema is missing. Run `pnpm db:migrate` before importing shots.")


def shot_record(run_id: str, team_id: str, row: list[Any], player_slugs: dict[str, str]) -> tuple[Any, ...]:
    player_id = str(row[4])
    row_team_id = str(row[5])
    if row_team_id != team_id:
        raise RuntimeError(f"Shot row team {row_team_id} does not match manifest team {team_id}.")
    return (
        run_id,
        str(row[0]),
        str(row[1]),
        str(row[2]),
        str(row[3]),
        player_id,
        player_slugs.get(player_id),
        row_team_id,
        int(row[6]),
        str(row[7]),
        float(row[8]),
        float(row[9]),
        float(row[10]),
        str(row[11]),
        str(row[12]),
        int(row[13]),
        bool(row[14]),
        False,
        0 if int(row[20]) == 1 else 4 if int(row[21]) == 1 else 1,
        1.2 if int(row[20]) == 1 else 4.0 if int(row[21]) == 1 else 2.5,
        0,
        "Not loaded",
        "Open",
        12,
        float(row[16]),
        float(row[17]),
        float(row[18]),
        str(row[15]),
        False,
        bool(row[19]),
        bool(row[20]),
        bool(row[21]),
        bool(row[22]),
        bool(row[23]),
        bool(row[24]),
        "team-shot-cache",
    )


def write_postgres(cache_dir: Path, connection_string: str, batch_size: int) -> dict[str, Any]:
    manifest = load_manifest(cache_dir)
    insert_sql = """
      INSERT INTO shot_attempts (
        ingestion_run_id,
        shot_id,
        possession_id,
        game_id,
        season,
        player_id,
        player_slug,
        team_id,
        quarter,
        clock,
        loc_x,
        loc_y,
        shot_distance,
        shot_zone,
        shot_type,
        points_value,
        made,
        assisted,
        dribbles_before_shot,
        touch_time,
        defender_distance,
        closest_defender,
        contest_level,
        shot_clock,
        expected_fg_pct,
        expected_points,
        actual_minus_expected,
        play_type,
        is_clutch,
        is_transition,
        is_catch_and_shoot,
        is_pull_up,
        is_at_rim,
        is_corner_three,
        is_above_break_three,
        source
      )
      VALUES (
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s,
        %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s
      )
      ON CONFLICT (ingestion_run_id, shot_id) DO UPDATE SET
        player_slug = EXCLUDED.player_slug,
        expected_fg_pct = EXCLUDED.expected_fg_pct,
        expected_points = EXCLUDED.expected_points,
        actual_minus_expected = EXCLUDED.actual_minus_expected,
        source = EXCLUDED.source
    """
    rows_written = 0
    unmatched_players: set[str] = set()
    with connect(connection_string) as connection:
        with connection.cursor() as cursor:
            ensure_schema(cursor)
            run_id = current_ingestion_run(cursor)
            player_slugs = read_player_slug_map(cursor)
            cursor.execute("DELETE FROM shot_attempts WHERE ingestion_run_id = %s", (run_id,))
            batch: list[tuple[Any, ...]] = []
            for team_id, row in iter_compact_shots(cache_dir, manifest):
                record = shot_record(run_id, team_id, row, player_slugs)
                if record[6] is None:
                    unmatched_players.add(record[5])
                batch.append(record)
                if len(batch) >= batch_size:
                    cursor.executemany(insert_sql, batch)
                    rows_written += len(batch)
                    batch.clear()
            if batch:
                cursor.executemany(insert_sql, batch)
                rows_written += len(batch)
            cursor.execute("SELECT count(*) FROM current_shot_attempts")
            current_rows = int(cursor.fetchone()[0])
    return {
        "status": "written",
        "cache_dir": str(cache_dir),
        "teams": len(manifest.get("teams") or {}),
        "shots_written": rows_written,
        "current_shot_attempts": current_rows,
        "unmatched_player_ids": sorted(unmatched_players)[:25],
        "unmatched_player_count": len(unmatched_players),
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--cache-dir", type=Path, default=DEFAULT_SHOT_CACHE_DIR)
    parser.add_argument("--write-postgres", action="store_true")
    parser.add_argument("--batch-size", type=int, default=5000)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    cache_dir = args.cache_dir.resolve()
    connection_string = database_url()

    try:
        if args.write_postgres:
            if not connection_string:
                print("DATABASE_URL is required when --write-postgres is enabled.", file=sys.stderr)
                raise SystemExit(2)
            output = write_postgres(cache_dir, connection_string, max(1, args.batch_size))
        else:
            output = {"status": "validated", **validate_cache(cache_dir)}
    except RuntimeError as error:
        print(f"Postgres shot refresh failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    print(json.dumps(output, indent=2))


if __name__ == "__main__":
    main()
