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

describe("NBA news refresh", () => {
  it("refreshes from NBA.com on a daily noon Phoenix schedule", () => {
    const workflow = readFileSync(".github/workflows/news-refresh.yml", "utf8");
    const script = readFileSync("scripts/refresh_nba_news.py", "utf8");

    expect(workflow).toContain('cron: "0 19 * * *"');
    expect(workflow).toContain("python scripts/refresh_nba_news.py");
    expect(workflow).toContain("src/lib/data/news.json");
    expect(script).toContain("https://www.nba.com/news");
    expect(script).toContain("__NEXT_DATA__");
    expect(script).toContain("validate_source_url");
  });

  runIfPython("is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "basketball-savant-pycache-"));
    const result = spawnSync(pythonCommand!, ["-m", "py_compile", "scripts/refresh_nba_news.py"], {
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
