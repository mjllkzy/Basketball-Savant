import { describe, expect, it } from "vitest";
import { comparisonRows, heightToInches, positionSimilarity, similarPlayers, statWinner } from "@/lib/comparison";
import { coreNavLinks } from "@/lib/navigation";
import { playerSeasonAggregates } from "@/lib/data/queries";

describe("comparison helpers", () => {
  it("parses NBA height strings", () => {
    expect(heightToInches("6-8")).toBe(80);
    expect(heightToInches("7-0")).toBe(84);
    expect(heightToInches("N/A")).toBeNull();
  });

  it("respects metric direction for winners", () => {
    expect(statWinner(12, 10, true)).toBe("left");
    expect(statWinner(12, 10, false)).toBe("right");
    expect(statWinner(10, 10, true)).toBe("tie");
  });

  it("scores shared positions higher than unrelated positions", () => {
    expect(positionSimilarity("G-F", "F")).toBeGreaterThan(positionSimilarity("G-F", "C"));
  });

  it("builds side-by-side rows and excludes the target from similarity matches", () => {
    const left = playerSeasonAggregates[0];
    const right = playerSeasonAggregates[1];
    expect(comparisonRows(left, right).some((row) => row.key === "ts_pct")).toBe(true);
    const matches = similarPlayers(left, playerSeasonAggregates, 5);
    expect(matches).toHaveLength(5);
    expect(matches.every((match) => match.aggregate.player.id !== left.player.id)).toBe(true);
    expect(matches.every((match) => match.score >= 0 && match.score <= 100)).toBe(true);
  });

  it("keeps core navigation focused on finished product tabs", () => {
    expect(coreNavLinks.map((link) => link.href)).toEqual(["/", "/players", "/teams", "/compare"]);
  });
});
