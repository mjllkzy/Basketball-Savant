import { getMetric } from "@/lib/metrics/registry";

export type LeaderboardTab = {
  category: string;
  metricKey: string;
  status: "active" | "feed-required";
  note?: string;
};

export const activeLeaderboardTabs: LeaderboardTab[] = [
  { category: "Scoring", metricKey: "pts", status: "active" },
  { category: "Shooting", metricKey: "ts_pct", status: "active" },
  { category: "Efficiency", metricKey: "efg_pct", status: "active" },
  { category: "Creation", metricKey: "usage_rate", status: "active" },
  { category: "Playmaking", metricKey: "ast_pct", status: "active" },
  { category: "Defense", metricKey: "stocks", status: "active" },
  { category: "Rebounding", metricKey: "reb_pct", status: "active" },
  { category: "Clutch", metricKey: "ft_pct", status: "active" },
  { category: "Rolling", metricKey: "last_10_games", status: "active" },
  { category: "Percentiles", metricKey: "pie", status: "active" }
];

export const feedRequiredLeaderboardTabs: LeaderboardTab[] = [
  { category: "Shot Quality", metricKey: "shot_quality", status: "feed-required", note: "Shot-context events" },
  { category: "Play Type", metricKey: "transition_ppp", status: "feed-required", note: "Tagged possessions" },
  { category: "Lineups", metricKey: "lineup_net_rating", status: "feed-required", note: "Lineup stints" },
  { category: "Movement/Tracking", metricKey: "touches_per_75", status: "feed-required", note: "Optical/tracking feed" }
];

export const leaderboardTabs = [...activeLeaderboardTabs, ...feedRequiredLeaderboardTabs];

export function getLeaderboardTab(category: string): LeaderboardTab | undefined {
  return leaderboardTabs.find((tab) => tab.category === category);
}

export function defaultLeaderboardMetric(category: string): string {
  return getLeaderboardTab(category)?.metricKey ?? "pts";
}

export function isLeaderboardMetricFeedRequired(metricKey: string): boolean {
  return getMetric(metricKey).requiresTracking;
}
