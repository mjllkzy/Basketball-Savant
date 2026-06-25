import { afterEach, describe, expect, it, vi } from "vitest";
import { captureServerException, hasSentryDsn } from "./sentry.server";

const originalDsn = process.env.SENTRY_DSN;

afterEach(() => {
  vi.unstubAllGlobals();
  if (originalDsn === undefined) delete process.env.SENTRY_DSN;
  else process.env.SENTRY_DSN = originalDsn;
});

describe("server error telemetry", () => {
  it("stays disabled when SENTRY_DSN is missing", async () => {
    delete process.env.SENTRY_DSN;

    expect(hasSentryDsn()).toBe(false);
    await expect(captureServerException(new Error("test"))).resolves.toBe(false);
  });

  it("sends a Sentry envelope without loading a browser SDK", async () => {
    process.env.SENTRY_DSN = "https://public-key@sentry.example.com/42";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(captureServerException(new Error("test failure"), { route: "/players" })).resolves.toBe(true);
    expect(fetchMock).toHaveBeenCalledWith(
      "https://sentry.example.com/api/42/envelope/",
      expect.objectContaining({
        method: "POST",
        headers: { "content-type": "application/x-sentry-envelope" },
      }),
    );
    expect(String(fetchMock.mock.calls[0]?.[1]?.body)).toContain("test failure");
  });
});
