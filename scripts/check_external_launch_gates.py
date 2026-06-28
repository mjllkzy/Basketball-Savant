#!/usr/bin/env python3
"""Validate external launch gates that require account, DNS, or policy choices."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from dataclasses import asdict, dataclass
from typing import Mapping
from urllib.parse import urlparse


PLACEHOLDER_VALUES = {"", "todo", "tbd", "changeme", "change-me", "placeholder", "example"}
UPTIME_DECISIONS = {"github-smoke-only", "external-monitor"}


@dataclass
class GateResult:
    name: str
    ok: bool
    details: str


def clean(value: str | None) -> str:
    return (value or "").strip()


def is_placeholder(value: str | None) -> bool:
    normalized = clean(value).lower()
    return normalized in PLACEHOLDER_VALUES or normalized.endswith("_here") or normalized.startswith("your_")


def truthy(value: str | None) -> bool:
    return clean(value).lower() in {"1", "true", "yes", "y"}


def first_configured_env(env: Mapping[str, str], *names: str) -> str:
    for name in names:
        value = clean(env.get(name))
        if value:
            return value
    return ""


def require_https_url(value: str, *, allow_railway_domain: bool = False) -> tuple[bool, str]:
    parsed = urlparse(value)
    if parsed.scheme != "https" or not parsed.netloc:
        return False, "must be an HTTPS URL"
    if not allow_railway_domain and parsed.netloc.endswith(".up.railway.app"):
        return False, "must use the chosen public custom domain, not the Railway service domain"
    return True, parsed.netloc


def check_site_url(env: Mapping[str, str], site_url: str, allow_railway_domain: bool) -> GateResult:
    if is_placeholder(site_url):
        return GateResult("custom_domain", False, "NEXT_PUBLIC_SITE_URL or --site-url is missing")
    ok, details = require_https_url(site_url, allow_railway_domain=allow_railway_domain)
    if not ok:
        return GateResult("custom_domain", False, details)
    configured = clean(env.get("NEXT_PUBLIC_SITE_URL"))
    if configured and configured.rstrip("/") != site_url.rstrip("/"):
        return GateResult(
            "custom_domain",
            False,
            "NEXT_PUBLIC_SITE_URL does not match the checked site URL",
        )
    return GateResult("custom_domain", True, f"custom site URL configured for {details}")


def check_sentry(env: Mapping[str, str]) -> list[GateResult]:
    dsn = clean(env.get("SENTRY_DSN"))
    environment = clean(env.get("SENTRY_ENVIRONMENT"))
    results: list[GateResult] = []

    if is_placeholder(dsn):
        results.append(GateResult("sentry_dsn", False, "SENTRY_DSN is missing"))
    elif re.fullmatch(r"https://[^/@\s]+@[^/\s]+/\d+", dsn) is None:
        results.append(GateResult("sentry_dsn", False, "SENTRY_DSN does not look like a Sentry HTTPS DSN"))
    else:
        results.append(GateResult("sentry_dsn", True, "Sentry DSN is configured"))

    if environment != "production":
        results.append(GateResult("sentry_environment", False, "SENTRY_ENVIRONMENT must be production"))
    else:
        results.append(GateResult("sentry_environment", True, "Sentry environment is production"))

    return results


def check_posthog(env: Mapping[str, str]) -> list[GateResult]:
    key = clean(env.get("NEXT_PUBLIC_POSTHOG_KEY"))
    host = clean(env.get("NEXT_PUBLIC_POSTHOG_HOST")) or "https://us.i.posthog.com"
    results: list[GateResult] = []

    if is_placeholder(key):
        results.append(GateResult("posthog_key", False, "NEXT_PUBLIC_POSTHOG_KEY is missing"))
    else:
        results.append(GateResult("posthog_key", True, "PostHog public key is configured"))

    ok, details = require_https_url(host, allow_railway_domain=True)
    if not ok:
        results.append(GateResult("posthog_host", False, f"NEXT_PUBLIC_POSTHOG_HOST {details}"))
    else:
        results.append(GateResult("posthog_host", True, f"PostHog host configured for {details}"))

    return results


def check_backup_policy(env: Mapping[str, str], backup_policy_confirmed: bool) -> GateResult:
    if backup_policy_confirmed or truthy(first_configured_env(
        env,
        "SHOTCLOCK_BACKUP_POLICY_CONFIRMED",
        "BASKETBALL_SAVANT_BACKUP_POLICY_CONFIRMED",
    )):
        return GateResult("backup_policy", True, "backup/PITR policy decision is confirmed")
    return GateResult(
        "backup_policy",
        False,
        "confirm Railway backup/PITR or external backup policy with SHOTCLOCK_BACKUP_POLICY_CONFIRMED=true",
    )


def check_uptime_decision(env: Mapping[str, str]) -> list[GateResult]:
    decision = first_configured_env(
        env,
        "SHOTCLOCK_UPTIME_MONITOR_DECISION",
        "BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION",
    )
    monitor_url = first_configured_env(
        env,
        "SHOTCLOCK_UPTIME_MONITOR_URL",
        "BASKETBALL_SAVANT_UPTIME_MONITOR_URL",
    )

    if decision not in UPTIME_DECISIONS:
        return [
            GateResult(
                "uptime_monitor_decision",
                False,
                "set SHOTCLOCK_UPTIME_MONITOR_DECISION to github-smoke-only or external-monitor",
            )
        ]

    results = [GateResult("uptime_monitor_decision", True, f"uptime decision is {decision}")]
    if decision == "external-monitor":
        if is_placeholder(monitor_url):
            results.append(
                GateResult("uptime_monitor_url", False, "SHOTCLOCK_UPTIME_MONITOR_URL is required")
            )
        else:
            ok, details = require_https_url(monitor_url, allow_railway_domain=True)
            results.append(
                GateResult(
                    "uptime_monitor_url",
                    ok,
                    f"external monitor URL configured for {details}" if ok else f"monitor URL {details}",
                )
            )
    return results


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--site-url",
        default=clean(
            os.environ.get("NEXT_PUBLIC_SITE_URL")
            or os.environ.get("SHOTCLOCK_URL")
            or os.environ.get("BASKETBALL_SAVANT_URL")
        ),
        help="Public canonical site URL to validate. Defaults to NEXT_PUBLIC_SITE_URL.",
    )
    parser.add_argument(
        "--allow-railway-domain",
        action="store_true",
        help="Allow the Railway service domain. Do not use this for final launch validation.",
    )
    parser.add_argument(
        "--backup-policy-confirmed",
        action="store_true",
        help="Treat the backup/PITR policy decision as confirmed for this run.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    env = os.environ
    site_url = clean(args.site_url)

    results: list[GateResult] = [
        check_site_url(env, site_url, args.allow_railway_domain),
        *check_sentry(env),
        *check_posthog(env),
        *check_uptime_decision(env),
        check_backup_policy(env, args.backup_policy_confirmed),
    ]
    failed = [result for result in results if not result.ok]
    status = "ready" if not failed else "not_ready"

    print(json.dumps({
        "status": status,
        "site_url": site_url or None,
        "checks": [asdict(result) for result in results],
        "failed": [result.name for result in failed],
    }, indent=2))

    if failed:
        print(
            "External launch gates are not complete: " + ", ".join(result.name for result in failed),
            file=sys.stderr,
        )
        raise SystemExit(1)


if __name__ == "__main__":
    main()
