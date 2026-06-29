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
from datetime import datetime, timedelta, timezone
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
DEFAULT_RETENTION_DAYS = 3
MAX_NEWS_TITLE_LENGTH = 88
MAX_NEWS_SUMMARY_LENGTH = 155
PERSON_NAME_PATTERN = r"[A-Z][A-Za-z'’.-]+(?:\s+(?:[A-Z][A-Za-z'’.-]+|Jr\.|Sr\.|II|III|IV)){0,3}"

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

CATEGORY_IMPORTANCE = {
    "Trade": 95,
    "Free Agency": 88,
    "Transaction": 82,
    "Injury": 78,
    "Draft": 64,
    "Draft Rumor": 62,
    "Coaching": 54,
    "Roster": 48,
    "League": 42,
    "Rumor": 38,
}

KEYWORD_IMPORTANCE = (
    (r"\b(trade|traded|acquire|acquired)\b", 18),
    (r"\b(blockbuster|star)\b", 16),
    (r"\b(re-sign|sign|extension|contract|deal)\b", 14),
    (r"\b(champion|finals|all-star|mvp|award)\b", 12),
    (r"\b(injury|injured|surgery|torn|acl|achilles)\b", 12),
    (r"\b(waive|waived|release|released)\b", 10),
    (r"\b(draft|lottery|rookie)\b", 8),
)

EVENT_DEDUPE_CATEGORIES = {"Trade", "Transaction", "Free Agency", "Roster", "League"}

TRUSTED_SOURCE_OFFICIAL_PATTERNS = (
    r"\b(?:has|have|had)\s+agreed\s+to\b",
    r"\bagrees?\s+to\b",
    r"\bofficial(?:ly)?\b",
    r"\bannounced?\b",
    r"\bcompleted\b",
    r"\bfinalized\b",
    r"\bis\s+joining\b",
    r"\breceiv(?:e|ed|es|ing)\s+qualifying\s+offers?\b",
    r"\btender(?:ed|s|ing)?\s+qualifying\s+offers?\b",
    r"\b(?:has|have|is|are|was|were)?\s*(?:traded|acquired|sent|signed|re-signed|waived)\b",
)

TRUSTED_SOURCE_SPECULATION_PATTERNS = (
    r"\brumou?rs?\b",
    r"\bmonitoring\b",
    r"\binterest(?:ed)?\b",
    r"\bdiscussion(?:s)?\b",
    r"\bdiscuss(?:ing|ed)?\b",
    r"\btalk(?:s|ing|ed)?\b",
    r"\blink(?:ed|ing)?\b",
    r"\bpossible\b",
    r"\bcould\b",
    r"\bmay\b",
    r"\bmight\b",
    r"\bwould\b",
    r"\bexpected\b",
    r"\bexplor(?:e|ed|ing)\b",
)

TRUSTED_SOURCE_NEGATED_OFFICIAL_PATTERNS = (
    r"\b(?:not|hasn[’']?t|haven[’']?t|won[’']?t|without)\s+(?:agreed|traded|trading|acquired|sent|signed|re-signed|waived|announced|completed|finalized)\b",
    r"\bno\s+(?:trade|deal|agreement|signing|announcement)\b",
)

NEWS_EVENT_STOP_WORDS = {
    "about",
    "after",
    "agree",
    "agreed",
    "agrees",
    "also",
    "around",
    "back",
    "basketball",
    "bring",
    "brings",
    "build",
    "builds",
    "buzz",
    "deal",
    "deals",
    "from",
    "future",
    "heat",
    "html",
    "into",
    "latest",
    "league",
    "more",
    "news",
    "notes",
    "official",
    "pick",
    "picks",
    "report",
    "reported",
    "reportedly",
    "reports",
    "round",
    "rumor",
    "rumors",
    "source",
    "sources",
    "that",
    "their",
    "this",
    "trade",
    "traded",
    "trading",
    "transaction",
    "with",
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


def smart_trim(value: str, *, max_length: int, ellipsis: bool = False) -> str:
    text = re.sub(r"\s+", " ", value).strip(" ,;:-–—")
    if len(text) <= max_length:
        return text

    trim_limit = max_length - 3 if ellipsis else max_length
    clipped = text[: trim_limit + 1]
    for separator in [", ", "; ", " – ", " - ", ": "]:
        candidate = clipped.rsplit(separator, 1)[0].strip(" ,;:-–—")
        if len(candidate) >= trim_limit * 0.55:
            return f"{candidate}..." if ellipsis else candidate

    candidate = clipped.rsplit(" ", 1)[0].strip(" ,;:-–—")
    if not candidate:
        candidate = text[:trim_limit].strip(" ,;:-–—")
    return f"{candidate}..." if ellipsis else candidate


def clean_headline_subject(value: str) -> str:
    text = clean_text(value)
    text = re.sub(r"^(?:Although|While|After)\s+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+(?:if|has|have|was|were|is|are|who|that)$", "", text, flags=re.IGNORECASE)
    return text.strip(" .,…")


def clean_headline_destination(value: str) -> str:
    text = clean_text(value)
    text = re.sub(r"^(?:Although|While|After)\s+", "", text, flags=re.IGNORECASE)
    text = re.sub(r"^the\s+", "", text, flags=re.IGNORECASE)
    return text.strip(" .,…")


def title_action_suffix(category: str, reporting_status: str) -> str:
    if category == "Trade":
        return "Trade Rumors Heat Up" if reporting_status == "Rumor" else "Trade Is Official"
    if category in {"Free Agency", "Transaction"}:
        return "Market Heats Up" if reporting_status == "Rumor" else "Deal Is Official"
    return "Buzz Builds" if reporting_status == "Rumor" else "Move Is Official"


def rewrite_trade_headline(title: str, *, reporting_status: str) -> str | None:
    match = re.match(r"^(.+?),\s+(.+?)\s+(?:Discussing|Discuss|Talking|Have Talked About)\s+(.+?)\s+Trade$", title, flags=re.IGNORECASE)
    if match:
        destination = clean_headline_destination(match.group(1))
        player = clean_headline_subject(match.group(3))
        suffix = "Trade Rumors Heat Up" if reporting_status == "Rumor" else "Trade Talks Heat Up"
        return f"{player}-to-{destination} {suffix}"

    match = re.match(r"^(.+?)\s+Trading\s+(.+?)\s+To\s+(.+)$", title, flags=re.IGNORECASE)
    if match:
        player = clean_headline_subject(match.group(2))
        destination = clean_headline_destination(match.group(3))
        suffix = "Trade Buzz Builds" if reporting_status == "Rumor" else "Trade Is Official"
        return f"{player}-to-{destination} {suffix}"

    match = re.match(r"^(.+?)\s+sends?\s+(.+?)\s+to\s+(.+?)\s+for\s+(.+)$", title, flags=re.IGNORECASE)
    if match:
        player = clean_headline_subject(match.group(2))
        destination = clean_headline_destination(match.group(3))
        return_piece = clean_text(match.group(4))
        return f"{player}-to-{destination} Trade Brings Back {return_piece}"

    return None


def rewrite_summary_headline(title: str, summary: str, *, category: str, reporting_status: str) -> str | None:
    summary_text = clean_text(summary)

    match = re.search(rf"(?i:trade that would send)\s+({PERSON_NAME_PATTERN})\s+(?i:back to)\s+([A-Z][A-Za-z .'-]+)", summary_text)
    if match:
        player = clean_headline_subject(match.group(1))
        destination = clean_headline_destination(match.group(2))
        return f"{player}-to-{destination} Trade Rumors Heat Up"

    match = re.search(rf"(?i:connecting the)\s+(.+?)\s+(?i:to)\s+(?i:(?:the\s+)?(?:[A-Za-z ]+\s+)?star)\s+({PERSON_NAME_PATTERN})", summary_text)
    if match and category == "Trade":
        destination = clean_headline_destination(match.group(1))
        player = clean_headline_subject(match.group(2))
        return f"{player}-to-{destination} Trade Rumors Swirl"

    match = re.search(rf"(?i:(?:the\s+)?)([A-Z][A-Za-z ]+?)\s+(?i:have had internal discussions).*?(?i:trade for)\s+({PERSON_NAME_PATTERN})", summary_text)
    if match and category == "Trade":
        destination = clean_headline_destination(match.group(1))
        player = clean_headline_subject(match.group(2))
        return f"{player}-to-{destination} Trade Rumors Swirl"

    match = re.search(rf"(?i:trade rumors involving)\s+({PERSON_NAME_PATTERN})", summary_text)
    if match and category == "Trade":
        player = clean_headline_subject(match.group(1))
        return f"{player} Trade Rumors Keep Heating Up"

    match = re.search(rf"(?i:won[’']?t be able to re-sign)\s+({PERSON_NAME_PATTERN})", summary_text)
    if match:
        player = clean_headline_subject(match.group(1))
        team = title.split(":", 1)[0].strip() if ":" in title else ""
        return f"{player}-{team} Exit Buzz Grows" if team else f"{player} Exit Buzz Grows"

    match = re.search(rf"(?i:interest in)\s+(?i:(?:[A-Za-z]+\s+)?(?:wing|guard|center|forward|big man))\s+({PERSON_NAME_PATTERN})", summary_text)
    if match:
        player = clean_headline_subject(match.group(1))
        return f"{player} Free-Agent Market Heats Up"

    match = re.search(rf"(?:Although\s+)?({PERSON_NAME_PATTERN})\s+(?i:was reportedly underwhelmed by the)\s+(.+?)\s+(?i:initial contract offers)", summary_text)
    if match:
        player = clean_headline_subject(match.group(1))
        team = clean_text(match.group(2)).removesuffix("‘").removesuffix("'")
        return f"{player}-{team} Contract Talks Hit Snag"

    if title.lower().startswith("latest on ") and category:
        player = title[len("Latest On "):].strip()
        return f"{player} {title_action_suffix(category, reporting_status)}"

    return None


def summarize_title(value: str, *, summary: str = "", category: str = "", reporting_status: str = "") -> str:
    title = clean_text(value)
    title = re.sub(r"^(?:Report|Reports|Rumor|Rumors|NBA Rumors):\s*", "", title, flags=re.IGNORECASE)
    title = re.sub(r"^Stein/Fischer[’']s Latest:\s*", "", title, flags=re.IGNORECASE)
    title = re.sub(r"^([A-Za-z0-9 .&'’/-]+?)\s+Rumors:\s*", r"\1: ", title)
    title = re.sub(r"^([A-Za-z0-9 .&'’/-]+?)\s+Notes:\s*", r"\1: ", title)
    title = re.sub(r"\s*,?\s+(?:And\s+)?More$", "", title, flags=re.IGNORECASE)
    title = re.sub(r"\s+", " ", title).strip(" ,;:-–—")

    rewritten = (
        rewrite_trade_headline(title, reporting_status=reporting_status)
        or rewrite_summary_headline(title, summary, category=category, reporting_status=reporting_status)
    )
    if rewritten:
        return smart_trim(rewritten, max_length=MAX_NEWS_TITLE_LENGTH)

    return smart_trim(title, max_length=MAX_NEWS_TITLE_LENGTH)


def split_sentences(value: str) -> list[str]:
    protected = {
        "No.": "No<dot>",
        "Jr.": "Jr<dot>",
        "Sr.": "Sr<dot>",
        "Dr.": "Dr<dot>",
        "Mr.": "Mr<dot>",
        "Ms.": "Ms<dot>",
    }
    text = value
    for original, replacement in protected.items():
        text = text.replace(original, replacement)
    sentences = re.split(r"(?<=[.!?])\s+", text)
    return [sentence.replace("<dot>", ".").strip() for sentence in sentences if sentence.strip()]


def clean_summary_sentence(value: str) -> str:
    sentence = clean_text(value)
    sentence = re.sub(r"^\d{1,2}:\d{2}\s*(?:am|pm):\s*", "", sentence, flags=re.IGNORECASE)
    sentence = re.sub(r"\((?:[^)]*(?:Twitter|X link|YouTube|Instagram|subscription|link|via)[^)]*)\)", "", sentence, flags=re.IGNORECASE)
    sentence = re.sub(r"^In (?:the latest episode|an episode|an interview|a radio interview)[^,]+,\s*", "", sentence, flags=re.IGNORECASE)
    sentence = re.sub(r"\b(on|On) (?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)\b\s*", "", sentence)
    sentence = re.sub(
        r",?\s+(?:according to|per|relays|writes|league sources tell|sources tell|source tells|the team announced|the program announced)\b.*$",
        "",
        sentence,
        flags=re.IGNORECASE,
    )
    sentence = re.sub(r"\bMore\s*$", "", sentence, flags=re.IGNORECASE)
    sentence = sentence.replace("[...]", "").replace("[…]", "").strip()
    sentence = re.sub(r"\s+,", ",", sentence)
    return re.sub(r"\s+", " ", sentence).strip(" ,;:-–—")


def low_information_summary(value: str) -> bool:
    lowered = value.lower()
    return lowered in {"the move is official", "the deal is official"} or lowered.startswith("the move is official")


def summarize_description(value: str) -> str:
    summary = clean_text(value).replace("[...]", "").replace("[…]", "").replace("More...", "").strip()
    sentences = split_sentences(summary)
    cleaned_sentences = [clean_summary_sentence(sentence) for sentence in sentences]
    useful = [sentence for sentence in cleaned_sentences if sentence and not low_information_summary(sentence)]
    if not useful:
        useful = [sentence for sentence in cleaned_sentences if sentence]
    if not useful:
        return smart_trim(summary, max_length=MAX_NEWS_SUMMARY_LENGTH, ellipsis=True)

    concise = useful[0]
    if len(concise) < 80 and len(useful) > 1:
        combined = f"{concise}. {useful[1].rstrip('.')}"
        if len(combined) <= MAX_NEWS_SUMMARY_LENGTH:
            concise = combined

    if concise and concise[-1] not in ".!?":
        concise = f"{concise}."
    return smart_trim(concise, max_length=MAX_NEWS_SUMMARY_LENGTH, ellipsis=True)


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
        clean_text(article.get("slug") or article.get("name")),
        clean_text(article.get("permalink")),
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
    if re.search(r"\b(trade|traded|trading|acquire|acquired|sends?|sent|dealt)\b", category_blob):
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
    if re.search(r"\b(trade|traded|trading|acquire|acquired|sends?|sent|dealt)\b", category_blob):
        return "Trade"
    if "transaction" in category_blob or "sign" in category_blob or "waive" in category_blob or "exhibit 10" in category_blob:
        return "Transaction"
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


def classify_trusted_source_reporting_status(title: str, summary: str, categories: list[str]) -> str:
    status_blob = " ".join([title, summary, *categories]).lower()
    has_official_signal = any(re.search(pattern, status_blob) for pattern in TRUSTED_SOURCE_OFFICIAL_PATTERNS)
    has_speculation_signal = any(re.search(pattern, status_blob) for pattern in TRUSTED_SOURCE_SPECULATION_PATTERNS)
    has_negated_official_signal = any(re.search(pattern, status_blob) for pattern in TRUSTED_SOURCE_NEGATED_OFFICIAL_PATTERNS)
    has_explicit_rumor_label = bool(re.search(r"\brumou?rs?\b", " ".join([title, *categories]).lower()))
    title_text = clean_text(title)

    if (
        re.match(r"^.+?\s+trading\s+.+?\s+to\s+.+$", title_text, flags=re.IGNORECASE)
        and not re.search(r"\b(?:not|won[’']?t|will\s+not)\s+trading\b", title_text, flags=re.IGNORECASE)
    ):
        return "Official"
    if has_negated_official_signal:
        return "Rumor"
    if has_official_signal and not has_explicit_rumor_label:
        return "Official"
    if has_official_signal and not has_speculation_signal:
        return "Official"
    return "Rumor"


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
    raw_title = clean_text(article.get("title") or article.get("shortTitle"))
    source_url = validate_source_url(clean_text(article.get("permalink") or f"{NBA_NEWS_URL}/{slug}"))
    published_at = clean_text(article.get("date") or article.get("modified"))
    raw_summary = clean_text(article.get("excerpt"))
    category = classify_category(article)
    reporting_status = classify_reporting_status(article, category=category)
    title = summarize_title(raw_title, summary=raw_summary, category=category, reporting_status=reporting_status)
    summary = summarize_description(raw_summary)

    if not slug or not raw_title or not published_at or not raw_summary:
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
    raw_title = clean_text(item.findtext("title"))
    raw_source_url = clean_text(item.findtext("link"))
    raw_published_at = clean_text(item.findtext("pubDate"))
    description = clean_text(item.findtext("description"))
    content = clean_text(item.findtext(f"{CONTENT_NAMESPACE}encoded"))
    summary = summarize_description(description or content)
    categories = [clean_text(category.text) for category in item.findall("category") if clean_text(category.text)]
    category = classify_rss_category(raw_title, categories, summary)
    reporting_status = classify_trusted_source_reporting_status(raw_title, summary, categories)
    title = summarize_title(raw_title, summary=summary, category=category, reporting_status=reporting_status)

    if not raw_title or not raw_source_url or not raw_published_at or not summary:
        return None
    source_url = validate_trusted_rumor_url(raw_source_url, source)
    published_at = parse_rss_datetime(raw_published_at)
    if category not in ALLOWED_CATEGORIES:
        raise RuntimeError(f"Unsupported rumor category {category!r} for {source_url}")
    if reporting_status not in ALLOWED_REPORTING_STATUSES:
        raise RuntimeError(f"Unsupported reporting status {reporting_status!r} for {source_url}")

    return NewsItem(
        id=external_item_id(source, source_url, title),
        title=title,
        category=category,
        reportingStatus=reporting_status,
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


def parse_rss_datetime(value: str) -> str:
    parsed = email.utils.parsedate_to_datetime(value)
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc).isoformat(timespec="milliseconds").replace("+00:00", "Z")


def parse_iso_datetime(value: str) -> datetime:
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def news_importance_score(item: dict[str, str]) -> int:
    text = f"{item.get('title', '')} {item.get('summary', '')}".lower()
    score = CATEGORY_IMPORTANCE.get(item.get("category", ""), 35)
    if item.get("reportingStatus") == "Official":
        score += 6
    for pattern, weight in KEYWORD_IMPORTANCE:
        if re.search(pattern, text):
            score += weight
    if "takeaways" in text or "trending topics" in text:
        score -= 28
    if "summer league schedule" in text or "schedule" in text:
        score -= 10
    return score


def within_retention_window(item: dict[str, str], *, reference_time: datetime, retention_days: int) -> bool:
    cutoff = reference_time - timedelta(days=retention_days)
    return parse_iso_datetime(item["publishedAt"]) >= cutoff


def news_event_text(item: dict[str, str]) -> str:
    return " ".join([
        item.get("title", ""),
        item.get("summary", ""),
        item.get("category", ""),
    ]).lower()


def normalize_event_token(token: str) -> str:
    normalized = token.replace("’", "'")
    normalized = re.sub(r"[^a-z0-9']+", "", normalized.lower()).strip("'")
    if len(normalized) > 4 and normalized.endswith("s"):
        normalized = normalized[:-1]
    return normalized


def news_event_tokens(item: dict[str, str]) -> set[str]:
    tokens: set[str] = set()
    for raw_token in re.findall(r"[a-z0-9][a-z0-9'’.-]*", news_event_text(item)):
        token = normalize_event_token(raw_token)
        if len(token) < 3 or token in NEWS_EVENT_STOP_WORDS:
            continue
        tokens.add(token)
    return tokens


def has_transaction_event_language(item: dict[str, str]) -> bool:
    return bool(re.search(
        r"\b(trade|traded|trading|deal|dealt|send|sends|sent|acquire|acquired|sign|signed|re-sign|re-signed|extension|waive|waived|agree|agreed)\b",
        news_event_text(item),
    ))


def semantically_same_news_event(left: dict[str, str], right: dict[str, str]) -> bool:
    if left.get("sourceUrl") and left.get("sourceUrl") == right.get("sourceUrl"):
        return True
    if left.get("category") not in EVENT_DEDUPE_CATEGORIES or right.get("category") not in EVENT_DEDUPE_CATEGORIES:
        return False
    if not has_transaction_event_language(left) or not has_transaction_event_language(right):
        return False

    left_tokens = news_event_tokens(left)
    right_tokens = news_event_tokens(right)
    overlap = left_tokens & right_tokens
    return len(overlap) >= 4


def source_priority(item: dict[str, str]) -> int:
    source_name = item.get("sourceName", "").lower()
    if source_name == "nba.com":
        return 2
    if any(source.name.lower() == source_name for source in TRUSTED_RUMOR_SOURCES):
        return 1
    return 0


def news_dedupe_priority(item: dict[str, str]) -> tuple[int, int, int, datetime]:
    status_priority = 2 if item.get("reportingStatus") == "Official" else 1
    return (
        status_priority,
        source_priority(item),
        news_importance_score(item),
        parse_iso_datetime(item["publishedAt"]),
    )


def dedupe_news_items(items: list[dict[str, str]]) -> list[dict[str, str]]:
    deduped: list[dict[str, str]] = []
    for item in items:
        duplicate_index = next(
            (index for index, existing in enumerate(deduped) if semantically_same_news_event(item, existing)),
            None,
        )
        if duplicate_index is not None:
            existing = deduped[duplicate_index]
            if news_dedupe_priority(item) > news_dedupe_priority(existing):
                deduped[duplicate_index] = item
            continue
        deduped.append(item)
    return deduped


def display_news_by_status(
    items: list[dict[str, str]],
    status: str,
    *,
    limit: int,
    retention_days: int,
    reference_time: datetime,
) -> list[dict[str, str]]:
    filtered = [
        item
        for item in dedupe_news_items(items)
        if item["reportingStatus"] == status and within_retention_window(item, reference_time=reference_time, retention_days=retention_days)
    ]
    filtered.sort(key=lambda item: (news_importance_score(item), parse_iso_datetime(item["publishedAt"])), reverse=True)
    selected = filtered[:limit]
    selected.sort(key=lambda item: parse_iso_datetime(item["publishedAt"]), reverse=True)
    return selected


def select_display_news_items(
    official_items: list[dict[str, str]],
    rumor_items: list[dict[str, str]],
    *,
    official_limit: int,
    rumor_limit: int,
    retention_days: int = DEFAULT_RETENTION_DAYS,
    reference_time: datetime | None = None,
) -> list[dict[str, str]]:
    reference_time = reference_time or datetime.now(timezone.utc)
    items = dedupe_news_items([*official_items, *rumor_items])
    selected = [
        *display_news_by_status(items, "Official", limit=official_limit, retention_days=retention_days, reference_time=reference_time),
        *display_news_by_status(items, "Rumor", limit=rumor_limit, retention_days=retention_days, reference_time=reference_time),
    ]
    selected.sort(key=lambda item: parse_iso_datetime(item["publishedAt"]), reverse=True)
    return selected


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source-url", default=NBA_NEWS_URL)
    parser.add_argument("--output", type=Path, default=DEFAULT_OUTPUT)
    parser.add_argument("--limit", "--official-limit", dest="official_limit", type=int, default=DEFAULT_OFFICIAL_LIMIT, help="Official NBA.com items to display.")
    parser.add_argument("--rumor-limit", type=int, default=DEFAULT_RUMOR_LIMIT, help="Trusted rumor items to display.")
    parser.add_argument("--retention-days", type=int, default=DEFAULT_RETENTION_DAYS, help="Rolling news window to keep in the generated feed.")
    parser.add_argument("--skip-rumors", action="store_true", help="Only refresh NBA.com official news.")
    parser.add_argument("--require-rumors", action="store_true", help="Fail if trusted rumor sources cannot be refreshed.")
    parser.add_argument("--dry-run", action="store_true", help="Print refreshed JSON instead of writing it.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        if args.retention_days < 1:
            raise RuntimeError("--retention-days must be at least 1")

        official_fetch_limit = max(args.official_limit * 4, args.official_limit, 20)
        rumor_fetch_limit = max(args.rumor_limit * 4, args.rumor_limit, 20)
        reference_time = datetime.now(timezone.utc)
        official_payload = refresh_news(args.source_url, limit=official_fetch_limit)
        rumor_payload = [] if args.skip_rumors else refresh_trusted_rumor_news(
            TRUSTED_RUMOR_SOURCES,
            limit=rumor_fetch_limit,
            allow_failures=not args.require_rumors,
        )
        payload = select_display_news_items(
            official_payload,
            rumor_payload,
            official_limit=args.official_limit,
            rumor_limit=0 if args.skip_rumors else args.rumor_limit,
            retention_days=args.retention_days,
            reference_time=reference_time,
        )
        official_count = sum(1 for item in payload if item["reportingStatus"] == "Official")
        rumor_count = sum(1 for item in payload if item["reportingStatus"] == "Rumor")
        if official_count == 0:
            raise RuntimeError(f"NBA.com news refresh produced no official items from the last {args.retention_days} days")
        if args.require_rumors and not args.skip_rumors and rumor_count == 0:
            raise RuntimeError(f"Trusted rumor refresh produced no rumor items from the last {args.retention_days} days")
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
        "retentionDays": args.retention_days,
        "source": args.source_url,
        "latest": payload[0]["publishedAt"] if payload else None,
    }, indent=2))


if __name__ == "__main__":
    main()
