import { NextResponse } from "next/server";
import { ZodError } from "zod";

export function ok<T>(data: T, meta?: Record<string, unknown>) {
  return NextResponse.json({ data, meta });
}

export function notFound(message = "Record not found") {
  return NextResponse.json({ data: null, error: { code: "NOT_FOUND", message } }, { status: 404 });
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

export function serverError(error: unknown) {
  const message = error instanceof Error ? error.message : "Unexpected error";
  return NextResponse.json({ data: null, error: { code: "SERVER_ERROR", message } }, { status: 500 });
}
