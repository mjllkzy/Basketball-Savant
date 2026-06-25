import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

function findPythonCommand(): string | null {
  for (const candidate of ["python3", "python"]) {
    if (spawnSync(candidate, ["--version"], { encoding: "utf8" }).status === 0) return candidate;
  }
  return null;
}

describe("production refresh CLI safety", () => {
  it("keeps database writes explicit and checksum-aware", () => {
    const script = readFileSync("scripts/refresh_production_data.py", "utf8");

    expect(script).toContain("--write-postgres");
    expect(script).toContain("--force");
    expect(script).toContain("source_workbook_sha256");
    expect(script).toContain("skipped_unchanged");
    expect(script).toContain("current_team_season_summaries");
  });

  const pythonCommand = findPythonCommand();
  const runIfPython = pythonCommand ? it : it.skip;

  runIfPython("fails clearly when a database write is requested without DATABASE_URL", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;
    const result = spawnSync(pythonCommand!, ["scripts/refresh_production_data.py", "--write-postgres"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    expect(result.status).toBe(2);
    expect(result.stderr).toContain("DATABASE_URL is required");
    expect(`${result.stdout}\n${result.stderr}`).not.toContain("Traceback");
  }, 15_000);
});
