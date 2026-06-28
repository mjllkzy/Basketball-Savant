#!/usr/bin/env python3
"""Validate production health, data sources, core routes, and response latency."""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
import urllib.error
import urllib.request
from dataclasses import asdict, dataclass
from typing import Any


DEFAULT_BASE_URL = "https://basketball-savant-production.up.railway.app"
REQUEST_TIMEOUT_SECONDS = 30
MAX_RESPONSE_SECONDS = 8.0


@dataclass
class CheckResult:
    path: str
    status: int
    elapsed_seconds: float
    bytes_received: int


def request(base_url: str, path: str) -> tuple[CheckResult, bytes]:
    started = time.perf_counter()
    request_object = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        headers={"User-Agent": "Basketball-Savant-Production-Smoke/1.0"},
    )
    with urllib.request.urlopen(request_object, timeout=REQUEST_TIMEOUT_SECONDS) as response:
        body = response.read()
        result = CheckResult(
            path=path,
            status=response.status,
            elapsed_seconds=round(time.perf_counter() - started, 3),
            bytes_received=len(body),
        )
    if result.status != 200:
        raise RuntimeError(f"{path} returned HTTP {result.status}")
    if result.elapsed_seconds > MAX_RESPONSE_SECONDS:
        raise RuntimeError(f"{path} exceeded {MAX_RESPONSE_SECONDS:.1f}s: {result.elapsed_seconds:.3f}s")
    return result, body


def json_request(base_url: str, path: str) -> tuple[CheckResult, dict[str, Any]]:
    result, body = request(base_url, path)
    return result, json.loads(body)


def require(condition: bool, message: str) -> None:
    if not condition:
        raise RuntimeError(message)


def wait_for_release(base_url: str, expected_commit: str, wait_seconds: int) -> None:
    if not expected_commit:
        return
    deadline = time.monotonic() + max(0, wait_seconds)
    while True:
        try:
            _, payload = json_request(base_url, "/api/health")
            release = str(payload.get("data", {}).get("release") or "")
            if release == expected_commit or release.startswith(expected_commit[:12]):
                return
            current = release or "unknown"
        except (OSError, ValueError, RuntimeError) as error:
            current = f"unavailable ({error})"
        if time.monotonic() >= deadline:
            raise RuntimeError(
                f"Production did not deploy expected commit {expected_commit}; current release is {current}."
            )
        print(f"Waiting for Railway deploy {expected_commit[:12]}; current release: {current}", flush=True)
        time.sleep(15)


def validate(base_url: str) -> list[CheckResult]:
    results: list[CheckResult] = []

    health_result, health_payload = json_request(base_url, "/api/health")
    results.append(health_result)
    health = health_payload["data"]
    database = health["database"]
    require(health["status"] == "ok", f"Service health is {health['status']}")
    require(database["status"] == "connected", f"Database status is {database['status']}")
    require(database["schemaReady"] and database["dataReady"], "Database schema or ingestion is not ready")
    require(health["players"] >= 500, f"Player count is too low: {health['players']}")
    require(health["teams"] == 30, f"Expected 30 teams, found {health['teams']}")
    require(health["games"] >= 1_000, f"Game count is too low: {health['games']}")
    require(health["shots"] >= 100_000, f"Shot count is too low: {health['shots']}")

    api_checks = [
        ("/api/players?pageSize=1&sort=pts&order=desc&minGames=30", "meta"),
        ("/api/teams?pageSize=1", "meta"),
        ("/api/leaderboards?metric=pts&limit=1&minGames=30", "meta"),
        ("/api/games?pageSize=1", "meta"),
    ]
    for path, metadata_key in api_checks:
        result, payload = json_request(base_url, path)
        results.append(result)
        require(bool(payload.get("data")), f"{path} returned no data")
        source = payload.get(metadata_key, {}).get("source")
        require(source == "postgres", f"{path} used {source or 'unknown'} instead of Postgres")

    page_checks = [
        ("/", b"ShotClock"),
        ("/players/luka-doncic", "Luka Don".encode()),
        ("/teams/los-angeles-lakers", b"Los Angeles Lakers"),
        ("/visuals", b"Visualization Studio"),
    ]
    for path, expected in page_checks:
        result, body = request(base_url, path)
        results.append(result)
        require(expected in body, f"{path} did not contain expected page content")

    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--base-url", default=os.environ.get("BASKETBALL_SAVANT_URL", DEFAULT_BASE_URL))
    parser.add_argument("--expected-commit", default=os.environ.get("EXPECTED_COMMIT", ""))
    parser.add_argument("--wait-seconds", type=int, default=0)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    try:
        wait_for_release(args.base_url, args.expected_commit.strip(), args.wait_seconds)
        results = validate(args.base_url)
    except (KeyError, OSError, urllib.error.URLError, ValueError, RuntimeError) as error:
        print(f"Production smoke failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    print(json.dumps({
        "base_url": args.base_url,
        "checks": [asdict(result) for result in results],
        "slowest_seconds": max(result.elapsed_seconds for result in results),
    }, indent=2))


if __name__ == "__main__":
    main()
