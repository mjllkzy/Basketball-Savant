import type { PlayerSeasonAggregate } from "@/lib/types";
import { calculatePlayerMetric, getMetric } from "@/lib/metrics/registry";

export type ComparisonWinner = "left" | "right" | "tie";

export type ComparisonMetricKey =
  | "pts"
  | "reb"
  | "ast"
  | "ts_pct"
  | "efg_pct"
  | "usage_rate"
  | "ast_pct"
  | "reb_pct"
  | "pie"
  | "off_rating"
  | "def_rating"
  | "net_rating"
  | "stocks"
  | "turnover_rate";

export const comparisonMetricKeys: ComparisonMetricKey[] = [
  "pts",
  "reb",
  "ast",
  "ts_pct",
  "efg_pct",
  "usage_rate",
  "ast_pct",
  "reb_pct",
  "pie",
  "off_rating",
  "def_rating",
  "net_rating",
  "stocks",
  "turnover_rate"
];

const statSimilarityKeys: ComparisonMetricKey[] = ["pts", "reb", "ast", "ts_pct", "efg_pct", "usage_rate", "ast_pct", "reb_pct", "pie", "stocks"];

export function heightToInches(height: string | null | undefined): number | null {
  if (!height) return null;
  const match = height.trim().match(/^(\d+)-(\d+)$/);
  if (!match) return null;
  return Number(match[1]) * 12 + Number(match[2]);
}

export function positionTokens(position: string): string[] {
  return Array.from(new Set(position.split(/[-/,\s]+/).map((token) => token.trim()).filter(Boolean)));
}

export function positionSimilarity(a: string, b: string): number {
  const left = positionTokens(a);
  const right = positionTokens(b);
  if (left.length === 0 || right.length === 0) return 0;
  const rightSet = new Set(right);
  const shared = left.filter((token) => rightSet.has(token)).length;
  return shared / Math.max(left.length, right.length);
}

export function statWinner(left: number | null, right: number | null, higherIsBetter = true): ComparisonWinner {
  if (left === null && right === null) return "tie";
  if (left === null) return "right";
  if (right === null) return "left";
  if (Math.abs(left - right) < 0.000001) return "tie";
  return higherIsBetter ? (left > right ? "left" : "right") : left < right ? "left" : "right";
}

function closeness(left: number | null, right: number | null, scale: number): number {
  if (left === null || right === null || !Number.isFinite(left) || !Number.isFinite(right) || scale <= 0) return 0;
  return Math.max(0, 1 - Math.abs(left - right) / scale);
}

function metricRange(rows: PlayerSeasonAggregate[], key: string): number {
  const values = rows.map((row) => calculatePlayerMetric(key, row)).filter((value): value is number => value !== null && Number.isFinite(value));
  if (values.length === 0) return 1;
  return Math.max(...values) - Math.min(...values) || 1;
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

export function comparisonRows(left: PlayerSeasonAggregate, right: PlayerSeasonAggregate) {
  return comparisonMetricKeys.map((key) => {
    const metric = getMetric(key);
    const leftValue = calculatePlayerMetric(key, left);
    const rightValue = calculatePlayerMetric(key, right);
    return {
      key,
      metric,
      leftValue,
      rightValue,
      winner: statWinner(leftValue, rightValue, metric.higherIsBetter)
    };
  });
}

export function similarityScore(target: PlayerSeasonAggregate, candidate: PlayerSeasonAggregate, rows: PlayerSeasonAggregate[]) {
  const statScore = average(
    statSimilarityKeys.map((key) => closeness(calculatePlayerMetric(key, target), calculatePlayerMetric(key, candidate), metricRange(rows, key)))
  );
  const physicalScore = average([
    closeness(heightToInches(target.player.height), heightToInches(candidate.player.height), 12),
    closeness(target.player.weight, candidate.player.weight, 80),
    closeness(target.player.age, candidate.player.age, 15)
  ]);
  const roleScore = positionSimilarity(target.player.position, candidate.player.position);
  const score = statScore * 0.55 + physicalScore * 0.25 + roleScore * 0.2;
  const statTraits = statSimilarityKeys
    .map((key) => ({
      label: getMetric(key).shortLabel,
      score: closeness(calculatePlayerMetric(key, target), calculatePlayerMetric(key, candidate), metricRange(rows, key))
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((trait) => trait.label);
  const physicalTraits = [
    { label: "Height", score: closeness(heightToInches(target.player.height), heightToInches(candidate.player.height), 12) },
    { label: "Weight", score: closeness(target.player.weight, candidate.player.weight, 80) },
    { label: "Age", score: closeness(target.player.age, candidate.player.age, 15) },
    { label: "Position", score: roleScore }
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, 2)
    .map((trait) => trait.label);

  return {
    score: Math.round(score * 100),
    statScore: Math.round(statScore * 100),
    physicalScore: Math.round(physicalScore * 100),
    roleScore: Math.round(roleScore * 100),
    traits: Array.from(new Set([...statTraits, ...physicalTraits])).slice(0, 4)
  };
}

export function similarPlayers(target: PlayerSeasonAggregate, rows: PlayerSeasonAggregate[], limit = 8) {
  return rows
    .filter((row) => row.player.id !== target.player.id)
    .map((row) => ({ ...similarityScore(target, row, rows), aggregate: row }))
    .sort((a, b) => b.score - a.score || a.aggregate.player.name.localeCompare(b.aggregate.player.name))
    .slice(0, limit);
}
