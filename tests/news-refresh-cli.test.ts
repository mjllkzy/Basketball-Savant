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
    expect(script).toContain("DEFAULT_RETENTION_DAYS = 3");
    expect(script).toContain("__NEXT_DATA__");
    expect(script).toContain("validate_source_url");
    expect(script).toContain("reportingStatus");
    expect(script).toContain("summarize_title");
    expect(script).toContain("summarize_description");
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

  runIfPython("keeps separate 10-item official and rumor windows while dropping stale extras", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "from datetime import datetime, timedelta, timezone",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "now = datetime(2026, 6, 28, 12, 0, tzinfo=timezone.utc)",
      "stamp = lambda hours: (now - timedelta(hours=hours)).isoformat(timespec='milliseconds').replace('+00:00','Z')",
      "official = [{'id':f'official-{i}','title':f'Official trade item {i}','category':'Trade','reportingStatus':'Official','publishedAt':stamp(i),'sourceName':'NBA.com','sourceUrl':f'https://www.nba.com/news/official-{i}','summary':'Official NBA.com item summary.'} for i in range(12)]",
      "rumors = [{'id':f'rumor-{i}','title':f'Rumor trade item {i}','category':'Trade','reportingStatus':'Rumor','publishedAt':stamp(i),'sourceName':'Hoops Rumors','sourceUrl':f'https://www.hoopsrumors.com/2026/06/rumor-{i}.html','summary':'Trusted rumor item summary.'} for i in range(12)]",
      "official.append({'id':'old-official','title':'Old official blockbuster trade','category':'Trade','reportingStatus':'Official','publishedAt':stamp(100),'sourceName':'NBA.com','sourceUrl':'https://www.nba.com/news/old-official','summary':'Old official item summary.'})",
      "rumors.append({'id':'old-rumor','title':'Old rumor blockbuster trade','category':'Trade','reportingStatus':'Rumor','publishedAt':stamp(100),'sourceName':'Hoops Rumors','sourceUrl':'https://www.hoopsrumors.com/2026/06/old-rumor.html','summary':'Old rumor item summary.'})",
      "selected = module.select_display_news_items(official, rumors, official_limit=10, rumor_limit=10, retention_days=3, reference_time=now)",
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
    expect(selected.some((item) => item.id === "old-official" || item.id === "old-rumor")).toBe(false);
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

  runIfPython("classifies completed trusted-source trades as Official status", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "feed = '''<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><item><title>Hornets Trading Miles Bridges To Suns</title><link>https://www.hoopsrumors.com/2026/06/hornets-trading-miles-bridges-to-suns.html</link><pubDate>Sun, 28 Jun 2026 18:00:23 +0000</pubDate><category>Transactions</category><description><![CDATA[The Hornets and Suns have agreed to a trade. The 2029 first-round pick headed to Phoenix.]]></description></item></channel></rss>'''",
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
    const item = JSON.parse(result.stdout) as { category: string; reportingStatus: string; title: string };
    expect(item).toEqual(expect.objectContaining({
      category: "Trade",
      reportingStatus: "Official",
      title: "Miles Bridges-to-Suns Trade Is Official"
    }));
  });

  runIfPython("classifies reached-agreement trusted-source trades as Official status", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "feed = '''<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><item><title>Celtics To Trade Jaylen Brown To Sixers For Paul George, Picks</title><link>https://www.hoopsrumors.com/2026/07/celtics-to-trade-jaylen-brown-to-sixers-for-paul-george-picks.html</link><pubDate>Wed, 01 Jul 2026 22:18:22 +0000</pubDate><category>Trade Rumors</category><description><![CDATA[Two Atlantic Division rivals have reached an agreement on a blockbuster trade.]]></description></item></channel></rss>'''",
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
    const item = JSON.parse(result.stdout) as { category: string; reportingStatus: string; title: string };
    expect(item).toEqual(expect.objectContaining({
      category: "Trade",
      reportingStatus: "Official",
      title: "Celtics To Trade Jaylen Brown To Sixers For Paul George, Picks"
    }));
  });

  runIfPython("promotes NBA.com rumor-category posts to Official when a deal is decided", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "articles = [",
      "  {'status':'publish','slug':'kevin-huerter-pistons-deal','title':'Reports: Kevin Huerter plans to re-sign with Pistons','permalink':'https://www.nba.com/news/kevin-huerter-pistons-deal','date':'2026-06-29T23:30:00Z','categoryPrimary':{'name':'NBA Rumors'},'excerpt':\"NBA.com, citing ESPN's Shams Charania and The Athletic, reports Kevin Huerter plans to return to Detroit on a three-year, $27 million deal.\"},",
      "  {'status':'publish','slug':'landry-shamet-knicks-deal','title':'Reports: Landry Shamet, Knicks agree to 4-year deal','permalink':'https://www.nba.com/news/landry-shamet-knicks-deal','date':'2026-06-29T21:41:00Z','categoryPrimary':{'name':'NBA Rumors'},'excerpt':\"NBA.com, citing ESPN's Shams Charania and The Athletic, reports Landry Shamet intends to return to the Knicks on a four-year, $24 million deal.\"},",
      "  {'status':'publish','slug':'thomas-bryant-cavs-deal','title':'Report: Cavs agree to 1-year deal with Thomas Bryant','permalink':'https://www.nba.com/news/thomas-bryant-cavs-deal','date':'2026-06-29T20:59:00Z','categoryPrimary':{'name':'NBA Rumors'},'excerpt':\"NBA.com, citing ESPN's Shams Charania, reports veteran center Thomas Bryant intends to return to Cleveland on a one-year contract.\"},",
      "  {'status':'publish','slug':'kawhi-leonard-raptors-clippers-trade','title':'Kawhi Leonard returns to Raptors in reported Clippers trade','permalink':'https://www.nba.com/news/kawhi-leonard-raptors-clippers-trade','date':'2026-07-01T17:30:00Z','categoryPrimary':{'name':'NBA Rumors'},'excerpt':'NBA.com analyzes the ESPN-reported deal sending Kawhi Leonard back to Toronto for Brandon Ingram, Gradey Dick and a package of draft picks.'},",
      "  {'status':'publish','slug':'thunder-exercise-dort-option','title':'Thunder exercise team option for Luguentz Dort','permalink':'https://www.nba.com/news/thunder-exercise-dort-option','date':'2026-06-30T02:59:54Z','categoryPrimary':{'name':'NBA Rumors'},'excerpt':'Oklahoma City exercised a team option for swingman Luguentz Dort.'},",
      "  {'status':'publish','slug':'bucks-ford-hire','title':'Bucks plan to hire T.J. Ford','permalink':'https://www.nba.com/news/bucks-ford-hire','date':'2026-06-30T03:18:57Z','categoryPrimary':{'name':'NBA Rumors'},'excerpt':'The Bucks plan to hire former NBA point guard T.J. Ford as part of Taylor Jenkins coaching staff.'},",
      "]",
      "items = [module.article_to_news_item(article).to_json() for article in articles]",
      "print(json.dumps(items))"
    ].join("\n");

    const result = spawnSync(pythonCommand!, ["-c", script], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    const items = JSON.parse(result.stdout) as Array<{ category: string; reportingStatus: string; title: string }>;
    expect(items).toHaveLength(6);
    expect(items.every((item) => item.reportingStatus === "Official")).toBe(true);
    expect(items.find((item) => item.title.includes("Kawhi Leonard"))).toEqual(expect.objectContaining({
      category: "Trade",
      reportingStatus: "Official"
    }));
  });

  runIfPython("keeps undecided transaction chatter as Rumor status", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "article = {'status':'publish','slug':'jaylen-brown-trade-rumors','title':'Report: Celtics shopping Jaylen Brown','permalink':'https://www.nba.com/news/jaylen-brown-trade-rumors','date':'2026-06-29T18:30:00Z','categoryPrimary':{'name':'NBA Rumors'},'excerpt':'Several teams are monitoring whether Boston could discuss a Jaylen Brown trade, but no deal has been agreed to.'}",
      "item = module.article_to_news_item(article)",
      "print(json.dumps(item.to_json()))"
    ].join("\n");

    const result = spawnSync(pythonCommand!, ["-c", script], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    const item = JSON.parse(result.stdout) as { reportingStatus: string };
    expect(item.reportingStatus).toBe("Rumor");
  });

  runIfPython("prefers NBA.com official coverage over a matching trusted-source duplicate", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "from datetime import datetime, timezone",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "now = datetime(2026, 6, 28, 20, 0, tzinfo=timezone.utc)",
      "feed = '''<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><item><title>Hornets Trading Miles Bridges To Suns</title><link>https://www.hoopsrumors.com/2026/06/hornets-trading-miles-bridges-to-suns.html</link><pubDate>Sun, 28 Jun 2026 18:00:23 +0000</pubDate><category>Transactions</category><description><![CDATA[The Hornets and Suns have agreed to a trade. The 2029 first-round pick headed to Phoenix.]]></description></item></channel></rss>'''",
      "source = module.TRUSTED_RUMOR_SOURCES[0]",
      "root = module.ET.fromstring(feed)",
      "duplicate = module.rss_item_to_news_item(root.find('./channel/item'), source).to_json()",
      "official = {'id':'miles-bridges-trade-hornets-suns','title':'Miles Bridges-to-Suns Trade Brings Back Grayson Allen','category':'Trade','reportingStatus':'Official','publishedAt':'2026-06-28T17:58:08.000Z','sourceName':'NBA.com','sourceUrl':'https://www.nba.com/news/miles-bridges-trade-hornets-suns','summary':\"Hornets reportedly deal Miles Bridges and picks to Suns for Grayson Allen, Royce O'Neale and a future first round pick.\"}",
      "selected = module.select_display_news_items([official], [duplicate], official_limit=10, rumor_limit=10, retention_days=3, reference_time=now)",
      "print(json.dumps({'duplicate': duplicate, 'selected': selected}))"
    ].join("\n");

    const result = spawnSync(pythonCommand!, ["-c", script], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      duplicate: { id: string; reportingStatus: string };
      selected: Array<{ id: string; sourceName: string; reportingStatus: string }>;
    };
    expect(parsed.duplicate.reportingStatus).toBe("Official");
    expect(parsed.selected).toHaveLength(1);
    expect(parsed.selected[0]).toEqual(expect.objectContaining({
      id: "miles-bridges-trade-hornets-suns",
      sourceName: "NBA.com",
      reportingStatus: "Official"
    }));
    expect(parsed.selected.some((item) => item.id === parsed.duplicate.id)).toBe(false);
  });

  runIfPython("cleans imported headlines and summaries before writing news cards", () => {
    const script = [
      "import importlib.util, json, pathlib, sys",
      "spec = importlib.util.spec_from_file_location('refresh_nba_news', pathlib.Path('scripts/refresh_nba_news.py').resolve())",
      "module = importlib.util.module_from_spec(spec)",
      "sys.modules[spec.name] = module",
      "spec.loader.exec_module(module)",
      "article = {'status':'publish','slug':'celtics-sign-ron-harper-jr-to-extension','title':'Reports: Celtics re-sign Ron Harper Jr. to long-term extension','permalink':'https://www.nba.com/news/celtics-sign-ron-harper-jr-to-extension','date':'2026-06-27T18:45:06Z','excerpt':'Former Two-Way guard Ron Harper Jr. reportedly signs three-year extension to remain with Celtics, according to NBA.com.'}",
      "feed = '''<?xml version=\"1.0\" encoding=\"UTF-8\"?><rss version=\"2.0\"><channel><item><title>Stein/Fischer’s Latest: Nuggets, Mamukelashvili, Hachimura, More</title><link>https://www.hoopsrumors.com/2026/06/stein-fischers-latest-nuggets-mamukelashvili-hachimura-more.html</link><pubDate>Sun, 28 Jun 2026 04:06:31 +0000</pubDate><category>Trade</category><description><![CDATA[While the Nuggets have had internal discussions about whether they can trade for Jaylen Brown, they are not currently viewed as a landing spot, sources tell The Stein Line (Twitter link). More...]]></description></item></channel></rss>'''",
      "source = module.TRUSTED_RUMOR_SOURCES[0]",
      "root = module.ET.fromstring(feed)",
      "official = module.article_to_news_item(article).to_json()",
      "rumor = module.rss_item_to_news_item(root.find('./channel/item'), source).to_json()",
      "kawhi = module.summarize_title('Raptors, Clippers Discussing Kawhi Leonard Trade', summary='The Raptors and Clippers have been talking this weekend about a trade that would send Kawhi Leonard back to Toronto.', category='Trade', reporting_status='Rumor')",
      "print(json.dumps({'official': official, 'rumor': rumor, 'kawhi': kawhi}))"
    ].join("\n");

    const result = spawnSync(pythonCommand!, ["-c", script], {
      cwd: process.cwd(),
      encoding: "utf8"
    });

    expect(result.status).toBe(0);
    const parsed = JSON.parse(result.stdout) as {
      official: { title: string; summary: string };
      rumor: { title: string; summary: string };
      kawhi: string;
    };
    expect(parsed.official.title).toBe("Celtics re-sign Ron Harper Jr. to long-term extension");
    expect(parsed.official.summary).toBe("Former Two-Way guard Ron Harper Jr. reportedly signs three-year extension to remain with Celtics.");
    expect(parsed.rumor.title).toBe("Jaylen Brown-to-Nuggets Trade Rumors Swirl");
    expect(parsed.kawhi).toBe("Kawhi Leonard-to-Raptors Trade Rumors Heat Up");
    expect(parsed.rumor.summary.length).toBeLessThanOrEqual(155);
    expect(parsed.rumor.summary).not.toMatch(/sources tell|Twitter|More/i);
  });
});
