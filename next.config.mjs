function configuredOrigin(value) {
  if (!value) return null;
  try {
    return new URL(value).origin;
  } catch {
    return null;
  }
}

const posthogOrigin = configuredOrigin(process.env.NEXT_PUBLIC_POSTHOG_HOST) ?? "https://us.i.posthog.com";
const analyticsConnectOrigins = Array.from(new Set([
  posthogOrigin,
  "https://us.i.posthog.com",
  "https://eu.i.posthog.com",
  "https://*.posthog.com",
])).join(" ");
const scriptPolicy = process.env.NODE_ENV === "production"
  ? "'self' 'unsafe-inline'"
  : "'self' 'unsafe-inline' 'unsafe-eval'";
const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  `script-src ${scriptPolicy}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://cdn.nba.com",
  "font-src 'self' data:",
  `connect-src 'self' ${analyticsConnectOrigins}`,
  "manifest-src 'self'",
].join("; ");

const lightweightFallbackFiles = [
  "./src/lib/data/generated/runtime-fallbacks.json",
  "./data/raw/player_contracts_2025_2031.json",
  "./data/raw/player_contract_deals_2025_2031.json"
];

const fullStatsDataFiles = [
  ...lightweightFallbackFiles,
  "./src/lib/data/generated/official-snapshot.json",
  "./src/lib/data/generated/master-player-summaries.json",
  "./src/lib/data/generated/team-shot-charts/**/*"
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": lightweightFallbackFiles,
    "/api/**/*": fullStatsDataFiles,
    "/api/v1/**/*": fullStatsDataFiles,
    "/games": fullStatsDataFiles,
    "/games/[gameId]": fullStatsDataFiles,
    "/leaderboards": fullStatsDataFiles,
    "/leaderboards/custom": fullStatsDataFiles,
    "/players": fullStatsDataFiles,
    "/players/[playerId]": fullStatsDataFiles,
    "/search": fullStatsDataFiles,
    "/similarity": fullStatsDataFiles,
    "/teams": fullStatsDataFiles,
    "/teams/[teamId]": fullStatsDataFiles,
    "/visuals": fullStatsDataFiles
  },
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "cdn.nba.com"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/brand/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }
        ]
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
          { key: "Content-Security-Policy", value: contentSecurityPolicy },
          { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }
        ]
      }
    ];
  }
};

export default nextConfig;
