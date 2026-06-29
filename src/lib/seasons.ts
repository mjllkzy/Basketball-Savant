export const DEFAULT_SEASON = "2025-26";
export const UPCOMING_SEASON = "2026-27";

export type SeasonOption = {
  label: string;
  value: string;
};

export const baseSeasonOptions: SeasonOption[] = [
  { label: "2025-26", value: DEFAULT_SEASON },
  { label: "2026-27", value: UPCOMING_SEASON },
];

export function parseSeason(value: string | null | undefined) {
  return value && /^\d{4}-\d{2}$/.test(value) ? value : DEFAULT_SEASON;
}

export function mergeSeasonOptions(values: Array<string | null | undefined> = []): SeasonOption[] {
  const known = new Set(baseSeasonOptions.map((option) => option.value));
  values.forEach((value) => {
    if (value && /^\d{4}-\d{2}$/.test(value)) known.add(value);
  });
  return Array.from(known)
    .sort((left, right) => right.localeCompare(left))
    .map((value) => ({ label: value, value }));
}
