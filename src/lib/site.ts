const fallbackSiteUrl = "https://shotclockbb.com";

export const siteName = "ShotClock";
export const siteTitle = "ShotClock Advanced Basketball Analytics";
export const siteDescription = "NBA player, team, comparison, and similarity analysis powered by the 2025-26 ShotClock masterfile.";

export function getSiteUrl(env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env) {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!configured) return fallbackSiteUrl;

  try {
    const url = new URL(configured);
    return url.origin;
  } catch {
    return fallbackSiteUrl;
  }
}

export function absoluteUrl(pathname = "/", env: NodeJS.ProcessEnv | Record<string, string | undefined> = process.env) {
  return new URL(pathname, `${getSiteUrl(env)}/`).toString();
}
