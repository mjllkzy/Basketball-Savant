import { mkdtempSync, readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function findPythonCommand(): string | null {
  for (const candidate of ["python3", "python"]) {
    if (spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0) return candidate;
  }
  return null;
}

const pythonCommand = findPythonCommand();
const runIfPython = pythonCommand ? it : it.skip;

describe("external launch gate CLI", () => {
  it("has a manual final launch workflow for custom-domain validation", () => {
    const workflow = readFileSync(".github/workflows/final-launch-gates.yml", "utf8");

    expect(workflow).toContain("workflow_dispatch:");
    expect(workflow).toContain("site_url:");
    expect(workflow).toContain("sentry_decision:");
    expect(workflow).toContain("posthog_decision:");
    expect(workflow).toContain("secrets.SENTRY_DSN");
    expect(workflow).toContain("secrets.NEXT_PUBLIC_POSTHOG_KEY");
    expect(workflow).toContain("SHOTCLOCK_SENTRY_DECISION");
    expect(workflow).toContain("SHOTCLOCK_POSTHOG_DECISION");
    expect(workflow).toContain("scripts/check_external_launch_gates.py");
    expect(workflow).toContain("--require-custom-domain");
    expect(workflow).toContain("scripts/load_check_production.py");
    expect(workflow).toContain("--base-url \"$SITE_URL\"");
  });

  it("documents the final account, DNS, analytics, and backup gates", () => {
    const script = readFileSync("scripts/check_external_launch_gates.py", "utf8");

    expect(script).toContain("NEXT_PUBLIC_SITE_URL");
    expect(script).toContain("SENTRY_DSN");
    expect(script).toContain("NEXT_PUBLIC_POSTHOG_KEY");
    expect(script).toContain("SHOTCLOCK_SENTRY_DECISION");
    expect(script).toContain("SHOTCLOCK_POSTHOG_DECISION");
    expect(script).toContain("SHOTCLOCK_BACKUP_POLICY_CONFIRMED");
    expect(script).toContain("SHOTCLOCK_UPTIME_MONITOR_DECISION");
    expect(script).toContain("BASKETBALL_SAVANT_BACKUP_POLICY_CONFIRMED");
    expect(script).toContain("BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION");
  });

  runIfPython("is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "shotclock-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/check_external_launch_gates.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPYCACHEPREFIX: pycacheDirectory,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });

  runIfPython("fails clearly when required external gates are missing", () => {
    const env = { ...process.env };
    delete env.NEXT_PUBLIC_SITE_URL;
    delete env.SHOTCLOCK_URL;
    delete env.BASKETBALL_SAVANT_URL;
    delete env.SENTRY_DSN;
    delete env.SENTRY_ENVIRONMENT;
    delete env.NEXT_PUBLIC_POSTHOG_KEY;
    delete env.NEXT_PUBLIC_POSTHOG_HOST;
    delete env.SHOTCLOCK_SENTRY_DECISION;
    delete env.SHOTCLOCK_POSTHOG_DECISION;
    delete env.SHOTCLOCK_BACKUP_POLICY_CONFIRMED;
    delete env.SHOTCLOCK_UPTIME_MONITOR_DECISION;
    delete env.SHOTCLOCK_UPTIME_MONITOR_URL;
    delete env.BASKETBALL_SAVANT_BACKUP_POLICY_CONFIRMED;
    delete env.BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION;
    delete env.BASKETBALL_SAVANT_UPTIME_MONITOR_URL;

    const result = spawnSync(pythonCommand!, ["scripts/check_external_launch_gates.py"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(1);
    expect(result.stdout).toContain('"status": "not_ready"');
    expect(result.stderr).toContain("External launch gates are not complete");
  });

  runIfPython("passes with complete launch gate inputs", () => {
    const result = spawnSync(pythonCommand!, ["scripts/check_external_launch_gates.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "https://shotclockbb.com",
        SENTRY_DSN: "https://public@sentry.example.com/42",
        SENTRY_ENVIRONMENT: "production",
        NEXT_PUBLIC_POSTHOG_KEY: "phc_test_123",
        NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
        SHOTCLOCK_BACKUP_POLICY_CONFIRMED: "true",
        SHOTCLOCK_UPTIME_MONITOR_DECISION: "github-smoke-only",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"status": "ready"');
  });

  runIfPython("passes when paid telemetry is explicitly deferred", () => {
    const result = spawnSync(pythonCommand!, ["scripts/check_external_launch_gates.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "https://shotclockbb.com",
        SHOTCLOCK_SENTRY_DECISION: "deferred",
        SHOTCLOCK_POSTHOG_DECISION: "deferred",
        SHOTCLOCK_BACKUP_POLICY_CONFIRMED: "true",
        SHOTCLOCK_UPTIME_MONITOR_DECISION: "github-smoke-only",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"status": "ready"');
    expect(result.stdout).toContain('"sentry_decision"');
    expect(result.stdout).toContain('"posthog_decision"');
  });

  runIfPython("accepts legacy Basketball Savant launch gate environment names", () => {
    const result = spawnSync(pythonCommand!, ["scripts/check_external_launch_gates.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_SITE_URL: "https://shotclockbb.com",
        SENTRY_DSN: "https://public@sentry.example.com/42",
        SENTRY_ENVIRONMENT: "production",
        NEXT_PUBLIC_POSTHOG_KEY: "phc_test_123",
        NEXT_PUBLIC_POSTHOG_HOST: "https://us.i.posthog.com",
        BASKETBALL_SAVANT_BACKUP_POLICY_CONFIRMED: "true",
        BASKETBALL_SAVANT_UPTIME_MONITOR_DECISION: "github-smoke-only",
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toContain('"status": "ready"');
  });
});
