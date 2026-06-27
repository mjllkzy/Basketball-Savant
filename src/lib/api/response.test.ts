import { describe, expect, it } from "vitest";
import {
  NO_STORE_CACHE_CONTROL,
  PUBLIC_DATA_CACHE_CONTROL,
  STATIC_DATA_CACHE_CONTROL,
  cachedOk,
  ok,
} from "./response";

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
});
