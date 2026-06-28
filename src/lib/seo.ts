import { absoluteUrl, getSiteUrl, siteDescription, siteName } from "./site";

export function buildStructuredData(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env) {
  const siteUrl = getSiteUrl(env);

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteUrl}/#website`,
        "name": siteName,
        "url": siteUrl,
        "description": siteDescription,
        "inLanguage": "en-US",
        "potentialAction": {
          "@type": "SearchAction",
          "target": `${absoluteUrl("/search", env)}?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        "name": siteName,
        "url": siteUrl,
        "logo": absoluteUrl("/icon", env),
      },
      {
        "@type": "SportsOrganization",
        "@id": `${siteUrl}/#sports-analytics-site`,
        "name": siteName,
        "url": siteUrl,
        "sport": "Basketball",
        "description": siteDescription,
      },
    ],
  };
}

export function structuredDataJson(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env) {
  return JSON.stringify(buildStructuredData(env)).replace(/</g, "\\u003c");
}
