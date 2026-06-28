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

describe("production smoke monitoring", () => {
  it("checks live database-backed APIs and canonical pages", () => {
    const script = readFileSync("scripts/smoke_production.py", "utf8");

    expect(script).toContain("https://shotclockbb.com");
    expect(script).toContain("/api/health");
    expect(script).toContain("/api/players");
    expect(script).toContain("/api/teams");
    expect(script).toContain("/api/leaderboards");
    expect(script).toContain("/api/games");
    expect(script).toContain("/players/luka-doncic");
    expect(script).toContain("/teams/los-angeles-lakers");
    expect(script).toContain("EXPECTED_COMMIT");
    expect(script).toContain("MAX_RESPONSE_SECONDS");
  });

  it("runs after successful CI deployments and on a recurring schedule", () => {
    const workflow = readFileSync(".github/workflows/production-smoke.yml", "utf8");

    expect(workflow).toContain("workflow_run:");
    expect(workflow).toContain('cron: "17 * * * *"');
    expect(workflow).toContain("workflow_run.conclusion == 'success'");
    expect(workflow).toContain("--wait-seconds 600");
    expect(workflow).toContain("scripts/check_launch_readiness.py");
  });

  const pythonCommand = findPythonCommand();
  const runIfPython = pythonCommand ? it : it.skip;

  runIfPython("is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "shotclock-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/smoke_production.py"], {
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
