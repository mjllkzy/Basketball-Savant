import { describe, expect, it } from "vitest";
import { formatNewsDate, getRecentNews, newsFeed } from "./news";

describe("news feed", () => {
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
});
