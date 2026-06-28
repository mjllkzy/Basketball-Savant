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

describe("production load check CLI", () => {
  it("runs after production smoke, on schedule, and on demand", () => {
    const workflow = readFileSync(".github/workflows/production-load-check.yml", "utf8");

    expect(workflow).toContain("workflow_run:");
    expect(workflow).toContain("Production Smoke");
    expect(workflow).toContain('cron: "37 12 * * *"');
    expect(workflow).toContain("scripts/load_check_production.py");
    expect(workflow).toContain("--wait-seconds 600");
    expect(workflow).toContain("--rounds 3");
    expect(workflow).toContain("--concurrency 4");
    expect(workflow).toContain("--max-p95-seconds 3");
  });

  it("checks core Postgres APIs and canonical pages", () => {
    const script = readFileSync("scripts/load_check_production.py", "utf8");

    expect(script).toContain("/api/health");
    expect(script).toContain("/api/players");
    expect(script).toContain("/api/teams");
    expect(script).toContain("/api/leaderboards");
    expect(script).toContain("/api/games");
    expect(script).toContain("/players/luka-doncic");
    expect(script).toContain("/teams/los-angeles-lakers");
    expect(script).toContain("ThreadPoolExecutor");
    expect(script).toContain("--max-p95-seconds");
    expect(script).toContain("MAX_BYTES_BY_PATH");
    expect(script).toContain("max_bytes_allowed");
    expect(script).toContain("--disable-byte-budgets");
  });

  const pythonCommand = findPythonCommand();
  const runIfPython = pythonCommand ? it : it.skip;

  runIfPython("is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "basketball-savant-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/load_check_production.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPYCACHEPREFIX: pycacheDirectory,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });
});
