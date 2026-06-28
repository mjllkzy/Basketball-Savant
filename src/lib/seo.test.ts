import { describe, expect, it } from "vitest";
import { buildStructuredData, structuredDataJson } from "./seo";

describe("structured SEO data", () => {
  it("describes the site, organization, and basketball analytics surface", () => {
    const payload = buildStructuredData({ NEXT_PUBLIC_SITE_URL: "https://www.shotclockanalytics.com/path" });
    const graph = payload["@graph"];

    expect(graph.map((node) => node["@type"])).toEqual(["WebSite", "Organization", "SportsOrganization"]);
    expect(graph[0]).toMatchObject({
      "@type": "WebSite",
      "url": "https://www.shotclockanalytics.com",
      "potentialAction": {
        "@type": "SearchAction",
        "target": "https://www.shotclockanalytics.com/search?q={search_term_string}",
      },
    });
    expect(graph[1]).toMatchObject({
      "@type": "Organization",
      "logo": "https://www.shotclockanalytics.com/icon",
    });
    expect(graph[2]).toMatchObject({
      "@type": "SportsOrganization",
      "sport": "Basketball",
    });
  });

  it("escapes HTML-breaking characters before script insertion", () => {
    const encoded = structuredDataJson({ NEXT_PUBLIC_SITE_URL: "https://www.shotclockanalytics.com" });
    expect(encoded).toContain('"@context":"https://schema.org"');
    expect(encoded).not.toContain("<");
  });
});
