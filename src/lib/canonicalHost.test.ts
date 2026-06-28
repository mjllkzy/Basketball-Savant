import { describe, expect, it } from "vitest";
import { isLegacyHost, legacyHostRedirectUrl, shouldRedirectLegacyHostRequest } from "./canonicalHost";

describe("canonical host redirects", () => {
  it("recognizes the legacy Railway service host", () => {
    expect(isLegacyHost("basketball-savant-production.up.railway.app")).toBe(true);
    expect(isLegacyHost("basketball-savant-production.up.railway.app:443")).toBe(true);
    expect(isLegacyHost("shotclockbb.com")).toBe(false);
  });

  it("redirects legacy page traffic to the configured ShotClock domain", () => {
    expect(legacyHostRedirectUrl({
      requestUrl: "https://basketball-savant-production.up.railway.app/players?teamId=1610612747",
      method: "GET",
      hostHeader: "basketball-savant-production.up.railway.app",
      env: { NEXT_PUBLIC_SITE_URL: "https://shotclockbb.com" }
    })).toBe("https://shotclockbb.com/players?teamId=1610612747");
  });

  it("preserves APIs, Next assets, and non-idempotent requests on the legacy host", () => {
    expect(shouldRedirectLegacyHostRequest({
      method: "GET",
      pathname: "/api/health",
      hostHeader: "basketball-savant-production.up.railway.app"
    })).toBe(false);
    expect(shouldRedirectLegacyHostRequest({
      method: "GET",
      pathname: "/_next/static/chunk.js",
      hostHeader: "basketball-savant-production.up.railway.app"
    })).toBe(false);
    expect(shouldRedirectLegacyHostRequest({
      method: "POST",
      pathname: "/search",
      hostHeader: "basketball-savant-production.up.railway.app"
    })).toBe(false);
  });

  it("does not redirect canonical-domain traffic", () => {
    expect(legacyHostRedirectUrl({
      requestUrl: "https://shotclockbb.com/players",
      method: "GET",
      hostHeader: "shotclockbb.com",
      env: { NEXT_PUBLIC_SITE_URL: "https://shotclockbb.com" }
    })).toBeNull();
  });
});
