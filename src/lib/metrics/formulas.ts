export function safeDiv(numerator: number | null | undefined, denominator: number | null | undefined): number | null {
  if (numerator === null || numerator === undefined || denominator === null || denominator === undefined) return null;
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator) || denominator === 0) return null;
  return numerator / denominator;
}

export function percentage(made: number, attempts: number): number | null {
  return safeDiv(made, attempts);
}

export function efgPercentage(fgm: number, threePm: number, fga: number): number | null {
  return safeDiv(fgm + 0.5 * threePm, fga);
}

export function trueShootingPercentage(pts: number, fga: number, fta: number): number | null {
  return safeDiv(pts, 2 * (fga + 0.44 * fta));
}

export function estimatePossessions(fga: number, fta: number, oreb: number, tov: number): number {
  return fga + 0.44 * fta - oreb + tov;
}

export function paceEstimate(teamPossessions: number, opponentPossessions: number, teamMinutesPlayed: number): number | null {
  return safeDiv(48 * (teamPossessions + opponentPossessions), 2 * (teamMinutesPlayed / 5));
}

export function offensiveRating(pointsScored: number, possessions: number): number | null {
  const value = safeDiv(pointsScored, possessions);
  return value === null ? null : value * 100;
}

export function defensiveRating(pointsAllowed: number, possessions: number): number | null {
  const value = safeDiv(pointsAllowed, possessions);
  return value === null ? null : value * 100;
}

export function netRating(offRating: number | null, defRating: number | null): number | null {
  if (offRating === null || defRating === null) return null;
  return offRating - defRating;
}

export function usageRate(
  fga: number,
  fta: number,
  tov: number,
  minutes: number,
  teamFga: number,
  teamFta: number,
  teamTov: number,
  teamMinutes: number
): number | null {
  const playerPlays = fga + 0.44 * fta + tov;
  const teamPlays = teamFga + 0.44 * teamFta + teamTov;
  return safeDiv(playerPlays * teamMinutes, minutes * teamPlays);
}

export function actualMinusExpectedPoints(actualPoints: number, expectedPoints: number): number {
  return actualPoints - expectedPoints;
}

export function expectedPoints(expectedFgProbability: number, pointsValue: number): number {
  return expectedFgProbability * pointsValue;
}

export function shotQuality(expectedPointsPerShot: number): number {
  return expectedPointsPerShot;
}

export function rimFrequency(rimAttempts: number, totalFga: number): number | null {
  return safeDiv(rimAttempts, totalFga);
}

export function assistRate(assists: number, fgm: number, minutes: number, teamFgm: number, teamMinutes: number): number | null {
  const teammateMadeFieldGoalsWhileOnCourt = (minutes / teamMinutes) * teamFgm - fgm;
  return safeDiv(assists, teammateMadeFieldGoalsWhileOnCourt);
}

export function turnoverRate(turnovers: number, possessionsUsed: number): number | null {
  return safeDiv(turnovers, possessionsUsed);
}

export function reboundConversion(rebounds: number, reboundChances: number): number | null {
  return safeDiv(rebounds, reboundChances);
}

export function per75(value: number, possessions: number): number | null {
  const rate = safeDiv(value, possessions);
  return rate === null ? null : rate * 75;
}

export function roundMetric(value: number | null | undefined, decimals = 1): number | null {
  if (value === null || value === undefined || !Number.isFinite(value)) return null;
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

export function percentileRank(value: number, values: number[], higherIsBetter = true): number {
  const clean = values.filter((item) => Number.isFinite(item)).sort((a, b) => a - b);
  if (clean.length === 0 || !Number.isFinite(value)) return 0;
  const below = clean.filter((item) => item < value).length;
  const equal = clean.filter((item) => item === value).length;
  const percentile = ((below + 0.5 * equal) / clean.length) * 100;
  const rounded = Math.round(percentile);
  return higherIsBetter ? rounded : 100 - rounded;
}
