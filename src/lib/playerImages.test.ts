import { describe, expect, it } from "vitest";
import { blankPlayerHeadshotUrl, nbaPlayerHeadshotUrl } from "./playerImages";

describe("player image helpers", () => {
  it("builds official NBA CDN headshot URLs for NBA Stats player IDs", () => {
    expect(nbaPlayerHeadshotUrl("1629216")).toBe("https://cdn.nba.com/headshots/nba/latest/1040x760/1629216.png");
  });

  it("uses the blank placeholder for non-NBA generated player IDs", () => {
    expect(nbaPlayerHeadshotUrl("ply-atl-01")).toBe(blankPlayerHeadshotUrl);
  });
});
