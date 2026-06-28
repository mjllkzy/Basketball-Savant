import { getSiteUrl } from "./site";

const legacyHosts = new Set(["basketball-savant-production.up.railway.app"]);
const preservedPathPrefixes = ["/api/", "/_next/", "/favicon.ico"];
const redirectMethods = new Set(["GET", "HEAD"]);

export function isLegacyHost(hostHeader: string | null | undefined) {
  const host = hostHeader?.split(":")[0]?.toLowerCase();
  return Boolean(host && legacyHosts.has(host));
}

export function shouldRedirectLegacyHostRequest(input: {
  method: string;
  pathname: string;
  hostHeader?: string | null;
}) {
  if (!redirectMethods.has(input.method.toUpperCase())) return false;
  if (!isLegacyHost(input.hostHeader)) return false;
  return !preservedPathPrefixes.some((prefix) => input.pathname === prefix.slice(0, -1) || input.pathname.startsWith(prefix));
}

export function legacyHostRedirectUrl(input: {
  requestUrl: string | URL;
  method: string;
  hostHeader?: string | null;
  env?: NodeJS.ProcessEnv | Record<string, string | undefined>;
}) {
  const requestUrl = new URL(input.requestUrl);
  if (!shouldRedirectLegacyHostRequest({
    method: input.method,
    pathname: requestUrl.pathname,
    hostHeader: input.hostHeader ?? requestUrl.host
  })) {
    return null;
  }

  const canonicalUrl = new URL(requestUrl.pathname + requestUrl.search, getSiteUrl(input.env));
  return canonicalUrl.toString();
}
