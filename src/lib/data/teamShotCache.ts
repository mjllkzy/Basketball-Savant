import shotCache from "@/lib/data/generated/team-shot-charts.json";
import { expandCompactShot, type CompactShot } from "@/lib/data/shotChartMapper";
import type { Shot } from "@/lib/types";

type TeamShotCache = {
  metadata?: {
    season?: string;
    seasonType?: string;
    source?: string;
    generatedAt?: string;
  };
  teams?: Record<string, CompactShot[]>;
};

const cache = shotCache as unknown as TeamShotCache;

export const teamShotCacheMetadata = cache.metadata ?? {};

export function getCachedTeamShotChart(teamId: string): Shot[] {
  return (cache.teams?.[teamId] ?? []).map(expandCompactShot);
}
