export const defaultMinMinutes = 500;
export const defaultMinGames = 30;
export const maxMinMinutes = 3000;
export const maxMinGames = 82;

export function boundedNumber(value: number | undefined, fallback: number, min: number, max: number): number {
  if (value === undefined || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
