#!/usr/bin/env python3
"""Refresh ShotClock news from NBA.com while preserving source-backed external items."""

from __future__ import annotations

import argparse
import html
import json
import re
import sys
import urllib.error
import urllib.request
from dataclasses import dataclass
from datetime import datetime
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


NBA_NEWS_URL = "https://www.nba.com/news"
DEFAULT_OUTPUT = Path("src/lib/data/news.json")
REQUEST_TIMEOUT_SECONDS = 30
USER_AGENT = "ShotClock-News-Refresh/1.0"

ALLOWED_CATEGORIES = {
    "League",
    "Coaching",
    "Free Agency",
    "Draft Rumor",
    "Injury",
    "Draft",
    "Transaction",
    "Roster",
    "Trade",
    "Rumor",
}

ALLOWED_REPORTING_STATUSES = {
    "Official",
    "Rumor",
}

REQUIRED_NEWS_FIELDS = {
    "id",
    "title",
    "category",
    "reportingStatus",
    "publishedAt",
    "sourceName",
    "sourceUrl",
    "summary",
}


@dataclass(frozen=True)
class NewsItem:
    id: str
    title: str
    category: str
    reportingStatus: str
    publishedAt: str
    sourceName: str
    sourceUrl: str
    summary: str

    def to_json(self) -> dict[str, str]:
        return {
            "id": self.id,
            "title": self.title,
            "category": self.category,
            "reportingStatus": self.reportingStatus,
            "publishedAt": self.publishedAt,
            "sourceName": self.sourceName,
            "sourceUrl": self.sourceUrl,
            "summary": self.summary,
        }


def fetch_text(url: str) -> str:
    request = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
    with urllib.request.urlopen(request, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        if response.status != 200:
            raise RuntimeError(f"{url} returned HTTP {response.status}")
        return response.read().decode("utf-8", "replace")


def extract_next_data(page_html: str) -> dict[str, Any]:
    match = re.search(
        r'<script id="__NEXT_DATA__" type="application/json">(.*?)</script>',
        page_html,
        flags=re.DOTALL,
    )
    if not match:
        raise RuntimeError("NBA.com news page did not include __NEXT_DATA__ article payload")
    return json.loads(html.unescape(match.group(1)))


def clean_text(value: Any) -> str:
    text = html.unescape(str(value or ""))
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def validate_source_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.netloc != "www.nba.com" or not parsed.path.startswith("/news/"):
        raise RuntimeError(f"Unsupported NBA news source URL: {value}")
    return value


def validate_external_source_url(value: str) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        raise RuntimeError(f"Unsupported external news source URL: {value}")
    return value


def classify_category(article: dict[str, Any]) -> str:
    title = clean_text(article.get("title")).lower()
    primary = article.get("categoryPrimary") or {}
    primary_name = clean_text(primary.get("name") if isinstance(primary, dict) else "")
    category_blob = " ".join([
        clean_text(article.get("category")),
        primary_name,
        title,
    ]).lower()

    if "injur" in category_blob:
        return "Injury"
    if "rumor" in category_blob and "draft" in category_blob:
        return "Draft Rumor"
    if "rumor" in category_blob:
        return "Rumor"
    if "free agency" in category_blob or "free-agent" in category_blob:
        return "Free Agency"
    if "draft" in category_blob:
        return "Draft"
    if "trade" in category_blob or "acquire" in title or "deal" in title:
        return "Trade"
    if "coach" in category_blob:
        return "Coaching"
    if "sign" in title or "extension" in title or "waive" in title:
        return "Transaction"
    if "roster" in category_blob:
        return "Roster"
    return "League"


def classify_reporting_status(article: dict[str, Any], *, category: str) -> str:
    title = clean_text(article.get("title")).lower()
    category_blob = " ".join([
        clean_text(article.get("category")),
        clean_text((article.get("categoryPrimary") or {}).get("name") if isinstance(article.get("categoryPrimary"), dict) else ""),
        title,
    ]).lower()

    if category in {"Rumor", "Draft Rumor"} or "rumor" in category_blob:
        return "Rumor"
    return "Official"


def article_to_news_item(article: dict[str, Any]) -> NewsItem | None:
    if article.get("status") and article.get("status") != "publish":
        return None

    article_blob = " ".join([
        clean_text(article.get("title")),
        clean_text(article.get("category")),
        clean_text(article.get("permalink")),
    ]).lower()
    if "wnba" in article_blob:
        return None

    slug = clean_text(article.get("slug") or article.get("name"))
    title = clean_text(article.get("title") or article.get("shortTitle"))
    source_url = validate_source_url(clean_text(article.get("permalink") or f"{NBA_NEWS_URL}/{slug}"))
    published_at = clean_text(article.get("date") or article.get("modified"))
    summary = clean_text(article.get("excerpt"))
    category = classify_category(article)
    reporting_status = classify_reporting_status(article, category=category)

    if not slug or not title or not published_at or not summary:
        raise RuntimeError(f"NBA.com article is missing required fields: {article!r}")
    if category not in ALLOWED_CATEGORIES:
        raise RuntimeError(f"Unsupported news category {category!r} for {slug}")
    if reporting_status not in ALLOWED_REPORTING_STATUSES:
        raise RuntimeError(f"Unsupported reporting status {reporting_status!r} for {slug}")

    return NewsItem(
        id=slug,
        title=title,
        category=category,
        reportingStatus=reporting_status,
        publishedAt=published_at,
        sourceName="NBA.com",
        sourceUrl=source_url,
        summary=summary,
    )


def extract_latest_items(next_data: dict[str, Any], *, limit: int) -> list[NewsItem]:
    page_props = (((next_data.get("props") or {}).get("pageProps") or {}))
    latest = ((page_props.get("latest") or {}).get("items") or [])
    features = page_props.get("features") or []
    candidates = [*latest, *features]
    if not candidates:
        raise RuntimeError("NBA.com news payload did not include latest news items")

    items: list[NewsItem] = []
    seen: set[str] = set()
    for article in candidates:
        if not isinstance(article, dict):
            continue
        item = article_to_news_item(article)
        if not item or item.id in seen:
            continue
        seen.add(item.id)
        items.append(item)

    items.sort(key=lambda item: item.publishedAt, reverse=True)
    return items[:limit]


def refresh_news(source_url: str, *, limit: int) -> list[dict[str, str]]:
    page_html = fetch_text(source_url)
    next_data = extract_next_data(page_html)
    items = extract_latest_items(next_data, limit=limit)
    if len(items) < min(limit, 8):
        raise RuntimeError(f"NBA.com news refresh produced too few items: {len(items)}")
    return [item.to_json() for item in items]


def validate_existing_news_item(item: Any) -> dict[str, str] | None:
    if not isinstance(item, dict) or not REQUIRED_NEWS_FIELDS.issubset(item):
        return None

    normalized = {field: clean_text(item.get(field)) for field in REQUIRED_NEWS_FIELDS}
    if normalized["category"] not in ALLOWED_CATEGORIES:
        return None
    if normalized["reportingStatus"] not in ALLOWED_REPORTING_STATUSES:
        return None
    if normalized["sourceName"] == "NBA.com":
        return None
    if not is_iso_datetime(normalized["publishedAt"]):
        return None
    validate_external_source_url(normalized["sourceUrl"])
    return {
        "id": normalized["id"],
        "title": normalized["title"],
        "category": normalized["category"],
        "reportingStatus": normalized["reportingStatus"],
        "publishedAt": normalized["publishedAt"],
        "sourceName": normalized["sourceName"],
        "sourceUrl": normalized["sourceUrl"],
        "summary": normalized["summary"],
    }


def is_iso_datetime(value: str) -> bool:
    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False
    return True


def load_preserved_external_items(path: Path) -> list[dict[str, str]]:
    if not path.exists():
        return []

    try:
        current = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, ValueError):
        return []

    if not isinstance(current, list):
        return []

    preserved: list[dict[str, str]] = []
    for item in current:
        try:
            normalized = validate_existing_news_item(item)
        except RuntimeError:
            continue
        if normalized:
            preserved.append(normalized)
    return preserved


def merge_news_items(primary: list[dict[str, str]], preserved: list[dict[str, str]], *, limit: int) -> list[dict[str, str]]:
    merged: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in [*primary, *preserved]:
        key = f"{item['sourceUrl']}::{item['title']}"
        if key in seen:
            continue
        seen.add(key)
        merged.append(item)

    merged.sort(key=lambda item: item["publishedAt"], reverse=True)
    return merged[:limit]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-url", default=NBA_NEWS_URL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", type=int, default=14)
    parser.add_argument("--dry-run", action="store_true", help="Print refreshed JSON instead of writing it.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        payload = refresh_news(args.source_url, limit=args.limit)
        payload = merge_news_items(payload, load_preserved_external_items(args.output), limit=args.limit)
    except (OSError, urllib.error.URLError, ValueError, RuntimeError) as error:
        print(f"NBA news refresh failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    encoded = json.dumps(payload, indent=2, ensure_ascii=False) + "\n"
    if args.dry_run:
        print(encoded, end="")
        return

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(encoded, encoding="utf-8")
    print(json.dumps({
        "status": "updated",
        "output": str(args.output),
        "items": len(payload),
        "source": args.source_url,
        "latest": payload[0]["publishedAt"] if payload else None,
    }, indent=2))


if __name__ == "__main__":
    main()
