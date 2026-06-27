import { NO_STORE_CACHE_CONTROL, ok } from "@/lib/api/response";
import { loadRuntimeFallbacks } from "@/lib/data/runtimeFallbacks.server";
import { teamShotCacheAttempts, teamShotCacheMetadata } from "@/lib/data/teamShotCache";
import { getDatabaseHealth } from "@/lib/db/health.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const [database, fallback] = await Promise.all([
    getDatabaseHealth(),
    loadRuntimeFallbacks(),
  ]);
  const connected = database.status === "connected";
  const players = connected ? database.currentPlayerSummaries : fallback.metadata.players;
  const teams = connected ? database.currentTeamSummaries : fallback.metadata.teams;
  const games = connected ? database.currentGames : 0;
  const databaseShots = connected ? database.currentShotAttempts : 0;
  return ok({
    status: database.status === "unavailable" ? "degraded" : "ok",
    name: "Basketball Savant",
    release: process.env.RAILWAY_GIT_COMMIT_SHA ?? process.env.GITHUB_SHA ?? null,
    version: `excel-master-${fallback.metadata.season}-${fallback.metadata.source_workbook_sha256.slice(0, 12)}`,
    provider: "NBA Excel masterfile, NBA Stats, and Basketball Reference cross-checks",
    generatedAt: database.status === "connected"
      ? database.latestIngestion?.finishedAt ?? fallback.metadata.generated_at
      : fallback.metadata.generated_at,
    coverage: {
      season: fallback.metadata.season,
      seasonType: fallback.metadata.season_type,
      sourceWorkbookSha256: fallback.metadata.source_workbook_sha256,
      teamGameStats: connected ? database.currentTeamGameStats : 0,
      playerGameStats: connected ? database.currentPlayerGameStats : 0,
      shotSource: databaseShots > 0 ? "Postgres shot_attempts" : teamShotCacheMetadata.source ?? "generated team shot cache",
    },
    teams,
    players,
    games,
    possessions: 0,
    shots: databaseShots > 0 ? databaseShots : teamShotCacheAttempts,
    lineups: 0,
    database,
  }, undefined, { cacheControl: NO_STORE_CACHE_CONTROL });
}
