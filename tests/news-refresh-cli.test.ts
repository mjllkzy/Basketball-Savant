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

describe("basketball news refresh", () => {
  it("refreshes NBA.com and trusted rumor sources on a daily noon Phoenix schedule", () => {
    const workflow = readFileSync(".github/workflows/news-refresh.yml", "utf8");
    const script = readFileSync("scripts/refresh_nba_news.py", "utf8");

    expect(workflow).toContain('cron: "0 19 * * *"');
    expect(workflow).toContain("python scripts/refresh_nba_news.py --require-rumors");
    expect(workflow).toContain("src/lib/data/news.json");
    expect(workflow).toContain("Refresh NBA.com and trusted rumor news data");
    expect(script).toContain("https://www.nba.com/news");
    expect(script).toContain("https://www.hoopsrumors.com/feed");
    expect(script).toContain("DEFAULT_OFFICIAL_LIMIT = 10");
    expect(script).toContain("DEFAULT_RUMOR_LIMIT = 10");
    expect(script).toContain("__NEXT_DATA__");
    expect(script).toContain("validate_source_url");
    expect(script).toContain("reportingStatus");
    expect(script).toContain("Official");
    expect(script).toContain("Rumor");
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

  runIfPython("keeps separate 10-item official and rumor windows while dropping older extras", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "official = [{'id':f'official-{i}','title':f'Official item {i}','category':'League','reportingStatus':'Official','publishedAt':f'2026-06-{28-i:02d}T12:00:00.000Z','sourceName':'NBA.com','sourceUrl':f'https://www.nba.com/news/official-{i}','summary':'Official NBA.com item summary.'} for i in range(12)]",
      "rumors = [{'id':f'rumor-{i}','title':f'Rumor item {i}','category':'Rumor','reportingStatus':'Rumor','publishedAt':f'2026-06-{28-i:02d}T06:00:00.000Z','sourceName':'Hoops Rumors','sourceUrl':f'https://www.hoopsrumors.com/2026/06/rumor-{i}.html','summary':'Trusted rumor item summary.'} for i in range(12)]",
      "selected = module.select_display_news_items(official, rumors, official_limit=10, rumor_limit=10)",
      "print(json.dumps(selected))"
    ].join("\n");

    const result = spawnSync(pythonCommand!, ["-c", script], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    const selected = JSON.parse(result.stdout) as Array<{ id: string; reportingStatus: string; publishedAt: string }>;
    expect(selected).toHaveLength(20);
    expect(selected.filter((item) => item.reportingStatus === "Official")).toHaveLength(10);
    expect(selected.filter((item) => item.reportingStatus === "Rumor")).toHaveLength(10);
    expect(selected.some((item) => item.id === "official-10" || item.id === "official-11")).toBe(false);
    expect(selected.some((item) => item.id === "rumor-10" || item.id === "rumor-11")).toBe(false);
    const timestamps = selected.map((item) => new Date(item.publishedAt).getTime());
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  runIfPython("parses trusted RSS rumor items as Rumor status", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "feed = '''<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><item><title>Pacific Notes: Trade Market, Free Agency</title><link>https://www.hoopsrumors.com/2026/06/pacific-notes-trade-market-free-agency.html</link><pubDate>Sun, 28 Jun 2026 04:06:31 +0000</pubDate><category>Free Agents</category><description><![CDATA[Multiple teams are monitoring the market, according to a trusted report.]]></description></item></channel></rss>'''",
      "source = module.TRUSTED_RUMOR_SOURCES[0]",
      "root = module.ET.fromstring(feed)",
      "item = module.rss_item_to_news_item(root.find('./channel/item'), source)",
      "print(json.dumps(item.to_json()))"
    ].join("\n");

    const result = spawnSync(pythonCommand!, ["-c", script], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    const item = JSON.parse(result.stdout) as { category: string; reportingStatus: string; sourceName: string; sourceUrl: string };
    expect(item).toEqual(expect.objectContaining({
      category: "Free Agency",
      reportingStatus: "Rumor",
      sourceName: "Hoops Rumors",
      sourceUrl: "https://www.hoopsrumors.com/2026/06/pacific-notes-trade-market-free-agency.html"
    }));
  });
});
