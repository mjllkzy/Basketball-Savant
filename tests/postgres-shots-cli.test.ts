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

describe("Postgres shot ingestion CLI", () => {
  it("targets the compact team shot cache and shot_attempts table", () => {
    const script = readFileSync("scripts/refresh_postgres_shots.py", "utf8");
    const migration = readFileSync("db/migrations/006_shot_attempts.sql", "utf8");
    const workflow = readFileSync(".github/workflows/data-refresh.yml", "utf8");

    expect(script).toContain("team-shot-charts");
    expect(script).toContain("current_ingestion_run");
    expect(script).toContain("shot_attempts");
    expect(migration).toContain("CREATE TABLE IF NOT EXISTS shot_attempts");
    expect(migration).toContain("CREATE OR REPLACE VIEW current_shot_attempts");
    expect(workflow).toContain("scripts/refresh_postgres_shots.py --write-postgres");
  });

  runIfPython("is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "shotclock-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/refresh_postgres_shots.py"], {
      cwd: process.cwd(),
      env: {
        ...process.env,
        PYTHONPYCACHEPREFIX: pycacheDirectory,
      },
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
  });

  runIfPython("validates local shot-cache files without DATABASE_URL", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const result = spawnSync(pythonCommand!, ["scripts/refresh_postgres_shots.py"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    const payload = JSON.parse(result.stdout);
    expect(payload.status).toBe("validated");
    expect(payload.teams).toBe(30);
    expect(payload.shots).toBeGreaterThan(100_000);
  }, 30_000);

  runIfPython("fails clearly when a database write is requested without DATABASE_URL", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const result = spawnSync(pythonCommand!, ["scripts/refresh_postgres_shots.py", "--write-postgres"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("DATABASE_URL is required");
  });
});
