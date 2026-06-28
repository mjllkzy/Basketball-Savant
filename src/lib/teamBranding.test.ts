import { describe, expect, it } from "vitest";
import { nbaTeamLogoUrl } from "./teamBranding";

describe("team branding helpers", () => {
  it("uses the versioned official Rockets logo so cached old marks are bypassed", () => {
    expect(nbaTeamLogoUrl("1610612745")).toBe("https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg?v=2026-06-04");
  });

  it("uses the standard NBA CDN logo path for other teams", () => {
    expect(nbaTeamLogoUrl("1610612747")).toBe("https://cdn.nba.com/logos/nba/1610612747/primary/L/logo.svg");
  });
});
