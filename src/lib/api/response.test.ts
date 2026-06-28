import { afterEach, describe, expect, it, vi } from "vitest";
import {
  NO_STORE_CACHE_CONTROL,
  PUBLIC_DATA_CACHE_CONTROL,
  STATIC_DATA_CACHE_CONTROL,
  cachedOk,
  ok,
  serverError,
} from "./response";

const originalSentryDsn = process.env.SENTRY_DSN;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalSentryDsn === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = originalSentryDsn;
});

describe("API response helpers", () => {
  it("leaves plain ok responses uncached by default", () => {
    const response = ok({ status: "ok" });

    expect(response.headers.get("Cache-Control")).toBeNull();
  });

  it("sets shared cache headers for public data responses", () => {
    const response = cachedOk([{ id: "player" }]);

    expect(response.headers.get("Cache-Control")).toBe(PUBLIC_DATA_CACHE_CONTROL);
  });

  it("supports explicit cache policies for static and no-store responses", () => {
    expect(cachedOk([], undefined, STATIC_DATA_CACHE_CONTROL).headers.get("Cache-Control")).toBe(STATIC_DATA_CACHE_CONTROL);
    expect(ok({ status: "ok" }, undefined, { cacheControl: NO_STORE_CACHE_CONTROL }).headers.get("Cache-Control")).toBe(NO_STORE_CACHE_CONTROL);
  });

  it("keeps internal server error details out of public API responses", async () => {
    delete process.env.SENTRY_DSN;
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);

    try {
      const response = serverError(new Error("database password authentication failed"));
      const payload = await response.json();

      expect(response.status).toBe(500);
      expect(payload.error).toEqual({ code: "SERVER_ERROR", message: "Unexpected server error" });
      expect(JSON.stringify(payload)).not.toContain("password");
      expect(consoleError).toHaveBeenCalled();
    } finally {
      consoleError.mockRestore();
    }
  });

  it("reports API server errors to Sentry when configured", async () => {
    process.env.SENTRY_DSN = "https://public-key@sentry.example.com/42";
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    try {
      const response = serverError(new Error("database unavailable"), { route: "/api/players" });
      const payload = await response.json();

      expect(response.status).toBe(500);
      expect(payload.error.code).toBe("SERVER_ERROR");
      await vi.waitFor(() => expect(fetchMock).toHaveBeenCalled());
      expect(fetchMock).toHaveBeenCalledWith(
        "https://sentry.example.com/api/42/envelope/",
        expect.objectContaining({ method: "POST" }),
      );
      expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("api_response_helper");
      expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("/api/players");
    } finally {
      consoleError.mockRestore();
    }
  });
});
