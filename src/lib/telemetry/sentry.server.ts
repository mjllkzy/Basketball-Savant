import { randomUUID } from "node:crypto";

if (typeof window !== "undefined") {
  throw new Error("src/lib/telemetry/sentry.server.ts can only be imported on the server.");
}

type SentryEndpoint = {
  dsn: string;
  envelopeUrl: string;
};

function getSentryEndpoint(dsnValue = process.env.SENTRY_DSN?.trim()): SentryEndpoint | null {
  if (!dsnValue) return null;

  try {
    const url = new URL(dsnValue);
    const pathParts = url.pathname.split("/").filter(Boolean);
    const projectId = pathParts.pop();
    if (!url.username || !projectId) return null;

    const pathPrefix = pathParts.length ? `/${pathParts.join("/")}` : "";
    return {
      dsn: dsnValue,
      envelopeUrl: `${url.protocol}//${url.host}${pathPrefix}/api/${projectId}/envelope/`,
    };
  } catch {
    return null;
  }
}

export function hasSentryDsn() {
  return getSentryEndpoint() !== null;
}

export async function captureServerException(error: Error, context: Record<string, unknown> = {}) {
  const endpoint = getSentryEndpoint();
  if (!endpoint) return false;

  const eventId = randomUUID().replaceAll("-", "");
  const sentAt = new Date().toISOString();
  const envelopeHeader = {
    event_id: eventId,
    sent_at: sentAt,
    dsn: endpoint.dsn,
    sdk: { name: "shotclock.server", version: "1.0.0" },
  };
  const event = {
    event_id: eventId,
    timestamp: sentAt,
    platform: "node",
    level: "error",
    environment: process.env.SENTRY_ENVIRONMENT ?? process.env.NODE_ENV ?? "production",
    release: process.env.RAILWAY_GIT_COMMIT_SHA,
    exception: {
      values: [
        {
          type: error.name || "Error",
          value: error.message,
        },
      ],
    },
    extra: {
      ...context,
      stack: error.stack,
    },
  };
  const envelope = [
    JSON.stringify(envelopeHeader),
    JSON.stringify({ type: "event" }),
    JSON.stringify(event),
  ].join("\n");

  try {
    const response = await fetch(endpoint.envelopeUrl, {
      method: "POST",
      headers: { "content-type": "application/x-sentry-envelope" },
      body: envelope,
      signal: AbortSignal.timeout(2_000),
    });
    return response.ok;
  } catch {
    return false;
  }
}
