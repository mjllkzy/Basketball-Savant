#!/usr/bin/env python3
"""Refresh ShotClock news from NBA.com and trusted rumor feeds."""

from __future__ import annotations

import argparse
import email.utils
import html
import json
import re
import sys
import urllib.error
import urllib.request
import xml.etree.ElementTree as ET
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Any
from urllib.parse import urlparse


NBA_NEWS_URL = "https://www.nba.com/news"
DEFAULT_OUTPUT = Path("src/lib/data/news.json")
REQUEST_TIMEOUT_SECONDS = 30
USER_AGENT = "ShotClock-News-Refresh/1.0"
CONTENT_NAMESPACE = "{http://purl.org/rss/1.0/modules/content/}"
DEFAULT_OFFICIAL_LIMIT = 10
DEFAULT_RUMOR_LIMIT = 10

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

@dataclass(frozen=True)
class TrustedRumorSource:
    name: str
    url: str
    allowed_host: str


TRUSTED_RUMOR_SOURCES = (
    TrustedRumorSource(
        name="Hoops Rumors",
        url="https://www.hoopsrumors.com/feed",
        allowed_host="www.hoopsrumors.com",
    ),
)


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


def validate_trusted_rumor_url(value: str, source: TrustedRumorSource) -> str:
    parsed = urlparse(value)
    if parsed.scheme != "https" or parsed.netloc != source.allowed_host:
        raise RuntimeError(f"Unsupported {source.name} rumor source URL: {value}")
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

    if "injur" in category_blob or " acl " in f" {category_blob} ":
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


def classify_rss_category(title: str, categories: list[str], summary: str) -> str:
    category_blob = " ".join([title, summary, *categories]).lower()

    if "injur" in category_blob or " acl " in f" {category_blob} ":
        return "Injury"
    if "draft" in category_blob and "rumor" in category_blob:
        return "Draft Rumor"
    if "free agency" in category_blob or "free agent" in category_blob or "free-agent" in category_blob:
        return "Free Agency"
    if "transaction" in category_blob or "sign" in category_blob or "waive" in category_blob or "exhibit 10" in category_blob:
        return "Transaction"
    if "trade" in category_blob or "acquire" in category_blob:
        return "Trade"
    if "coach" in category_blob:
        return "Coaching"
    if "roster" in category_blob:
        return "Roster"
    if "draft" in category_blob:
        return "Draft"
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


def rss_item_to_news_item(item: ET.Element, source: TrustedRumorSource) -> NewsItem | None:
    title = clean_text(item.findtext("title"))
    raw_source_url = clean_text(item.findtext("link"))
    raw_published_at = clean_text(item.findtext("pubDate"))
    description = clean_text(item.findtext("description"))
    content = clean_text(item.findtext(f"{CONTENT_NAMESPACE}encoded"))
    summary = trim_summary(description or content)
    categories = [clean_text(category.text) for category in item.findall("category") if clean_text(category.text)]
    category = classify_rss_category(title, categories, summary)

    if not title or not raw_source_url or not raw_published_at or not summary:
        return None
    source_url = validate_trusted_rumor_url(raw_source_url, source)
    published_at = parse_rss_datetime(raw_published_at)
    if category not in ALLOWED_CATEGORIES:
        raise RuntimeError(f"Unsupported rumor category {category!r} for {source_url}")

    return NewsItem(
        id=external_item_id(source, source_url, title),
        title=title,
        category=category,
        reportingStatus="Rumor",
        publishedAt=published_at,
        sourceName=source.name,
        sourceUrl=source_url,
        summary=summary,
    )


def refresh_trusted_rumor_news(sources: tuple[TrustedRumorSource, ...], *, limit: int, allow_failures: bool) -> list[dict[str, str]]:
    items: list[NewsItem] = []
    seen: set[str] = set()
    for source in sources:
        try:
            feed_xml = fetch_text(source.url)
            feed = ET.fromstring(feed_xml)
        except (OSError, urllib.error.URLError, ET.ParseError, RuntimeError) as error:
            if not allow_failures:
                raise RuntimeError(f"{source.name} rumor refresh failed: {error}") from error
            print(f"{source.name} rumor refresh skipped: {error}", file=sys.stderr)
            continue

        for entry in feed.findall("./channel/item"):
            try:
                item = rss_item_to_news_item(entry, source)
            except (ValueError, RuntimeError) as error:
                if not allow_failures:
                    raise RuntimeError(f"{source.name} rumor item failed validation: {error}") from error
                print(f"{source.name} rumor item skipped: {error}", file=sys.stderr)
                continue
            if not item or item.id in seen:
                continue
            seen.add(item.id)
            items.append(item)

    items.sort(key=lambda item: parse_iso_datetime(item.publishedAt), reverse=True)
    return [item.to_json() for item in items[:limit]]


def external_item_id(source: TrustedRumorSource, source_url: str, title: str) -> str:
    parsed = urlparse(source_url)
    slug = Path(parsed.path).name.removesuffix(".html") or title
    return f"{slugify(source.name)}-{slugify(slug)}"


def slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    return slug or "item"


def trim_summary(value: str, *, max_length: int = 220) -> str:
    summary = clean_text(value).replace("[...]", "").replace("[…]", "").strip()
    if len(summary) <= max_length:
        return summary
    trimmed = summary[:max_length].rsplit(" ", 1)[0].rstrip(".,;:")
    return f"{trimmed}..."


def parse_rss_datetime(value: str) -> str:
    parsed = email.utils.parsedate_to_datetime(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_iso_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def dedupe_news_items(items: list[dict[str, str]]) -> list[dict[str, str]]:
    deduped: list[dict[str, str]] = []
    seen: set[str] = set()
    for item in items:
        key = f"{item['sourceUrl']}::{item['title']}"
        if key in seen:
            continue
        seen.add(key)
        deduped.append(item)
    return deduped


def recent_news_by_status(items: list[dict[str, str]], status: str, *, limit: int) -> list[dict[str, str]]:
    filtered = [item for item in dedupe_news_items(items) if item["reportingStatus"] == status]
    filtered.sort(key=lambda item: parse_iso_datetime(item["publishedAt"]), reverse=True)
    return filtered[:limit]


def select_display_news_items(
    official_items: list[dict[str, str]],
    rumor_items: list[dict[str, str]],
    *,
    official_limit: int,
    rumor_limit: int,
) -> list[dict[str, str]]:
    selected = [
        *recent_news_by_status(official_items, "Official", limit=official_limit),
        *recent_news_by_status(rumor_items, "Rumor", limit=rumor_limit),
    ]
    selected.sort(key=lambda item: parse_iso_datetime(item["publishedAt"]), reverse=True)
    return selected


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-url", default=NBA_NEWS_URL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", "--official-limit", dest="official_limit", type=int, default=DEFAULT_OFFICIAL_LIMIT, help="Official NBA.com items to display.")
    parser.add_argument("--rumor-limit", type=int, default=DEFAULT_RUMOR_LIMIT, help="Trusted rumor items to display.")
    parser.add_argument("--skip-rumors", action="store_true", help="Only refresh NBA.com official news.")
    parser.add_argument("--require-rumors", action="store_true", help="Fail if trusted rumor sources cannot be refreshed.")
    parser.add_argument("--dry-run", action="store_true", help="Print refreshed JSON instead of writing it.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        official_payload = refresh_news(args.source_url, limit=max(args.official_limit * 2, args.official_limit))
        rumor_payload = [] if args.skip_rumors else refresh_trusted_rumor_news(
            TRUSTED_RUMOR_SOURCES,
            limit=args.rumor_limit,
            allow_failures=not args.require_rumors,
        )
        payload = select_display_news_items(
            official_payload,
            rumor_payload,
            official_limit=args.official_limit,
            rumor_limit=0 if args.skip_rumors else args.rumor_limit,
        )
        official_count = sum(1 for item in payload if item["reportingStatus"] == "Official")
        rumor_count = sum(1 for item in payload if item["reportingStatus"] == "Rumor")
        if official_count < args.official_limit:
            raise RuntimeError(f"NBA.com news refresh produced only {official_count} official items")
        if args.require_rumors and not args.skip_rumors and rumor_count < args.rumor_limit:
            raise RuntimeError(f"Trusted rumor refresh produced only {rumor_count} rumor items")
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
        "official": sum(1 for item in payload if item["reportingStatus"] == "Official"),
        "rumors": sum(1 for item in payload if item["reportingStatus"] == "Rumor"),
        "source": args.source_url,
        "latest": payload[0]["publishedAt"] if payload else None,
    }, indent=2))


if __name__ == "__main__":
    main()
