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

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  outputFileTracingIncludes: {
    "/*": [
      "./src/lib/data/generated/official-snapshot.json",
      "./src/lib/data/generated/master-player-summaries.json",
      "./src/lib/data/generated/team-shot-charts/**/*"
    ]
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
