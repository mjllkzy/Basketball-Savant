import { describe, expect, it } from "vitest";
import { absoluteUrl, getSiteUrl, siteName, siteTitle } from "./site";

describe("site URL configuration", () => {
  it("uses ShotClock brand constants", () => {
    expect(siteName).toBe("ShotClock");
    expect(siteTitle).toBe("ShotClock Advanced Basketball Analytics");
  });

  it("uses the public ShotClock domain when no custom domain is configured", () => {
    expect(getSiteUrl({})).toBe("https://shotclockbb.com");
  });

  it("normalizes a configured canonical domain", () => {
    const env = { NEXT_PUBLIC_SITE_URL: "https://shotclockbb.com/path" };
    expect(getSiteUrl(env)).toBe("https://shotclockbb.com");
    expect(absoluteUrl("/players/luka-doncic", env)).toBe("https://shotclockbb.com/players/luka-doncic");
  });

  it("falls back safely when the configured URL is invalid", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "not a url" })).toBe("https://shotclockbb.com");
  });
});
