import { describe, expect, it } from "vitest";
import { formatPlayerHeight } from "./playerHeight";

describe("player height formatting", () => {
  it("formats NBA roster heights for display", () => {
    expect(formatPlayerHeight("6-8")).toBe("6'8");
    expect(formatPlayerHeight("7-0")).toBe("7'0");
  });

  it("preserves missing or already custom values", () => {
    expect(formatPlayerHeight("N/A")).toBe("N/A");
    expect(formatPlayerHeight(undefined)).toBe("N/A");
    expect(formatPlayerHeight("Not loaded")).toBe("Not loaded");
  });
});
