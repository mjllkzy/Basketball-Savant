import type { SeasonType } from "@/lib/types";

export const DEFAULT_SEASON_TYPE: SeasonType = "Regular Season";

export const seasonTypeOptions: Array<{ label: string; value: SeasonType }> = [
  { label: "Regular Season", value: "Regular Season" },
  { label: "Playoffs", value: "Playoffs" },
];

export function parseSeasonType(value: string | null | undefined): SeasonType {
  return value === "Playoffs" ? "Playoffs" : DEFAULT_SEASON_TYPE;
}

export function isSeasonType(value: string | null | undefined): value is SeasonType {
  return value === "Regular Season" || value === "Playoffs";
}
