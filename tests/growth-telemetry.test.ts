import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("growth telemetry", () => {
  it("captures privacy-safe interaction events when PostHog is configured", () => {
    const telemetry = readFileSync("src/components/analytics/Telemetry.tsx", "utf8");

    expect(telemetry).toContain("navigation_click");
    expect(telemetry).toContain("outbound_link_click");
    expect(telemetry).toContain("current_path: window.location.pathname");
    expect(telemetry).toContain("target_path: sanitizedPathname(target)");
    expect(telemetry).toContain("target_domain");
    expect(telemetry).not.toContain("target.search");
    expect(telemetry).not.toContain("target.href");
  });
});
