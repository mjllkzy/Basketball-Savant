import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
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
    expect(script).toContain("reportingStatus");
    expect(script).toContain("Official");
  });

  runIfPython("is valid Python", () => {
    const pycacheDirectory = mkdtempSync(join(tmpdir(), "shotclock-pycache-"));
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

  runIfPython("preserves source-backed external rumor items during refresh merges", () => {
    const tempDirectory = mkdtempSync(join(tmpdir(), "shotclock-news-"));
    const outputPath = join(tempDirectory, "news.json");
    writeFileSync(outputPath, JSON.stringify([
      {
        id: "trusted-rumor",
        title: "Trusted insider reports a developing player market",
        category: "Rumor",
        reportingStatus: "Rumor",
        publishedAt: "2026-06-28T12:00:00.000Z",
        sourceName: "Trusted NBA Insider",
        sourceUrl: "https://example.com/nba/trusted-rumor",
        summary: "A sourced report from a trusted NBA insider is still awaiting official team or league confirmation."
      },
      {
        id: "stale-nba",
        title: "Old NBA.com item should be refreshed away",
        category: "League",
        reportingStatus: "Official",
        publishedAt: "2026-06-20T12:00:00.000Z",
        sourceName: "NBA.com",
        sourceUrl: "https://www.nba.com/news/old-nba-item",
        summary: "This existing NBA.com item should not be preserved separately from the fresh NBA.com payload."
      }
    ]));

    const script = [
      "import importlib.util, json, pathlib, sys",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "primary = [{'id':'official','title':'Official item','category':'League','reportingStatus':'Official','publishedAt':'2026-06-27T12:00:00.000Z','sourceName':'NBA.com','sourceUrl':'https://www.nba.com/news/official-item','summary':'Official NBA.com item summary.'}]",
      "preserved = module.load_preserved_external_items(pathlib.Path(sys.argv[1]))",
      "print(json.dumps(module.merge_news_items(primary, preserved, limit=4)))"
    ].join("\n");

    const result = spawnSync(pythonCommand!, ["-c", script, outputPath], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    const merged = JSON.parse(result.stdout) as Array<{ id: string; reportingStatus: string; sourceName: string }>;
    expect(merged).toEqual([
      expect.objectContaining({ id: "trusted-rumor", reportingStatus: "Rumor", sourceName: "Trusted NBA Insider" }),
      expect.objectContaining({ id: "official", reportingStatus: "Official", sourceName: "NBA.com" })
    ]);
  });
});
