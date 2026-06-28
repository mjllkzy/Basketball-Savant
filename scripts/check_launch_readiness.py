#!/usr/bin/env python3
"""Validate launch-facing production health, SEO, and domain readiness."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any


DEFAULT_BASE_URL = "https://basketball-savant-production.up.railway.app"
REQUEST_TIMEOUT_SECONDS = 30
MAX_RESPONSE_SECONDS = 8.0
SECURITY_HEADER_REQUIREMENTS = {
    "x-content-type-options": "nosniff",
    "x-frame-options": "DENY",
    "referrer-policy": "strict-origin-when-cross-origin",
    "cross-origin-opener-policy": "same-origin",
    "strict-transport-security": "max-age=31536000; includeSubDomains",
}
SECURITY_HEADER_CONTAINS = {
    "permissions-policy": ("camera=()", "microphone=()", "geolocation=()"),
}


@dataclass
class CheckResult:
    path: str
    status: int
    elapsed_seconds: float
    bytes_received: int
    content_type: str


def request(base_url: str, path: str) -> tuple[CheckResult, bytes]:
    result, body, _headers = request_with_headers(base_url, path)
    return result, body


def request_with_headers(base_url: str, path: str) -> tuple[CheckResult, bytes, dict[str, str]]:
    started = time.perf_counter()
    request_object = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        headers={"User-Agent": "Basketball-Savant-Launch-Readiness/1.0"},
    )
    with urllib.request.urlopen(request_object, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        body = response.read()
        headers = {key.lower(): value for key, value in response.headers.items()}
        result = CheckResult(
            path=path,
            status=response.status,
            elapsed_seconds=round(time.perf_counter() - started, 3),
            bytes_received=len(body),
            content_type=headers.get("content-type", ""),
        )

    if result.status != 200:
        raise RuntimeError(f"{path} returned HTTP {result.status}")
    if result.elapsed_seconds > MAX_RESPONSE_SECONDS:
        raise RuntimeError(f"{path} exceeded {MAX_RESPONSE_SECONDS:.1f}s: {result.elapsed_seconds:.3f}s")
    return result, body, headers


def json_request(base_url: str, path: str) -> tuple[CheckResult, dict[str, Any]]:
    result, body = request(base_url, path)
    return result, json.loads(body)


def text_request(base_url: str, path: str) -> tuple[CheckResult, str]:
    result, body = request(base_url, path)
    return result, body.decode("utf-8", "replace")


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def require_contains(text: str, needle: str, path: str) -> None:
    require(needle in text, f"{path} does not contain expected text: {needle}")


def validate_health(base_url: str, expected_commit: str | None) -> tuple[CheckResult, dict[str, Any]]:
    result, payload = json_request(base_url, "/api/health")
    health = payload["data"]
    database = health["database"]

    require(health["status"] == "ok", f"Service health is {health['status']}")
    require(database["status"] == "connected", f"Database status is {database['status']}")
    require(database["schemaReady"] and database["dataReady"], "Database schema or ingestion is not ready")
    require(health["players"] >= 500, f"Player count is too low: {health['players']}")
    require(health["teams"] == 30, f"Expected 30 teams, found {health['teams']}")
    require(health["games"] >= 1_000, f"Game count is too low: {health['games']}")
    require(health["shots"] >= 100_000, f"Shot count is too low: {health['shots']}")
    source_hash = health.get("coverage", {}).get("sourceWorkbookSha256", "")
    require(re.fullmatch(r"[0-9a-f]{64}", source_hash) is not None, "Missing valid source workbook SHA-256")

    if expected_commit:
        release = str(health.get("release") or "")
        require(
            release == expected_commit or release.startswith(expected_commit[:12]),
            f"Expected release {expected_commit}, found {release or 'unknown'}",
        )

    return result, health


def validate_security_headers(base_url: str) -> CheckResult:
    result, _body, headers = request_with_headers(base_url, "/")

    for header_name, expected_value in SECURITY_HEADER_REQUIREMENTS.items():
        actual_value = headers.get(header_name, "").strip()
        require(
            actual_value == expected_value,
            f"/ is missing required {header_name} header value {expected_value!r}; found {actual_value!r}",
        )

    for header_name, required_parts in SECURITY_HEADER_CONTAINS.items():
        actual_value = headers.get(header_name, "")
        missing_parts = [part for part in required_parts if part not in actual_value]
        require(
            not missing_parts,
            f"/ is missing required {header_name} policy values: {', '.join(missing_parts)}",
        )

    return result


def validate_seo(base_url: str) -> list[CheckResult]:
    results: list[CheckResult] = []
    normalized_base = base_url.rstrip("/")

    robots_result, robots = text_request(base_url, "/robots.txt")
    results.append(robots_result)
    require_contains(robots, "User-Agent: *", "/robots.txt")
    require_contains(robots, "Disallow: /api/", "/robots.txt")
    require_contains(robots, f"Sitemap: {normalized_base}/sitemap.xml", "/robots.txt")

    sitemap_result, sitemap = text_request(base_url, "/sitemap.xml")
    results.append(sitemap_result)
    require("application/xml" in sitemap_result.content_type, "sitemap.xml did not return XML content")
    for path in ["/", "/players", "/teams", "/compare", "/similarity", "/players/luka-doncic", "/teams/los-angeles-lakers"]:
        require_contains(sitemap, f"{normalized_base}{path}", "/sitemap.xml")

    manifest_result, manifest = json_request(base_url, "/manifest.webmanifest")
    results.append(manifest_result)
    require(manifest.get("name") == "ShotClock Advanced Basketball Analytics", "Manifest name is not ShotClock Advanced Basketball Analytics")
    require(manifest.get("short_name") == "ShotClock", "Manifest short_name is not ShotClock")
    require(manifest.get("start_url") == "/", "Manifest start_url is not /")

    page_checks = [
        ("/", "ShotClock"),
        ("/players", "Players"),
        ("/teams", "Teams"),
        ("/compare", "Compare"),
        ("/similarity", "Similarity"),
    ]
    for path, expected in page_checks:
        result, html = text_request(base_url, path)
        results.append(result)
        require_contains(html, expected, path)
        require_contains(html, "ShotClock", path)
        if path == "/":
            require_contains(html, 'type="application/ld+json"', path)
            require_contains(html, '"@type":"WebSite"', path)
            require_contains(html, '"@type":"SearchAction"', path)
            require_contains(html, '"@type":"SportsOrganization"', path)

    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("BASKETBALL_SAVANT_URL", DEFAULT_BASE_URL))
    parser.add_argument("--expected-commit", default=os.environ.get("EXPECTED_COMMIT", ""))
    parser.add_argument(
        "--require-custom-domain",
        action="store_true",
        help="Fail when the configured base URL is still the Railway service domain.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_url = args.base_url.rstrip("/")

    try:
        if args.require_custom_domain:
            require(".up.railway.app" not in base_url, "Custom domain is required but base URL is still a Railway domain")

        results: list[CheckResult] = []
        health_result, health = validate_health(base_url, args.expected_commit.strip() or None)
        results.append(health_result)
        results.append(validate_security_headers(base_url))
        results.extend(validate_seo(base_url))
    except (KeyError, OSError, urllib.error.URLError, ValueError, RuntimeError) as error:
        print(f"Launch readiness check failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    print(json.dumps({
        "base_url": base_url,
        "release": health.get("release"),
        "version": health.get("version"),
        "players": health.get("players"),
        "teams": health.get("teams"),
        "games": health.get("games"),
        "shots": health.get("shots"),
        "checks": [asdict(result) for result in results],
        "slowest_seconds": max(result.elapsed_seconds for result in results),
    }, indent=2))


if __name__ == "__main__":
    main()
