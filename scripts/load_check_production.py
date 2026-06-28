#!/usr/bin/env python3
"""Run a conservative production load check against core ShotClock routes."""

from __future__ import annotations

import argparse
import json
import os
import statistics
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed
from dataclasses import asdict, dataclass
from typing import Any


DEFAULT_BASE_URL = "https://basketball-savant-production.up.railway.app"
REQUEST_TIMEOUT_SECONDS = 30
USER_AGENT = "ShotClock-Production-Load-Check/1.0"
DEFAULT_PATHS = [
    "/api/health",
    "/api/players?pageSize=25&sort=pts&order=desc&minGames=30",
    "/api/teams?pageSize=30",
    "/api/leaderboards?metric=pts&limit=25&minGames=30",
    "/api/games?pageSize=10",
    "/",
    "/players",
    "/teams",
    "/compare",
    "/players/luka-doncic",
    "/teams/los-angeles-lakers",
    "/similarity",
]
MAX_BYTES_BY_PATH = {
    "/api/health": 15_000,
    "/api/players?pageSize=25&sort=pts&order=desc&minGames=30": 100_000,
    "/api/teams?pageSize=30": 25_000,
    "/api/leaderboards?metric=pts&limit=25&minGames=30": 120_000,
    "/api/games?pageSize=10": 50_000,
    "/": 100_000,
    "/players": 450_000,
    "/teams": 200_000,
    "/compare": 100_000,
    "/players/luka-doncic": 300_000,
    "/teams/los-angeles-lakers": 400_000,
    "/similarity": 300_000,
}


@dataclass
class RequestResult:
    path: str
    status: int | None
    elapsed_seconds: float
    bytes_received: int
    error: str | None = None


def percentile(values: list[float], percentile_rank: float) -> float:
    if not values:
        return 0.0
    if len(values) == 1:
        return values[0]
    ordered = sorted(values)
    position = (len(ordered) - 1) * percentile_rank
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    weight = position - lower
    return ordered[lower] * (1 - weight) + ordered[upper] * weight


def request(base_url: str, path: str) -> RequestResult:
    started = time.perf_counter()
    request_object = urllib.request.Request(
        f"{base_url.rstrip('/')}{path}",
        headers={"User-Agent": USER_AGENT},
    )
    try:
        with urllib.request.urlopen(request_object, timeout=REQUEST_TIMEOUT_SECONDS) as response:
            body = response.read()
            elapsed = round(time.perf_counter() - started, 3)
            return RequestResult(path=path, status=response.status, elapsed_seconds=elapsed, bytes_received=len(body))
    except (OSError, urllib.error.URLError, urllib.error.HTTPError) as error:
        elapsed = round(time.perf_counter() - started, 3)
        status = getattr(error, "code", None)
        return RequestResult(path=path, status=status, elapsed_seconds=elapsed, bytes_received=0, error=str(error))


def wait_for_release(base_url: str, expected_commit: str, wait_seconds: int) -> None:
    if not expected_commit:
        return
    deadline = time.monotonic() + max(0, wait_seconds)
    while True:
        result = request(base_url, "/api/health")
        current = "unknown"
        if result.status == 200 and result.error is None:
            try:
                request_object = urllib.request.Request(
                    f"{base_url.rstrip('/')}/api/health",
                    headers={"User-Agent": USER_AGENT},
                )
                with urllib.request.urlopen(request_object, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                    payload = json.loads(response.read())
                current = str(payload.get("data", {}).get("release") or "unknown")
                if current == expected_commit or current.startswith(expected_commit[:12]):
                    return
            except (OSError, ValueError, urllib.error.URLError):
                current = "unavailable"
        elif result.error:
            current = f"unavailable ({result.error})"

        if time.monotonic() >= deadline:
            raise RuntimeError(f"Production did not deploy expected commit {expected_commit}; current release is {current}.")
        print(f"Waiting for Railway deploy {expected_commit[:12]}; current release: {current}", flush=True)
        time.sleep(15)


def summarize(results: list[RequestResult]) -> dict[str, Any]:
    by_path: dict[str, list[RequestResult]] = {}
    for result in results:
        by_path.setdefault(result.path, []).append(result)

    summaries = []
    for path, path_results in sorted(by_path.items()):
        timings = [result.elapsed_seconds for result in path_results if result.status == 200 and result.error is None]
        failures = [result for result in path_results if result.status != 200 or result.error is not None]
        summaries.append({
            "path": path,
            "requests": len(path_results),
            "failures": len(failures),
            "p50_seconds": round(statistics.median(timings), 3) if timings else None,
            "p95_seconds": round(percentile(timings, 0.95), 3) if timings else None,
            "max_seconds": round(max(timings), 3) if timings else None,
            "bytes_min": min((result.bytes_received for result in path_results), default=0),
            "bytes_max": max((result.bytes_received for result in path_results), default=0),
            "max_bytes_allowed": MAX_BYTES_BY_PATH.get(path),
        })
    return {
        "requests": len(results),
        "failures": sum(1 for result in results if result.status != 200 or result.error is not None),
        "paths": summaries,
    }


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--base-url",
        default=os.environ.get("SHOTCLOCK_URL") or os.environ.get("BASKETBALL_SAVANT_URL", DEFAULT_BASE_URL),
    )
    parser.add_argument("--expected-commit", default=os.environ.get("EXPECTED_COMMIT", ""))
    parser.add_argument("--wait-seconds", type=int, default=0)
    parser.add_argument("--rounds", type=int, default=3, help="Number of times each core route is requested.")
    parser.add_argument("--concurrency", type=int, default=4, help="Maximum concurrent requests.")
    parser.add_argument("--max-p95-seconds", type=float, default=3.0)
    parser.add_argument("--max-failure-rate", type=float, default=0.0)
    parser.add_argument(
        "--disable-byte-budgets",
        action="store_true",
        help="Skip response-size regression checks for intentional one-off investigations.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    base_url = args.base_url.rstrip("/")
    rounds = max(1, args.rounds)
    concurrency = max(1, args.concurrency)
    paths = DEFAULT_PATHS * rounds

    try:
        wait_for_release(base_url, args.expected_commit.strip(), args.wait_seconds)
    except RuntimeError as error:
        print(f"Production load check failed: {error}", file=sys.stderr)
        raise SystemExit(1) from error

    results: list[RequestResult] = []
    with ThreadPoolExecutor(max_workers=concurrency) as executor:
        futures = [executor.submit(request, base_url, path) for path in paths]
        for future in as_completed(futures):
            results.append(future.result())

    summary = summarize(results)
    failure_rate = summary["failures"] / summary["requests"] if summary["requests"] else 1.0
    slow_paths = [
        path_summary for path_summary in summary["paths"]
        if path_summary["p95_seconds"] is None or path_summary["p95_seconds"] > args.max_p95_seconds
    ]
    oversized_paths = [] if args.disable_byte_budgets else [
        path_summary for path_summary in summary["paths"]
        if (
            path_summary["max_bytes_allowed"] is not None
            and path_summary["bytes_max"] > path_summary["max_bytes_allowed"]
        )
    ]
    status = "ok" if failure_rate <= args.max_failure_rate and not slow_paths and not oversized_paths else "failed"
    output = {
        "status": status,
        "base_url": base_url,
        "rounds": rounds,
        "concurrency": concurrency,
        "max_p95_seconds": args.max_p95_seconds,
        "max_failure_rate": args.max_failure_rate,
        "byte_budgets_enabled": not args.disable_byte_budgets,
        "failure_rate": round(failure_rate, 4),
        **summary,
    }
    print(json.dumps(output, indent=2))

    if status != "ok":
        failures = [asdict(result) for result in results if result.status != 200 or result.error is not None][:10]
        print(
            json.dumps({
                "slow_paths": slow_paths,
                "oversized_paths": oversized_paths,
                "sample_failures": failures,
            }, indent=2),
            file=sys.stderr,
        )
        raise SystemExit(1)


if __name__ == "__main__":
    main()
