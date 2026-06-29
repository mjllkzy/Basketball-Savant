import { describe, expect, it } from "vitest";
import { playerHeaderFacts } from "./PlayerHeader";

describe("playerHeaderFacts", () => {
  it("uses college bio context instead of source-label filler", () => {
    expect(
      playerHeaderFacts({
        age: 30,
        birthDate: undefined,
        college: "California-Santa Barbara",
        country: "USA",
        draftYear: 0,
        draftPick: 0,
        handedness: undefined
      })
    ).toEqual(["Age 30.0", "College: California-Santa Barbara", "Undrafted", "Country: USA"]);
  });

  it("falls back to country when college is unavailable", () => {
    expect(
      playerHeaderFacts({
        age: 27,
        birthDate: undefined,
        college: undefined,
        country: "Slovenia",
        draftYear: 2018,
        draftPick: 3,
        handedness: undefined
      })
    ).toEqual(["Age 27.0", "Country: Slovenia", "Draft: 2018 · Pick 3"]);
  });
});
