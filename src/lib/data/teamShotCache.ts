import fs from "node:fs";
import { gunzipSync } from "node:zlib";
import { expandCompactShot, type CompactShot } from "@/lib/data/shotChartMapper";
import { readGeneratedJsonSync, resolveGeneratedDataPath } from "@/lib/data/generatedJson.server";
import type { Shot } from "@/lib/types";

type TeamShotCacheMetadata = {
  season?: string;
  seasonType?: string;
  source?: string;
  generatedAt?: string;
};

type TeamShotCacheManifest = {
  metadata?: TeamShotCacheMetadata;
  teams?: Record<string, { file: string; shots: number }>;
};

type LegacyTeamShotCache = {
  metadata?: TeamShotCacheMetadata;
  teams?: Record<string, CompactShot[]>;
};

const manifestPath = resolveGeneratedDataPath("team-shot-charts/manifest.json");
const manifest = fs.existsSync(manifestPath)
  ? readGeneratedJsonSync<TeamShotCacheManifest>("team-shot-charts/manifest.json")
  : null;
const expandedShotCache = new Map<string, Shot[]>();
let legacyCache: LegacyTeamShotCache | null | undefined;

function readLegacyCache() {
  if (legacyCache !== undefined) return legacyCache;
  const legacyPath = resolveGeneratedDataPath("team-shot-charts.json");
  legacyCache = fs.existsSync(legacyPath)
    ? readGeneratedJsonSync<LegacyTeamShotCache>("team-shot-charts.json")
    : null;
  return legacyCache;
}

function compactShotsForTeam(teamId: string): CompactShot[] {
  const manifestEntry = manifest?.teams?.[teamId];
  if (manifestEntry && /^\d+$/.test(teamId)) {
    const compressedPath = resolveGeneratedDataPath(`team-shot-charts/${manifestEntry.file}`);
    if (fs.existsSync(compressedPath)) {
      return JSON.parse(gunzipSync(fs.readFileSync(compressedPath)).toString("utf8")) as CompactShot[];
    }
  }
  return readLegacyCache()?.teams?.[teamId] ?? [];
}

export const teamShotCacheMetadata = manifest?.metadata ?? readLegacyCache()?.metadata ?? {};
export const teamShotCacheAttempts = manifest
  ? Object.values(manifest.teams ?? {}).reduce((total, entry) => total + entry.shots, 0)
  : Object.values(readLegacyCache()?.teams ?? {}).reduce((total, shots) => total + shots.length, 0);

export function getCachedTeamShotChart(teamId: string): Shot[] {
  const cached = expandedShotCache.get(teamId);
  if (cached) return cached;

  const shots = compactShotsForTeam(teamId).map(expandCompactShot);
  expandedShotCache.set(teamId, shots);
  return shots;
}
