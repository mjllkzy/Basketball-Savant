export const visualTabs = ["Overview", "Team Style", "Player Trends", "Player Radar", "Scoring Leaders", "Data Coverage"] as const;

export type VisualTab = (typeof visualTabs)[number];

const legacyTabMap: Record<string, VisualTab> = {
  "Lineup Network": "Data Coverage",
  "Pass Map": "Data Coverage",
  "Player Radar": "Player Radar",
  "Rolling Trend": "Player Trends",
  "Rolling Trends": "Player Trends",
  "Shot Chart": "Data Coverage",
  "Shot Heatmap": "Data Coverage",
  "Team Style Map": "Team Style",
  "Touch Map": "Data Coverage"
};

export function normalizeVisualTab(tab?: string): VisualTab {
  if (!tab) return "Overview";
  if ((visualTabs as readonly string[]).includes(tab)) return tab as VisualTab;
  return legacyTabMap[tab] ?? "Overview";
}
