import { describe, expect, it } from "vitest";
import { decimalAgeFromBirthDate, displayAgeFromBirthDate, normalizeBirthDate } from "./playerAge";

function utcDate(value: string) {
  return new Date(`${value}T12:00:00Z`);
}

describe("player age helpers", () => {
  it("returns an exact whole year on a birthday", () => {
    expect(decimalAgeFromBirthDate("2000-06-29", utcDate("2026-06-29"))).toBe(26);
  });

  it("uses the current birthday window for one-decimal display", () => {
    expect(displayAgeFromBirthDate("2000-06-29", 25)).toMatch(/^\d+\.\d$/);
    expect(decimalAgeFromBirthDate("2000-06-29", utcDate("2026-12-29"))).toBeCloseTo(26.501, 3);
  });

  it("does not increment the completed year before the birthday", () => {
    expect(decimalAgeFromBirthDate("2000-08-23", utcDate("2026-06-29"))).toBeCloseTo(25.849, 3);
  });

  it("handles Feb 29 birthdays in non-leap years", () => {
    expect(decimalAgeFromBirthDate("2000-02-29", utcDate("2026-02-28"))).toBe(26);
  });

  it("falls back cleanly when the birthdate is unavailable", () => {
    expect(displayAgeFromBirthDate(null, 27)).toBe("27.0");
    expect(displayAgeFromBirthDate(null, null)).toBe("N/A");
  });

  it("normalizes database and ISO birthdate values to date-only strings", () => {
    expect(normalizeBirthDate("1999-02-28T00:00:00")).toBe("1999-02-28");
    expect(normalizeBirthDate(utcDate("1999-02-28"))).toBe("1999-02-28");
  });
});
