import { describe, expect, it } from "vitest";
import { formatNewsDate, getRecentNews, newsFeed, reportingStatusTone } from "./news";

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

  it("formats dates for fan-facing cards", () => {
    expect(formatNewsDate("2026-06-18T17:22:00.000Z")).toBe("Jun 18, 2026");
  });

  it("styles reporting status badges", () => {
    expect(reportingStatusTone("Official")).toContain("text-slate");
    expect(reportingStatusTone("Rumor")).toContain("text-fuchsia");
  });
});
