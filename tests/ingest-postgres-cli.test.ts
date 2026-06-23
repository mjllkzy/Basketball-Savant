import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

import { describe, expect, it } from "vitest";

function findPythonCommand(): string | null {
  for (const candidate of ["python3", "python"]) {
    const result = spawnSync(candidate, ["--version"], { encoding: "utf8" });
    if (result.status === 0) {
      return candidate;
    }
  }
  return null;
}

describe("Excel ingestion Postgres CLI safety", () => {
  it("keeps Postgres writes behind an explicit flag", () => {
    const script = readFileSync("scripts/ingest_nba_excel.py", "utf8");

    expect(script).toContain("--write-postgres");
    expect(script).toContain("args.write_postgres");
    expect(script).toContain("DATABASE_URL is not set");
  });

  const pythonCommand = findPythonCommand();
  const runIfPython = pythonCommand ? it : it.skip;

  runIfPython("fails clearly when --write-postgres is used without DATABASE_URL", () => {
    const env = { ...process.env };
    delete env.DATABASE_URL;

    const result = spawnSync(pythonCommand!, ["scripts/ingest_nba_excel.py", "--write-postgres"], {
      cwd: process.cwd(),
      env,
      encoding: "utf8",
    });

    const combinedOutput = `${result.stdout}\n${result.stderr}`;
    expect(result.status).toBe(2);
    expect(result.stderr).toContain("DATABASE_URL is not set");
    expect(combinedOutput).not.toContain("Traceback");
  });
});
