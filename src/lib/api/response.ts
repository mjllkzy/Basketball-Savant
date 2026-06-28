import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { captureServerException } from "@/lib/telemetry/sentry.server";

export const PUBLIC_DATA_CACHE_CONTROL = "public, s-maxage=300, stale-while-revalidate=3600";
export const SHORT_DATA_CACHE_CONTROL = "public, s-maxage=60, stale-while-revalidate=300";
export const STATIC_DATA_CACHE_CONTROL = "public, s-maxage=3600, stale-while-revalidate=86400";
export const NO_STORE_CACHE_CONTROL = "no-store";

type ResponseOptions = {
  cacheControl?: string;
};

export function ok<T>(data: T, meta?: Record<string, unknown>, options: ResponseOptions = {}) {
  const response = NextResponse.json({ data, meta });
  if (options.cacheControl) response.headers.set("Cache-Control", options.cacheControl);
  return response;
}

export function cachedOk<T>(data: T, meta?: Record<string, unknown>, cacheControl = PUBLIC_DATA_CACHE_CONTROL) {
  return ok(data, meta, { cacheControl });
}

export function notFound(message = "Record not found") {
  return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message } }, { status: 404 });
}

export function unauthorized(message = "Authentication required") {
  return NextResponse.json({ data: null, error: { code: "UNAUTHORIZED", message } }, { status: 401 });
}

export function payloadTooLarge(message = "Request body is too large") {
  return NextResponse.json({ data: null, error: { code: "PAYLOAD_TOO_LARGE", message } }, { status: 413 });
}

export function badRequest(error: unknown) {
  if (error instanceof ZodError) {
    return NextResponse.json(
      { data: null, error: { code: "BAD_REQUEST", message: "Invalid query parameters", details: error.flatten() } },
      { status: 400 }
    );
  }
  return NextResponse.json({ data: null, error: { code: "BAD_REQUEST", message: "Invalid request" } }, { status: 400 });
}

function normalizeError(error: unknown) {
  if (error instanceof Error) return error;
  if (typeof error === "string" && error.trim()) return new Error(error.trim());
  return new Error("Unknown API server error");
}

export function serverError(error: unknown, context: Record<string, unknown> = {}) {
  console.error("API server error", error);
  void captureServerException(normalizeError(error), {
    source: "api_response_helper",
    ...context,
  }).catch(() => undefined);
  return NextResponse.json(
    { data: null, error: { code: "SERVER_ERROR", message: "Unexpected server error" } },
    { status: 500 }
  );
}
