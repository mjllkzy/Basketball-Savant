import { describe, expect, it } from "vitest";
import { compareStatTableValues, parseSortableNumber } from "./tableSorting";

describe("table sorting", () => {
  it("sorts negative numeric strings by numeric value", () => {
    const values = ["2.4", "-10.1", "0.0", "-2.5"];

    expect(values.sort(compareStatTableValues)).toEqual(["-10.1", "-2.5", "0.0", "2.4"]);
  });

  it("parses percentage strings as sortable numbers", () => {
    expect(parseSortableNumber("54.3%")).toBe(54.3);
    expect(parseSortableNumber("-5.2%")).toBe(-5.2);
  });

  it("does not parse records, heights, or dates as plain numbers", () => {
    expect(parseSortableNumber("46-36")).toBeNull();
    expect(parseSortableNumber("6-11")).toBeNull();
    expect(parseSortableNumber("6/13/26")).toBeNull();
  });
});
