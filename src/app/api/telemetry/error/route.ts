import { NextResponse } from "next/server";
import { z } from "zod";
import { captureServerException, hasSentryDsn } from "@/lib/telemetry/sentry.server";

export const runtime = "nodejs";

const payloadSchema = z.object({
  message: z.string().min(1).max(500),
  digest: z.string().max(200).optional(),
  pathname: z.string().max(500).optional(),
});

const requestsByAddress = new Map<string, { count: number; resetAt: number }>();
const rateLimitWindowMs = 60_000;
const maxRequestsPerWindow = 10;

function allowRequest(request: Request) {
  const address = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  const now = Date.now();
  const existing = requestsByAddress.get(address);
  if (!existing || existing.resetAt <= now) {
    requestsByAddress.set(address, { count: 1, resetAt: now + rateLimitWindowMs });
    return true;
  }
  if (existing.count >= maxRequestsPerWindow) return false;
  existing.count += 1;
  return true;
}

export async function POST(request: Request) {
  if (!hasSentryDsn()) return new NextResponse(null, { status: 204 });
  if (!allowRequest(request)) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  const contentLength = Number(request.headers.get("content-length") ?? 0);
  if (contentLength > 2_000) return NextResponse.json({ error: "Payload too large" }, { status: 413 });

  const parsed = payloadSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid error payload" }, { status: 400 });

  await captureServerException(new Error(parsed.data.message), {
    source: "global_error_boundary",
    digest: parsed.data.digest,
    pathname: parsed.data.pathname,
  });
  return new NextResponse(null, { status: 202 });
}
