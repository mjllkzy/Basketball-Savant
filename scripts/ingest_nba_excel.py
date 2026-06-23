#!/usr/bin/env python3
"""Ingest approved NBA Excel sheets into normalized SQLite and JSON outputs."""

from __future__ import annotations

import argparse
import json
import math
import re
import sqlite3
import sys
import unicodedata
from collections import Counter, defaultdict
from datetime import date, datetime, time, timezone
from pathlib import Path
from typing import Any

from openpyxl import load_workbook
from openpyxl.utils import get_column_letter

sys.path.insert(0, str(Path(__file__).resolve().parent))

from audit_nba_excel import build_audit, sha256, text_value  # noqa: E402


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_WORKBOOK = ROOT / "data" / "raw" / "nba_data_2025_26.xlsx"
DEFAULT_SQLITE = ROOT / "data" / "processed" / "nba_master.sqlite"
DEFAULT_COLUMN_DICTIONARY = ROOT / "data" / "processed" / "column_dictionary.json"
DEFAULT_ISSUES_LOG = ROOT / "data" / "processed" / "data_issues_log.json"
DEFAULT_PLAYERS_JSON = ROOT / "public" / "data" / "players.json"
DEFAULT_PROFILE_DIR = ROOT / "public" / "data" / "player_profiles"
DEFAULT_RUNTIME_SUMMARIES = ROOT / "src" / "lib" / "data" / "generated" / "master-player-summaries.json"

SEASON = "2025-26"
SEASON_TYPE = "Regular Season"
PROFILE_STAT_LIMIT = None
MISSING_MARKERS = {"", "-", "--", "—", "n/a", "na", "null"}
PLAYER_HEADER_NAMES = {"player", "vs_player"}
TEAM_HEADER_NAMES = {"team"}
REVIEWED_IMPORT_SHEETS = {
    "General - Official Leaders": "Reviewed after audit: NBA.com official leaders export with a time-formatted 3PM header.",
    "General - Traditional": "Reviewed after audit: NBA.com Per Game export with one time-formatted 3PM header.",
    "General - Estimated Advanced": "Reviewed after audit: NBA.com estimated advanced export with player rows but no team column.",
    "Clutch - Traditional": "Reviewed after audit: NBA.com clutch traditional export with one time-formatted 3PM header.",
    "Sheet69": "Reviewed after audit: generic sheet name, but layout is a valid NBA.com defensive play type export.",
    "Sheet70": "Reviewed after audit: generic sheet name, but layout is a valid NBA.com defensive play type export.",
    "Tracking - Catch & Shoot": "Reviewed after audit: NBA.com tracking export with one time-formatted 3PM header.",
    "Tracking - Pullup Shooting": "Reviewed after audit: NBA.com tracking export with one time-formatted 3PM header.",
    "Shooting Dashboard - Overall": "Reviewed after audit: NBA.com grouped shooting dashboard with a time-formatted 3FGM header.",
    "Shooting Dashboard - Catch & Sh": "Reviewed after audit: NBA.com grouped shooting dashboard with a time-formatted 3FGM header.",
    "Shooting Dashboard - Pullups": "Reviewed after audit: NBA.com grouped shooting dashboard with a time-formatted 3FGM header.",
    "Shooting - 5ft Range": "Reviewed after audit: NBA.com grouped shooting zone export; group labels are flattened into stat names.",
    "Shooting - 8ft Range": "Reviewed after audit: NBA.com grouped shooting zone export; group labels are flattened into stat names.",
    "Shooting - By Zone": "Reviewed after audit: NBA.com grouped shooting zone export; group labels are flattened into stat names.",
    "Opponent Shooting - 5ft Range": "Reviewed after audit: NBA.com grouped opponent shooting zone export; group labels are flattened into stat names.",
    "Opponent Shooting - 8ft Range": "Reviewed after audit: NBA.com grouped opponent shooting zone export; group labels are flattened into stat names.",
    "Opponent Shooting - By Zone": "Reviewed after audit: NBA.com grouped opponent shooting zone export; group labels are flattened into stat names.",
    "Bios": "Reviewed after audit: NBA.com bio export with height cells sometimes formatted as Excel dates.",
}
REVIEWED_HEADER_REPLACEMENTS = {
    "General - Traditional": {
        1: "Rank",
        13: "3PM",
        30: "+/-",
    }
}
GROUPED_HEADER_SHEETS = {
    "Shooting Dashboard - Overall",
    "Shooting Dashboard - Catch & Sh",
    "Shooting Dashboard - Pullups",
    "Shooting - 5ft Range",
    "Shooting - 8ft Range",
    "Shooting - By Zone",
    "Opponent Shooting - 5ft Range",
    "Opponent Shooting - 8ft Range",
    "Opponent Shooting - By Zone",
}
RUNTIME_SUMMARY_SHEETS = {
    "General - Traditional",
    "General - Advanced",
    "Bios",
    "General - Defense",
    "General - Misc",
    "General - Usage",
}


def now_iso() -> str:
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def json_safe(value: Any) -> Any:
    if value is None:
        return None
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        if isinstance(value, float) and not math.isfinite(value):
            return None
        return value
    if isinstance(value, datetime):
        return value.isoformat(sep=" ")
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, time):
        return value.isoformat()
    return str(value)


def slugify(value: str) -> str:
    ascii_value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    ascii_value = ascii_value.replace(".", "")
    slug = re.sub(r"[^a-zA-Z0-9]+", "-", ascii_value.lower()).strip("-")
    return slug or "unknown-player"


def canonical_player_name(raw_name: Any) -> tuple[str, str | None]:
    name = re.sub(r"\s+", " ", text_value(raw_name)).strip()
    if not name:
        return "", None
    if "," not in name:
        return name, None
    last, first = [part.strip() for part in name.split(",", 1)]
    if not last or not first:
        return name, None
    return f"{first} {last}".strip(), "last_first_name_reordered"


def snake_case(value: Any) -> str:
    text = text_value(value)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = text.replace("\n", " ").replace("\r", " ").strip().lower()
    replacements = [
        (r"\b3pm\b", "three_pm"),
        (r"\b3pa\b", "three_pa"),
        (r"\b3pt\b", "three_pt"),
        (r"\b3p\b", "three_p"),
        (r"\b3fgm\b", "three_fgm"),
        (r"\b2pt\b", "two_pt"),
        (r"\b2fgm\b", "two_fgm"),
        (r"\b2nd\b", "second"),
        (r"\boff\b", "off"),
        (r"\bdef\b", "def"),
    ]
    for pattern, replacement in replacements:
        text = re.sub(pattern, replacement, text)
    text = text.replace("%", " pct ")
    text = text.replace("#", " number ")
    text = text.replace("+", " plus ")
    text = text.replace("<", " lt ")
    text = text.replace(">", " gt ")
    text = text.replace("/", " per ")
    text = text.replace("&", " and ")
    text = re.sub(r"[^a-z0-9]+", "_", text)
    text = re.sub(r"_+", "_", text).strip("_")
    if not text:
        return "unnamed_column"
    if text[0].isdigit():
        text = f"stat_{text}"
    return text


def height_inches_from_value(value: Any) -> tuple[float | None, str | None]:
    if isinstance(value, datetime):
        feet = value.month
        inches = value.day
        if 4 <= feet <= 8 and 0 <= inches <= 11:
            return float(feet * 12 + inches), "height_excel_date_converted_to_inches"
    if isinstance(value, date):
        feet = value.month
        inches = value.day
        if 4 <= feet <= 8 and 0 <= inches <= 11:
            return float(feet * 12 + inches), "height_excel_date_converted_to_inches"
    text = text_value(value).strip()
    match = re.match(r"^([4-8])-(\d{1,2})$", text)
    if match:
        feet = int(match.group(1))
        inches = int(match.group(2))
        if 0 <= inches <= 11:
            return float(feet * 12 + inches), "height_text_converted_to_inches"
    return None, None


def clean_numeric(value: Any, *, source_sheet: str = "", cleaned_column_name: str = "") -> tuple[float | None, str | None]:
    if value is None:
        return None, "blank_value"
    if source_sheet == "Bios" and cleaned_column_name == "height":
        height_inches, note = height_inches_from_value(value)
        if height_inches is not None:
            return height_inches, note
    if isinstance(value, bool):
        return None, "boolean_value_not_numeric"
    if isinstance(value, (datetime, date, time)):
        return None, "date_or_time_value_not_numeric"
    if isinstance(value, (int, float)):
        if isinstance(value, float) and not math.isfinite(value):
            return None, "non_finite_numeric_value"
        return float(value), None
    text = text_value(value).strip()
    if text.lower() in MISSING_MARKERS:
        return None, "blank_value"
    cleaned = text.replace(",", "")
    if cleaned.endswith("%"):
        cleaned = cleaned[:-1].strip()
    cleaned = cleaned.replace("$", "").strip()
    try:
        return float(cleaned), None
    except ValueError:
        return None, "non_numeric_text_value"


def add_issue(
    issues: list[dict[str, Any]],
    severity: str,
    issue_type: str,
    message: str,
    **details: Any,
) -> None:
    issues.append(
        {
            "severity": severity,
            "type": issue_type,
            "message": message,
            "details": details,
        }
    )


def load_sheet_decisions(audit: dict[str, Any]) -> dict[str, dict[str, Any]]:
    return {sheet["sheetName"]: sheet for sheet in audit["sheets"]}


def find_role_columns(headers: list[Any], cleaned_overrides: dict[int, str] | None = None) -> tuple[int | None, int | None]:
    player_col = None
    team_col = None
    for idx, header in enumerate(headers, start=1):
        normalized = cleaned_overrides.get(idx, snake_case(header)) if cleaned_overrides else snake_case(header)
        if player_col is None and normalized in PLAYER_HEADER_NAMES:
            player_col = idx
        if team_col is None and normalized in TEAM_HEADER_NAMES:
            team_col = idx
    return player_col, team_col


def is_time_formatted_three_header(value: Any) -> bool:
    if isinstance(value, time):
        return value.hour == 15 and value.minute == 0 and value.second == 0
    if isinstance(value, datetime):
        return value.hour == 15 and value.minute == 0 and value.second == 0
    return text_value(value).strip().lower() in {"15:00:00", "15:00"}


def row_values(ws: Any, row_number: int) -> list[Any]:
    return [cell.value for cell in next(ws.iter_rows(min_row=row_number, max_row=row_number))]


def infer_header_row(ws: Any, sheet_name: str, audit_header_row: int | None, issues: list[dict[str, Any]]) -> int | None:
    candidates: list[tuple[int, int, bool, int]] = []
    for row in ws.iter_rows(min_row=1, max_row=40):
        values = [cell.value for cell in row]
        player_col, team_col = find_role_columns(values)
        if player_col is None:
            continue
        nonblank = sum(1 for value in values if text_value(value))
        score = nonblank + (100 if team_col is not None else 20)
        if audit_header_row and row[0].row == audit_header_row:
            score += 15
        candidates.append((score, row[0].row, team_col is not None, nonblank))

    if not candidates:
        if audit_header_row:
            add_issue(
                issues,
                "error",
                "unclear_header_row",
                "No Player/Team-style header row could be detected; audit header was not used without a player column.",
                sheetName=sheet_name,
                auditHeaderRow=audit_header_row,
            )
        return None

    candidates.sort(reverse=True)
    best_score, best_row, has_team, _ = candidates[0]
    tied = [candidate for candidate in candidates if candidate[0] == best_score]
    if len(tied) > 1:
        add_issue(
            issues,
            "warning",
            "ambiguous_header_row",
            "Multiple possible header rows had the same detection score; the first best row was used.",
            sheetName=sheet_name,
            chosenHeaderRow=best_row,
            candidateRows=[candidate[1] for candidate in tied],
        )
    if not has_team:
        add_issue(
            issues,
            "warning",
            "missing_team_column",
            "A Player header was detected but no Team header was found; team values will be preserved as blank.",
            sheetName=sheet_name,
            headerRow=best_row,
        )
    return best_row


def grouped_labels_for_headers(ws: Any, header_row: int, width: int) -> list[str]:
    if header_row <= 1:
        return [""] * width
    group_values = row_values(ws, header_row - 1)
    labels: list[str] = []
    current = ""
    for idx in range(width):
        value = group_values[idx] if idx < len(group_values) else None
        text = text_value(value).replace("\n", " ").strip()
        if text:
            current = text
        labels.append(current)
    return labels


def build_clean_header_overrides(
    *,
    sheet_name: str,
    headers: list[Any],
    group_labels: list[str],
    issues: list[dict[str, Any]],
) -> tuple[dict[int, str], dict[int, list[str]]]:
    overrides: dict[int, str] = {}
    notes: dict[int, list[str]] = defaultdict(list)
    reviewed_replacements = REVIEWED_HEADER_REPLACEMENTS.get(sheet_name, {})

    for idx, replacement in reviewed_replacements.items():
        overrides[idx] = snake_case(replacement)
        notes[idx].append(f"inferred_header:{replacement}")

    for idx, original in enumerate(headers, start=1):
        original_text = text_value(original).replace("\n", " ").strip()
        previous_text = text_value(headers[idx - 2]).replace("\n", " ").strip() if idx > 1 else ""
        next_text = text_value(headers[idx]).replace("\n", " ").strip() if idx < len(headers) else ""
        group_label = group_labels[idx - 1] if idx - 1 < len(group_labels) else ""

        if idx == 1 and not original_text and any(snake_case(header) in PLAYER_HEADER_NAMES for header in headers[1:4]):
            overrides[idx] = "rank"
            notes[idx].append("blank_leading_rank_header_inferred")

        if original_text == "#":
            overrides[idx] = "rank"
            notes[idx].append("rank_header_normalized")

        if is_time_formatted_three_header(original):
            if "3 Point Field Goals" in group_label or previous_text.upper() == "3FG FREQ":
                inferred = "three_fgm"
                readable = "3FGM"
            elif next_text.upper() == "3PA":
                inferred = "three_pm"
                readable = "3PM"
            else:
                inferred = "three_pm"
                readable = "3PM"
            overrides[idx] = inferred
            notes[idx].append(f"time_formatted_header_inferred_as:{readable}")
            add_issue(
                issues,
                "info",
                "time_formatted_header_normalized",
                "A time-formatted header was preserved raw and mapped to a usable cleaned stat name.",
                sheetName=sheet_name,
                columnIndex=idx,
                originalColumnName=original_text,
                cleanedColumnName=inferred,
                groupLabel=group_label,
            )

        if sheet_name in GROUPED_HEADER_SHEETS and group_label and original_text:
            role_name = snake_case(original_text)
            if role_name not in PLAYER_HEADER_NAMES | TEAM_HEADER_NAMES and role_name != "age":
                grouped_name = f"{snake_case(group_label)}_{role_name}"
                if idx not in overrides:
                    overrides[idx] = grouped_name
                    notes[idx].append(f"grouped_header_prefix:{group_label}")

    return overrides, notes


def prepare_columns(
    *,
    sheet_name: str,
    headers: list[Any],
    player_col: int,
    team_col: int | None,
    cleaned_overrides: dict[int, str] | None = None,
    header_notes: dict[int, list[str]] | None = None,
    issues: list[dict[str, Any]],
) -> tuple[list[dict[str, Any]], list[dict[str, Any]]]:
    column_entries: list[dict[str, Any]] = []
    stat_columns: list[dict[str, Any]] = []
    seen_clean_names: Counter[str] = Counter()
    seen_original_stat_names: Counter[str] = Counter()
    for idx, original in enumerate(headers, start=1):
        original_name = text_value(original)
        excel_column = get_column_letter(idx)
        role = "stat"
        imported = True
        notes: list[str] = list((header_notes or {}).get(idx, []))
        cleaned = (cleaned_overrides or {}).get(idx) or snake_case(original_name)
        if idx == player_col:
            role = "player"
        elif idx == team_col:
            role = "team"
        elif not original_name and idx not in (cleaned_overrides or {}):
            role = "skipped_blank_header"
            imported = False
            notes.append("blank_header_not_imported")
            add_issue(
                issues,
                "warning",
                "blank_header_column_skipped",
                "A blank header column was skipped during ingestion.",
                sheetName=sheet_name,
                columnIndex=idx,
                excelColumn=excel_column,
            )

        if imported and role == "stat":
            if original_name:
                seen_original_stat_names[original_name] += 1
                if seen_original_stat_names[original_name] > 1:
                    add_issue(
                        issues,
                        "warning",
                        "duplicate_original_column_name",
                        "A duplicate original column name exists in this sheet; cleaned names remain distinct where possible.",
                        sheetName=sheet_name,
                        originalColumnName=original_name,
                        duplicateIndex=seen_original_stat_names[original_name],
                        excelColumn=excel_column,
                    )
            seen_clean_names[cleaned] += 1
            if seen_clean_names[cleaned] > 1:
                deduped = f"{cleaned}_{seen_clean_names[cleaned]}"
                add_issue(
                    issues,
                    "warning",
                    "duplicate_clean_column_name",
                    "A duplicate cleaned column name was suffixed instead of overwritten.",
                    sheetName=sheet_name,
                    originalColumnName=original_name,
                    cleanedColumnName=cleaned,
                    dedupedColumnName=deduped,
                    excelColumn=excel_column,
                )
                cleaned = deduped
                notes.append("cleaned_column_name_deduped")

        entry = {
            "source_sheet": sheet_name,
            "column_index": idx,
            "excel_column": excel_column,
            "original_column_name": original_name,
            "cleaned_column_name": cleaned,
            "role": role,
            "imported": imported,
            "notes": notes,
        }
        column_entries.append(entry)
        if imported and role == "stat":
            stat_columns.append(entry)
    return column_entries, stat_columns


def create_database(path: Path) -> sqlite3.Connection:
    path.parent.mkdir(parents=True, exist_ok=True)
    if path.exists():
        path.unlink()
    for sidecar_suffix in ("-wal", "-shm"):
        sidecar = path.with_name(f"{path.name}{sidecar_suffix}")
        if sidecar.exists():
            sidecar.unlink()
    conn = sqlite3.connect(path)
    conn.execute("PRAGMA journal_mode = DELETE")
    conn.execute("PRAGMA synchronous = NORMAL")
    conn.executescript(
        """
        CREATE TABLE import_metadata (
          key TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );

        CREATE TABLE imported_sheets (
          source_sheet TEXT PRIMARY KEY,
          stat_category TEXT NOT NULL,
          header_row INTEGER NOT NULL,
          source_row_count INTEGER NOT NULL,
          source_column_count INTEGER NOT NULL,
          imported_data_rows INTEGER NOT NULL,
          stat_rows_created INTEGER NOT NULL
        );

        CREATE TABLE column_dictionary (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          source_sheet TEXT NOT NULL,
          stat_category TEXT NOT NULL,
          column_index INTEGER NOT NULL,
          excel_column TEXT NOT NULL,
          original_column_name TEXT NOT NULL,
          cleaned_column_name TEXT NOT NULL,
          role TEXT NOT NULL,
          imported INTEGER NOT NULL,
          notes TEXT
        );

        CREATE TABLE players (
          player_slug TEXT PRIMARY KEY,
          player_name TEXT NOT NULL,
          season TEXT NOT NULL,
          season_type TEXT NOT NULL,
          primary_team TEXT,
          teams_json TEXT NOT NULL,
          name_variants_json TEXT NOT NULL,
          source_sheets_json TEXT NOT NULL,
          stat_rows INTEGER NOT NULL,
          profile_path TEXT NOT NULL
        );

        CREATE TABLE stat_values (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          raw_player_name TEXT,
          player_name TEXT NOT NULL,
          player_slug TEXT NOT NULL,
          team TEXT,
          season TEXT NOT NULL,
          season_type TEXT NOT NULL,
          source_sheet TEXT NOT NULL,
          stat_category TEXT NOT NULL,
          original_column_name TEXT NOT NULL,
          cleaned_column_name TEXT NOT NULL,
          raw_value TEXT,
          raw_value_json TEXT,
          numeric_value REAL,
          import_notes TEXT,
          source_row_number INTEGER NOT NULL,
          source_column_letter TEXT NOT NULL
        );

        CREATE INDEX idx_stat_values_player ON stat_values(player_slug);
        CREATE INDEX idx_stat_values_sheet ON stat_values(source_sheet);
        CREATE INDEX idx_stat_values_column ON stat_values(cleaned_column_name);
        """
    )
    return conn


def write_json(path: Path, data: Any, *, compact: bool = False) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    if compact:
        path.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")) + "\n", encoding="utf-8")
    else:
        path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def runtime_value(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "raw": record["raw_value"],
        "numeric": record["numeric_value"],
        "original_column_name": record["original_column_name"],
    }


def build_runtime_summary(profile: dict[str, Any], primary_team: str | None) -> dict[str, Any]:
    sheets: dict[str, dict[str, dict[str, Any]]] = {}
    for record in profile["stats"]:
        sheet_name = record["source_sheet"]
        if sheet_name not in RUNTIME_SUMMARY_SHEETS:
            continue
        sheet = sheets.setdefault(sheet_name, {})
        cleaned_name = record["cleaned_column_name"]
        if cleaned_name not in sheet:
            sheet[cleaned_name] = runtime_value(record)

    return {
        "player_name": profile["player_name"],
        "player_slug": profile["player_slug"],
        "season": SEASON,
        "season_type": SEASON_TYPE,
        "primary_team": primary_team,
        "teams": sorted(team for team in profile["teams"] if team),
        "source_sheets": sorted(profile["source_sheets"]),
        "sheets": sheets,
    }


def import_workbook(args: argparse.Namespace) -> dict[str, Any]:
    workbook_path = args.workbook.resolve()
    if not workbook_path.exists():
        raise FileNotFoundError(f"Workbook not found: {workbook_path}")

    generated_at = now_iso()
    audit = build_audit(workbook_path)
    sheet_decisions = load_sheet_decisions(audit)
    importable_sheet_names = [
        sheet["sheetName"]
        for sheet in audit["sheets"]
        if sheet["decision"] in {"import", "review"} or sheet["sheetName"] in REVIEWED_IMPORT_SHEETS
    ]
    skipped_sheet_names = [
        sheet["sheetName"]
        for sheet in audit["sheets"]
        if sheet["decision"] == "skip" and sheet["sheetName"] not in REVIEWED_IMPORT_SHEETS
    ]
    issues: list[dict[str, Any]] = []
    for sheet_name in importable_sheet_names:
        review_note = REVIEWED_IMPORT_SHEETS.get(sheet_name)
        if sheet_decisions[sheet_name]["decision"] == "review":
            add_issue(
                issues,
                "info",
                "reviewed_sheet_imported",
                "A sheet marked review by the audit was explicitly imported after deterministic review.",
                sheetName=sheet_name,
                reviewNote=review_note or "Imported because the sheet has a detectable NBA.com player table header.",
                auditIssues=[item["type"] for item in sheet_decisions[sheet_name]["issues"]],
            )
    for sheet_name in skipped_sheet_names:
        sheet = sheet_decisions[sheet_name]
        add_issue(
            issues,
            "warning",
            "sheet_skipped_not_importable",
            "Sheet was skipped because the audit did not mark it as a clean import candidate.",
            sheetName=sheet_name,
            decision=sheet["decision"],
            auditIssues=[item["type"] for item in sheet["issues"]],
        )

    conn = create_database(args.sqlite)
    metadata_rows = [
        ("generated_at", generated_at),
        ("source_workbook", str(workbook_path)),
        ("source_workbook_sha256", sha256(workbook_path)),
        ("season", SEASON),
        ("season_type", SEASON_TYPE),
        ("audit_summary", json.dumps(audit["summary"], ensure_ascii=False)),
    ]
    conn.executemany("INSERT INTO import_metadata (key, value) VALUES (?, ?)", metadata_rows)

    wb = load_workbook(workbook_path, read_only=True, data_only=False)
    all_column_entries: list[dict[str, Any]] = []
    all_stat_rows: list[tuple[Any, ...]] = []
    players: dict[str, dict[str, Any]] = {}
    player_profiles: dict[str, dict[str, Any]] = {}
    imported_sheets: list[str] = []
    failed_sheet_names: list[str] = []
    sheet_summaries: list[dict[str, Any]] = []
    missing_value_counts: Counter[tuple[str, str, str]] = Counter()
    nonnumeric_counts: Counter[tuple[str, str, str]] = Counter()
    normalized_value_counts: Counter[tuple[str, str, str, str]] = Counter()
    player_name_reformat_counts: Counter[str] = Counter()
    player_name_variant_counts: Counter[tuple[str, str]] = Counter()
    missing_team_counts: Counter[str] = Counter()
    missing_team_samples: dict[str, list[dict[str, Any]]] = defaultdict(list)
    duplicate_entity_counts: Counter[tuple[str, str, str]] = Counter()
    duplicate_entity_samples: dict[tuple[str, str, str], list[int]] = defaultdict(list)

    try:
        for sheet_name in importable_sheet_names:
            try:
                sheet_meta = sheet_decisions[sheet_name]
                ws = wb[sheet_name]
                header_row = infer_header_row(ws, sheet_name, sheet_meta["likelyHeaderRow"], issues)
                if not header_row:
                    failed_sheet_names.append(sheet_name)
                    add_issue(
                        issues,
                        "error",
                        "failed_sheet_unclear_header",
                        "Sheet could not be imported because no clear player table header was detected.",
                        sheetName=sheet_name,
                    )
                    continue

                headers = row_values(ws, header_row)
                group_labels = grouped_labels_for_headers(ws, header_row, len(headers)) if sheet_name in GROUPED_HEADER_SHEETS else [""] * len(headers)
                cleaned_overrides, header_notes = build_clean_header_overrides(
                    sheet_name=sheet_name,
                    headers=headers,
                    group_labels=group_labels,
                    issues=issues,
                )
                player_col, team_col = find_role_columns(headers, cleaned_overrides)
                if player_col is None:
                    failed_sheet_names.append(sheet_name)
                    add_issue(
                        issues,
                        "error",
                        "failed_sheet_missing_player_column",
                        "Sheet could not be imported because no Player or VS PLAYER column was detected.",
                        sheetName=sheet_name,
                        headerRow=header_row,
                    )
                    continue

                stat_category = sheet_meta["possibleStatCategory"]
                column_entries, stat_columns = prepare_columns(
                    sheet_name=sheet_name,
                    headers=headers,
                    player_col=player_col,
                    team_col=team_col,
                    cleaned_overrides=cleaned_overrides,
                    header_notes=header_notes,
                    issues=issues,
                )
                for entry in column_entries:
                    entry["stat_category"] = stat_category
                all_column_entries.extend(column_entries)

                imported_data_rows = 0
                sheet_stat_rows = 0
                for row in ws.iter_rows(min_row=header_row + 1, max_row=ws.max_row):
                    values = [cell.value for cell in row]
                    if not any(text_value(value) for value in values):
                        continue
                    source_row_number = row[0].row
                    player_raw = values[player_col - 1] if player_col - 1 < len(values) else None
                    team_raw = values[team_col - 1] if team_col and team_col - 1 < len(values) else None
                    raw_player_name = text_value(player_raw)
                    player_name, player_name_note = canonical_player_name(player_raw)
                    team = text_value(team_raw)
                    if not player_name:
                        add_issue(
                            issues,
                            "error",
                            "row_skipped_missing_player",
                            "A data row was skipped because player name is blank.",
                            sheetName=sheet_name,
                            rowNumber=source_row_number,
                        )
                        continue
                    if player_name_note:
                        player_name_reformat_counts[sheet_name] += 1
                    if not team:
                        missing_team_counts[sheet_name] += 1
                        if len(missing_team_samples[sheet_name]) < 10:
                            missing_team_samples[sheet_name].append({"rowNumber": source_row_number, "playerName": player_name})

                    imported_data_rows += 1
                    player_slug = slugify(player_name)
                    entity_key = (sheet_name, player_slug, team)
                    duplicate_entity_counts[entity_key] += 1
                    if len(duplicate_entity_samples[entity_key]) < 5:
                        duplicate_entity_samples[entity_key].append(source_row_number)
                    if player_slug not in players:
                        players[player_slug] = {
                            "player_name": player_name,
                            "player_slug": player_slug,
                            "season": SEASON,
                            "season_type": SEASON_TYPE,
                            "teams": Counter(),
                            "source_sheets": set(),
                            "name_variants": set(),
                            "stat_rows": 0,
                        }
                    player = players[player_slug]
                    display_player_name = player["player_name"]
                    player["name_variants"].update({raw_player_name, player_name, display_player_name})
                    if player_name != display_player_name:
                        player_name_variant_counts[(display_player_name, player_name)] += 1
                    player["teams"][team] += 1
                    player["source_sheets"].add(sheet_name)
                    profile = player_profiles.setdefault(
                        player_slug,
                        {
                            "player_name": display_player_name,
                            "player_slug": player_slug,
                            "season": SEASON,
                            "season_type": SEASON_TYPE,
                            "teams": set(),
                            "source_sheets": set(),
                            "name_variants": set(),
                            "stats": [],
                        },
                    )
                    profile["teams"].add(team)
                    profile["source_sheets"].add(sheet_name)
                    profile["name_variants"].update({raw_player_name, player_name, display_player_name})

                    for column in stat_columns:
                        column_index = column["column_index"]
                        raw = values[column_index - 1] if column_index - 1 < len(values) else None
                        numeric_value, note = clean_numeric(
                            raw,
                            source_sheet=sheet_name,
                            cleaned_column_name=column["cleaned_column_name"],
                        )
                        notes = []
                        if note:
                            notes.append(note)
                            if numeric_value is None:
                                key = (sheet_name, column["cleaned_column_name"], column["original_column_name"])
                                if note == "blank_value":
                                    missing_value_counts[key] += 1
                                else:
                                    nonnumeric_counts[key] += 1
                            else:
                                normalized_value_counts[
                                    (
                                        sheet_name,
                                        column["cleaned_column_name"],
                                        column["original_column_name"],
                                        note,
                                    )
                                ] += 1
                        raw_json_value = json_safe(raw)
                        stat_record = {
                            "player_name": display_player_name,
                            "raw_player_name": raw_player_name,
                            "team": team,
                            "season": SEASON,
                            "season_type": SEASON_TYPE,
                            "source_sheet": sheet_name,
                            "stat_category": stat_category,
                            "original_column_name": column["original_column_name"],
                            "cleaned_column_name": column["cleaned_column_name"],
                            "raw_value": raw_json_value,
                            "numeric_value": numeric_value,
                            "import_notes": "; ".join(notes) if notes else None,
                        }
                        if PROFILE_STAT_LIMIT is None or len(profile["stats"]) < PROFILE_STAT_LIMIT:
                            profile["stats"].append(stat_record)
                        all_stat_rows.append(
                            (
                                raw_player_name,
                                display_player_name,
                                player_slug,
                                team,
                                SEASON,
                                SEASON_TYPE,
                                sheet_name,
                                stat_category,
                                column["original_column_name"],
                                column["cleaned_column_name"],
                                text_value(raw),
                                json.dumps(raw_json_value, ensure_ascii=False),
                                numeric_value,
                                stat_record["import_notes"],
                                source_row_number,
                                column["excel_column"],
                            )
                        )
                        player["stat_rows"] += 1
                        sheet_stat_rows += 1

                imported_sheets.append(sheet_name)
                sheet_summaries.append(
                    {
                        "source_sheet": sheet_name,
                        "stat_category": stat_category,
                        "header_row": header_row,
                        "source_row_count": sheet_meta["rowCount"],
                        "source_column_count": sheet_meta["columnCount"],
                        "imported_data_rows": imported_data_rows,
                        "stat_rows_created": sheet_stat_rows,
                    }
                )
            except Exception as exc:
                failed_sheet_names.append(sheet_name)
                add_issue(
                    issues,
                    "error",
                    "failed_sheet_import",
                    "Sheet import failed and was skipped after logging the exception.",
                    sheetName=sheet_name,
                    exceptionType=type(exc).__name__,
                    error=str(exc),
                )
    finally:
        wb.close()

    for (sheet_name, cleaned_name, original_name), count in missing_value_counts.items():
        add_issue(
            issues,
            "info",
            "blank_stat_values",
            "Blank stat values were preserved as null numeric values.",
            sheetName=sheet_name,
            cleanedColumnName=cleaned_name,
            originalColumnName=original_name,
            count=count,
        )
    for (sheet_name, cleaned_name, original_name), count in nonnumeric_counts.items():
        add_issue(
            issues,
            "warning",
            "non_numeric_stat_values",
            "Non-numeric stat values were preserved raw with null numeric values.",
            sheetName=sheet_name,
            cleanedColumnName=cleaned_name,
            originalColumnName=original_name,
            count=count,
        )
    for (sheet_name, cleaned_name, original_name, note), count in normalized_value_counts.items():
        add_issue(
            issues,
            "info",
            "normalized_numeric_values",
            "Raw values were preserved and deterministic numeric values were created for a typed stat field.",
            sheetName=sheet_name,
            cleanedColumnName=cleaned_name,
            originalColumnName=original_name,
            normalization=note,
            count=count,
        )
    for sheet_name, count in player_name_reformat_counts.items():
        add_issue(
            issues,
            "info",
            "player_name_reformatted",
            "Player names in Last, First format were deterministically normalized to First Last.",
            sheetName=sheet_name,
            count=count,
        )
    for (display_name, variant_name), count in player_name_variant_counts.items():
        add_issue(
            issues,
            "info",
            "player_name_variant_merged",
            "Player name variants were merged by normalized slug.",
            playerName=display_name,
            variantName=variant_name,
            count=count,
        )
    for sheet_name, count in missing_team_counts.items():
        add_issue(
            issues,
            "warning",
            "missing_team_values",
            "Rows with missing team values were imported with blank team fields; no team was guessed.",
            sheetName=sheet_name,
            count=count,
            sampleRows=missing_team_samples[sheet_name],
        )
    for (sheet_name, player_slug, team), count in duplicate_entity_counts.items():
        if count <= 1:
            continue
        add_issue(
            issues,
            "warning",
            "duplicate_player_team_rows",
            "The same player/team key appears more than once in a source sheet; all rows were preserved.",
            sheetName=sheet_name,
            playerSlug=player_slug,
            team=team,
            count=count,
            sampleRowNumbers=duplicate_entity_samples[(sheet_name, player_slug, team)],
        )

    conn.executemany(
        """
        INSERT INTO imported_sheets (
          source_sheet, stat_category, header_row, source_row_count, source_column_count,
          imported_data_rows, stat_rows_created
        )
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                sheet["source_sheet"],
                sheet["stat_category"],
                sheet["header_row"],
                sheet["source_row_count"],
                sheet["source_column_count"],
                sheet["imported_data_rows"],
                sheet["stat_rows_created"],
            )
            for sheet in sheet_summaries
        ],
    )
    conn.executemany(
        """
        INSERT INTO column_dictionary (
          source_sheet, stat_category, column_index, excel_column, original_column_name,
          cleaned_column_name, role, imported, notes
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        [
            (
                entry["source_sheet"],
                entry["stat_category"],
                entry["column_index"],
                entry["excel_column"],
                entry["original_column_name"],
                entry["cleaned_column_name"],
                entry["role"],
                1 if entry["imported"] else 0,
                "; ".join(entry["notes"]) if entry["notes"] else None,
            )
            for entry in all_column_entries
        ],
    )
    conn.executemany(
        """
        INSERT INTO stat_values (
          raw_player_name, player_name, player_slug, team, season, season_type, source_sheet, stat_category,
          original_column_name, cleaned_column_name, raw_value, raw_value_json, numeric_value,
          import_notes, source_row_number, source_column_letter
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        all_stat_rows,
    )

    args.profile_dir.mkdir(parents=True, exist_ok=True)
    for stale_profile in args.profile_dir.rglob("*.json"):
        if stale_profile.is_file():
            stale_profile.unlink()

    player_rows: list[tuple[Any, ...]] = []
    players_json: list[dict[str, Any]] = []
    runtime_summaries: list[dict[str, Any]] = []
    for player_slug, player in sorted(players.items(), key=lambda item: item[1]["player_name"].lower()):
        teams_counter: Counter[str] = player["teams"]
        ordered_teams = [team for team, _ in teams_counter.most_common() if team]
        primary_team = ordered_teams[0] if ordered_teams else None
        source_sheets = sorted(player["source_sheets"])
        name_variants = sorted(name for name in player["name_variants"] if name)
        profile_path = f"/data/player_profiles/{player_slug}.json"
        profile = player_profiles[player_slug]
        profile_out = {
            "player_name": profile["player_name"],
            "player_slug": player_slug,
            "season": SEASON,
            "season_type": SEASON_TYPE,
            "teams": sorted(team for team in profile["teams"] if team),
            "primary_team": primary_team,
            "name_variants": sorted(name for name in profile["name_variants"] if name),
            "source_sheets": source_sheets,
            "stat_rows": player["stat_rows"],
            "stats": profile["stats"],
        }
        write_json(args.profile_dir / f"{player_slug}.json", profile_out, compact=True)
        runtime_summaries.append(build_runtime_summary(profile_out, primary_team))
        player_rows.append(
            (
                player_slug,
                player["player_name"],
                SEASON,
                SEASON_TYPE,
                primary_team,
                json.dumps(ordered_teams, ensure_ascii=False),
                json.dumps(name_variants, ensure_ascii=False),
                json.dumps(source_sheets, ensure_ascii=False),
                player["stat_rows"],
                profile_path,
            )
        )
        players_json.append(
            {
                "player_name": player["player_name"],
                "player_slug": player_slug,
                "season": SEASON,
                "season_type": SEASON_TYPE,
                "primary_team": primary_team,
                "teams": ordered_teams,
                "name_variants": name_variants,
                "source_sheets": source_sheets,
                "stat_rows": player["stat_rows"],
                "profile_path": profile_path,
            }
        )

    conn.executemany(
        """
        INSERT INTO players (
          player_slug, player_name, season, season_type, primary_team, teams_json, name_variants_json,
          source_sheets_json, stat_rows, profile_path
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        player_rows,
    )
    conn.commit()
    conn.close()

    column_dictionary = {
        "generated_at": generated_at,
        "source_workbook": str(workbook_path),
        "source_workbook_sha256": sha256(workbook_path),
        "season": SEASON,
        "season_type": SEASON_TYPE,
        "columns": all_column_entries,
        "by_sheet": {
            sheet_name: [entry for entry in all_column_entries if entry["source_sheet"] == sheet_name]
            for sheet_name in imported_sheets
        },
    }
    write_json(args.column_dictionary, column_dictionary)
    write_json(args.players_json, players_json)
    write_json(args.runtime_summaries, runtime_summaries, compact=True)

    issue_log = {
        "generated_at": generated_at,
        "source_workbook": str(workbook_path),
        "source_workbook_sha256": sha256(workbook_path),
        "season": SEASON,
        "season_type": SEASON_TYPE,
        "audit_summary": audit["summary"],
        "ingestion_summary": {
            "sheets_found": len(audit["sheets"]),
            "sheets_imported": len(imported_sheets),
            "sheets_skipped": len(skipped_sheet_names),
            "sheets_failed": len(failed_sheet_names),
            "unique_players_found": len(players),
            "total_stat_rows_created": len(all_stat_rows),
            "column_dictionary_entries": len(all_column_entries),
            "issues_logged": len(issues),
        },
        "sheets_imported": imported_sheets,
        "sheets_skipped": skipped_sheet_names,
        "sheets_failed": failed_sheet_names,
        "issues": issues,
    }
    write_json(args.issues_log, issue_log)

    example_slug = None
    for preferred in ["Nikola Jokić", "Luka Dončić", "Shai Gilgeous-Alexander", "Giannis Antetokounmpo"]:
        preferred_slug = slugify(preferred)
        if preferred_slug in player_profiles:
            example_slug = preferred_slug
            break
    if example_slug is None and players_json:
        example_slug = players_json[0]["player_slug"]

    return {
        "sheets_found": len(audit["sheets"]),
        "sheets_imported": imported_sheets,
        "sheets_skipped": skipped_sheet_names,
        "sheets_failed": failed_sheet_names,
        "unique_players_found": len(players),
        "total_stat_rows_created": len(all_stat_rows),
        "top_20_issues": issues[:20],
        "example_profile_path": str(args.profile_dir / f"{example_slug}.json") if example_slug else None,
        "outputs": {
            "sqlite": str(args.sqlite),
            "column_dictionary": str(args.column_dictionary),
            "issues_log": str(args.issues_log),
            "players_json": str(args.players_json),
            "profile_dir": str(args.profile_dir),
            "runtime_summaries": str(args.runtime_summaries),
        },
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Ingest clean NBA Excel sheets into normalized outputs.")
    parser.add_argument("--workbook", type=Path, default=DEFAULT_WORKBOOK)
    parser.add_argument("--sqlite", type=Path, default=DEFAULT_SQLITE)
    parser.add_argument("--column-dictionary", type=Path, default=DEFAULT_COLUMN_DICTIONARY)
    parser.add_argument("--issues-log", type=Path, default=DEFAULT_ISSUES_LOG)
    parser.add_argument("--players-json", type=Path, default=DEFAULT_PLAYERS_JSON)
    parser.add_argument("--profile-dir", type=Path, default=DEFAULT_PROFILE_DIR)
    parser.add_argument("--runtime-summaries", type=Path, default=DEFAULT_RUNTIME_SUMMARIES)
    return parser.parse_args()


def main() -> None:
    summary = import_workbook(parse_args())
    print(json.dumps(summary, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
