#!/usr/bin/env python3
"""Sync Basketball Reference player/team option markers into contract JSON."""

from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from html.parser import HTMLParser
from pathlib import Path
from typing import Any
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = ROOT / "data" / "raw" / "player_contracts_2025_2031.json"
BASKETBALL_REFERENCE_CONTRACTS_URL = "https://www.basketball-reference.com/contracts/players.html"
SEASON_BY_DATA_STAT = {
    "y1": "2025-26",
    "y2": "2026-27",
    "y3": "2027-28",
    "y4": "2028-29",
    "y5": "2029-30",
    "y6": "2030-31",
}
OPTION_LABEL_BY_CLASS = {
    "salary-pl": "Player Option",
    "salary-tm": "Team Option",
}
NAME_TRANSLATION = str.maketrans({"ё": "e", "Ё": "e", "ë": "e", "Ë": "e", "’": "'", "‘": "'"})


def normalize_player_name(value: str) -> str:
    text = value.translate(NAME_TRANSLATION)
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii").lower()
    return re.sub(r"[^a-z0-9]+", " ", text).strip()


class ContractOptionParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.rows: list[dict[str, Any]] = []
        self.current_row: dict[str, Any] | None = None
        self.current_cell: dict[str, Any] | None = None

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        attrs_by_name = {key: value for key, value in attrs}
        if tag == "tr":
            self.current_row = {"options_by_season": {}}
            return
        if self.current_row is None or tag not in {"th", "td"}:
            return
        data_stat = attrs_by_name.get("data-stat")
        if data_stat not in {"ranker", "player", "team_id", *SEASON_BY_DATA_STAT.keys()}:
            return
        self.current_cell = {
            "data_stat": data_stat,
            "class_names": set((attrs_by_name.get("class") or "").split()),
            "csk": attrs_by_name.get("csk"),
            "text": "",
        }

    def handle_data(self, data: str) -> None:
        if self.current_cell is not None:
            self.current_cell["text"] += data

    def handle_endtag(self, tag: str) -> None:
        if tag in {"th", "td"} and self.current_cell is not None and self.current_row is not None:
            data_stat = self.current_cell["data_stat"]
            text = re.sub(r"\s+", " ", self.current_cell["text"]).strip()
            if data_stat == "ranker" and self.current_cell["csk"]:
                self.current_row["source_rank"] = int(str(self.current_cell["csk"]))
            elif data_stat == "player":
                self.current_row["player_name"] = text
            elif data_stat == "team_id":
                self.current_row["team_abbreviation"] = text
            elif data_stat in SEASON_BY_DATA_STAT:
                season = SEASON_BY_DATA_STAT[data_stat]
                for class_name, label in OPTION_LABEL_BY_CLASS.items():
                    if class_name in self.current_cell["class_names"]:
                        self.current_row["options_by_season"][season] = label
            self.current_cell = None
            return
        if tag == "tr" and self.current_row is not None:
            if self.current_row.get("source_rank") and self.current_row.get("player_name"):
                self.rows.append(self.current_row)
            self.current_row = None


def fetch_contracts_html(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=30) as response:
        return response.read().decode("utf-8", errors="ignore")


def parse_options(html: str) -> dict[int, dict[str, Any]]:
    parser = ContractOptionParser()
    parser.feed(html)
    return {int(row["source_rank"]): row for row in parser.rows}


def load_json(source_path: Path) -> dict[str, Any]:
    with source_path.open("r", encoding="utf-8") as file_handle:
        return json.load(file_handle)


def sync_options(payload: dict[str, Any], option_rows: dict[int, dict[str, Any]]) -> dict[str, Any]:
    contracts = payload.get("contracts")
    if not isinstance(contracts, list):
        raise RuntimeError("Contract JSON must contain a contracts list.")

    changed = 0
    option_cells = 0
    mismatches: list[dict[str, Any]] = []
    for row in contracts:
        if not isinstance(row, dict):
            continue
        source_rank = int(row.get("source_rank") or 0)
        option_row = option_rows.get(source_rank)
        if not option_row:
            continue
        expected_name = normalize_player_name(str(row.get("player_name") or ""))
        actual_name = normalize_player_name(str(option_row.get("player_name") or ""))
        if expected_name and actual_name and expected_name != actual_name:
            mismatches.append({
                "source_rank": source_rank,
                "json_player_name": row.get("player_name"),
                "source_player_name": option_row.get("player_name"),
            })
            continue
        options = dict(option_row.get("options_by_season") or {})
        option_cells += len(options)
        if options:
            if row.get("options_by_season") != options:
                row["options_by_season"] = options
                changed += 1
        elif row.pop("options_by_season", None):
            changed += 1

    metadata = payload.setdefault("metadata", {})
    metadata["option_source"] = {
        "source_label": "Basketball Reference contracts color key",
        "source_url": BASKETBALL_REFERENCE_CONTRACTS_URL,
        "class_labels": OPTION_LABEL_BY_CLASS,
    }
    return {
        "status": "synced",
        "contracts": len(contracts),
        "matched_source_rows": len(option_rows),
        "changed_contracts": changed,
        "option_cells": option_cells,
        "mismatches": mismatches,
    }


def write_json(source_path: Path, payload: dict[str, Any]) -> None:
    source_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE)
    parser.add_argument("--html", type=Path, help="Use a saved Basketball Reference contracts HTML file instead of fetching.")
    parser.add_argument("--write", action="store_true", help="Write synced option labels back to the contract JSON source.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source_path = args.source.resolve()
    html = args.html.read_text(encoding="utf-8") if args.html else fetch_contracts_html(BASKETBALL_REFERENCE_CONTRACTS_URL)
    payload = load_json(source_path)
    result = sync_options(payload, parse_options(html))
    if result["mismatches"]:
        print(json.dumps(result, indent=2, ensure_ascii=False), file=sys.stderr)
        raise SystemExit(1)
    if args.write:
        write_json(source_path, payload)
        result["source_path"] = str(source_path)
    print(json.dumps(result, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
