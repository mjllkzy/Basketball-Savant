import { describe, expect, it } from "vitest";
import {
  NEWS_RETENTION_DAYS,
  filterNewsFeed,
  formatNewsDate,
  getRecentNews,
  newsFeed,
  normalizeNewsFilter,
  newsImportanceScore,
  reportingStatusTone,
  selectBiggestNewsLead,
  selectBiggestOfficialNewsLead,
  type NewsItem,
} from "./news";

describe("news feed", () => {
  it("keeps all news items source-backed", () => {
    const ids = new Set(newsFeed.map((item) => item.id));
    expect(ids.size).toBe(newsFeed.length);

    for (const item of newsFeed) {
      expect(item.title.trim().length).toBeGreaterThan(12);
      expect(item.summary.trim().length).toBeGreaterThan(30);
      expect(item.summary).not.toContain("<");
      expect(Number.isFinite(new Date(item.publishedAt).getTime())).toBe(true);
      expect(["Official", "Rumor"]).toContain(item.reportingStatus);
      expect(item.sourceName.trim().length).toBeGreaterThan(3);
      expect(item.sourceUrl).toMatch(/^https:\/\//);
      if (item.sourceName === "NBA.com") {
        expect(item.sourceUrl).toMatch(/^https:\/\/www\.nba\.com\/news\/[a-z0-9-]+$/);
      }
    }
  });

  it("sorts news newest first", () => {
    const timestamps = newsFeed.map((item) => new Date(item.publishedAt).getTime());
    expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
  });

  it("returns a limited homepage preview", () => {
    expect(getRecentNews(3)).toHaveLength(3);
    expect(getRecentNews(3)[0].title).toBe(newsFeed[0].title);
  });

  it("filters official and rumor news explicitly", () => {
    expect(normalizeNewsFilter("official")).toBe("official");
    expect(normalizeNewsFilter("rumors")).toBe("rumors");
    expect(normalizeNewsFilter("bad")).toBe("all");
    expect(filterNewsFeed("official").every((item) => item.reportingStatus === "Official")).toBe(true);
    expect(filterNewsFeed("rumors").every((item) => item.reportingStatus === "Rumor")).toBe(true);
    expect(filterNewsFeed("official").length).toBeGreaterThan(0);
    expect(filterNewsFeed("official").length).toBeLessThanOrEqual(10);
    expect(filterNewsFeed("rumors").length).toBeGreaterThan(0);
    expect(filterNewsFeed("rumors").length).toBeLessThanOrEqual(10);
  });

  it("selects the biggest lead from official news in the rolling window", () => {
    const items: NewsItem[] = [
      {
        id: "recent-rumor",
        title: "Lakers trade rumor dominates the market",
        category: "Trade",
        reportingStatus: "Rumor",
        publishedAt: "2026-06-28T11:00:00.000Z",
        sourceName: "Hoops Rumors",
        sourceUrl: "https://www.hoopsrumors.com/2026/06/lakers-trade.html",
        summary: "A trusted rumor item should not become the official lead.",
      },
      {
        id: "recent-schedule",
        title: "NBA unveils Summer League schedule",
        category: "League",
        reportingStatus: "Official",
        publishedAt: "2026-06-28T10:00:00.000Z",
        sourceName: "NBA.com",
        sourceUrl: "https://www.nba.com/news/summer-league-schedule",
        summary: "The league released scheduling details.",
      },
      {
        id: "official-trade",
        title: "Thunder trade Isaiah Joe to Pistons for picks",
        category: "Trade",
        reportingStatus: "Official",
        publishedAt: "2026-06-27T10:00:00.000Z",
        sourceName: "NBA.com",
        sourceUrl: "https://www.nba.com/news/thunder-trade-isaiah-joe",
        summary: "Oklahoma City completed a roster-shaping trade with Detroit.",
      },
      {
        id: "stale-official",
        title: "Celtics acquire All-Star in older trade",
        category: "Trade",
        reportingStatus: "Official",
        publishedAt: "2026-06-20T10:00:00.000Z",
        sourceName: "NBA.com",
        sourceUrl: "https://www.nba.com/news/stale-trade",
        summary: "This stale official item is outside the rolling window.",
      },
    ];

    const lead = selectBiggestOfficialNewsLead(items, {
      referenceDate: "2026-06-28T12:00:00.000Z",
      withinDays: NEWS_RETENTION_DAYS,
    });

    expect(lead?.id).toBe("official-trade");
    expect(lead?.reportingStatus).toBe("Official");
    expect(newsImportanceScore(lead!)).toBeGreaterThan(newsImportanceScore(items[1]));
  });

  it("selects the biggest lead from the active news filter", () => {
    const items: NewsItem[] = [
      {
        id: "official-signing",
        title: "Bucks sign veteran guard to one-year deal",
        category: "Free Agency",
        reportingStatus: "Official",
        publishedAt: "2026-06-28T11:00:00.000Z",
        sourceName: "NBA.com",
        sourceUrl: "https://www.nba.com/news/bucks-sign-veteran-guard",
        summary: "Milwaukee completed a depth signing on a short contract.",
      },
      {
        id: "rumor-star-trade",
        title: "Warriors star trade rumor heats up before free agency",
        category: "Trade",
        reportingStatus: "Rumor",
        publishedAt: "2026-06-28T10:00:00.000Z",
        sourceName: "Hoops Rumors",
        sourceUrl: "https://www.hoopsrumors.com/2026/06/warriors-star-trade.html",
        summary: "Rival executives are monitoring a potential blockbuster trade path.",
      },
      {
        id: "stale-rumor",
        title: "Older All-Star trade rumor resurfaces",
        category: "Trade",
        reportingStatus: "Rumor",
        publishedAt: "2026-06-20T10:00:00.000Z",
        sourceName: "Hoops Rumors",
        sourceUrl: "https://www.hoopsrumors.com/2026/06/older-trade.html",
        summary: "This older rumor should be outside the rolling window.",
      },
    ];
    const window = {
      referenceDate: "2026-06-28T12:00:00.000Z",
      withinDays: NEWS_RETENTION_DAYS,
    };

    expect(selectBiggestNewsLead(items, "official", window)?.id).toBe("official-signing");
    expect(selectBiggestNewsLead(items, "rumors", window)?.id).toBe("rumor-star-trade");
    expect(selectBiggestNewsLead(items, "all", window)?.id).toBe("rumor-star-trade");
  });

  it("formats dates for fan-facing cards", () => {
    expect(formatNewsDate("2026-06-18T17:22:00.000Z")).toBe("Jun 18, 2026");
  });

  it("styles reporting status badges", () => {
    expect(reportingStatusTone("Official")).toContain("text-slate");
    expect(reportingStatusTone("Rumor")).toContain("text-fuchsia");
  });
});
