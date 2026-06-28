import { describe, expect, it } from "vitest";
import { absoluteUrl, getSiteUrl, siteName, siteTitle } from "./site";

describe("site URL configuration", () => {
  it("uses ShotClock brand constants", () => {
    expect(siteName).toBe("ShotClock");
    expect(siteTitle).toBe("ShotClock Advanced Basketball Analytics");
  });

  it("uses the production Railway domain when no custom domain is configured", () => {
    expect(getSiteUrl({})).toBe("https://basketball-savant-production.up.railway.app");
  });

  it("normalizes a configured canonical domain", () => {
    const env = { NEXT_PUBLIC_SITE_URL: "https://www.example.com/path" };
    expect(getSiteUrl(env)).toBe("https://www.example.com");
    expect(absoluteUrl("/players/luka-doncic", env)).toBe("https://www.example.com/players/luka-doncic");
  });

  it("falls back safely when the configured URL is invalid", () => {
    expect(getSiteUrl({ NEXT_PUBLIC_SITE_URL: "not a url" })).toBe("https://basketball-savant-production.up.railway.app");
  });
});
