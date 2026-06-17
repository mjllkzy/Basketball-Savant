import { describe, expect, it } from "vitest";
import { normalizeVisualTab, visualTabs } from "@/lib/visuals";

describe("visual tab routing", () => {
  it("keeps supported visual tabs stable", () => {
    for (const tab of visualTabs) {
      expect(normalizeVisualTab(tab)).toBe(tab);
    }
  });

  it("maps retired empty-feed tabs to useful destinations", () => {
    expect(normalizeVisualTab("Rolling Trend")).toBe("Player Trends");
    expect(normalizeVisualTab("Team Style Map")).toBe("Team Style");
    expect(normalizeVisualTab("Shot Chart")).toBe("Data Coverage");
    expect(normalizeVisualTab("Pass Map")).toBe("Data Coverage");
  });

  it("defaults unknown tabs to overview", () => {
    expect(normalizeVisualTab()).toBe("Overview");
    expect(normalizeVisualTab("Not A Real Tab")).toBe("Overview");
  });
});
