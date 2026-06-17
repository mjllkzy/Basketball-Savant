import { describe, expect, it } from "vitest";
import { comparisonRows, heightToInches, playerSimilaritySummary, positionSimilarity, similarityScore, similarPlayers, statWinner } from "@/lib/comparison";
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
    expect(matches.every((match) => match.candidateSummary.ppg >= 0 && match.candidateSummary.ptsPer36 >= 0)).toBe(true);
    expect(matches.every((match) => match.ratioScore >= 0 && match.perMinuteScore >= 0 && match.physicalScore >= 0)).toBe(true);
  });

  it("rewards same-position and similar-build matches when production is held constant", () => {
    const target = playerSeasonAggregates.find((row) => row.games >= 30 && row.minutes >= 500)!;
    const similarBuild = {
      ...target,
      player: {
        ...target.player,
        id: "test-similar-build",
        slug: "test-similar-build",
        name: "Test Similar Build"
      }
    };
    const differentBuild = {
      ...target,
      player: {
        ...target.player,
        id: "test-different-build",
        slug: "test-different-build",
        name: "Test Different Build",
        position: "C",
        height: "7-2",
        weight: target.player.weight + 65
      }
    };

    const rows = [target, similarBuild, differentBuild];
    expect(similarityScore(target, similarBuild, rows).score).toBeGreaterThan(similarityScore(target, differentBuild, rows).score);
  });

  it("summarizes player physicals and box production for the similarity UI", () => {
    const summary = playerSimilaritySummary(playerSeasonAggregates[0]);
    expect(summary.height).toMatch(/^\d-\d{1,2}$/);
    expect(summary.weight).toContain("lb");
    expect(summary.wingspan).toBe("Not loaded");
    expect(summary.ppg).toBeGreaterThanOrEqual(0);
    expect(summary.apg).toBeGreaterThanOrEqual(0);
    expect(summary.rpg).toBeGreaterThanOrEqual(0);
  });

  it("keeps core navigation focused on finished product tabs", () => {
    expect(coreNavLinks.map((link) => link.href)).toEqual(["/", "/players", "/teams", "/compare"]);
  });
});
