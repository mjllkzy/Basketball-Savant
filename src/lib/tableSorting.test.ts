import { describe, expect, it } from "vitest";
import { compareStatTableValues, compareStatTableValuesForSort, isMissingSortableValue, parseSortableNumber } from "./tableSorting";

describe("table sorting", () => {
  it("sorts negative numeric strings by numeric value", () => {
    const values = ["2.4", "-10.1", "0.0", "-2.5"];

    expect(values.sort(compareStatTableValues)).toEqual(["-10.1", "-2.5", "0.0", "2.4"]);
  });

  it("parses percentage strings as sortable numbers", () => {
    expect(parseSortableNumber("54.3%")).toBe(54.3);
    expect(parseSortableNumber("-5.2%")).toBe(-5.2);
  });

  it("keeps missing values at the bottom in either sort direction", () => {
    const values = ["N/A", "12.0", "5.0", null, "--"];

    expect([...values].sort((a, b) => compareStatTableValuesForSort(a, b, "asc"))).toEqual(["5.0", "12.0", "N/A", null, "--"]);
    expect([...values].sort((a, b) => compareStatTableValuesForSort(a, b, "desc"))).toEqual(["12.0", "5.0", "N/A", null, "--"]);
  });

  it("classifies only true missing placeholders as missing", () => {
    expect(isMissingSortableValue("N/A")).toBe(true);
    expect(isMissingSortableValue("--")).toBe(true);
    expect(isMissingSortableValue(null)).toBe(true);
    expect(isMissingSortableValue("6-11")).toBe(false);
    expect(isMissingSortableValue("46-36")).toBe(false);
  });

  it("does not parse records, heights, or dates as plain numbers", () => {
    expect(parseSortableNumber("46-36")).toBeNull();
    expect(parseSortableNumber("6-11")).toBeNull();
    expect(parseSortableNumber("6/13/26")).toBeNull();
  });
});
