import { loadRuntimeFallbacks } from "@/lib/data/runtimeFallbacks.server";
import { queryDatabase } from "./client.server";

if (typeof window !== "undefined") {
  throw new Error("src/lib/db/search.server.ts can only be imported on the server.");
}

export type SiteSearchResult = {
  type: "player" | "team";
  id: string;
  label: string;
  href: string;
  meta: string;
};

type SearchDbRow = {
  type: "player" | "team";
  id: string;
  label: string;
  href: string;
  meta: string;
};

async function fallbackSearch(query: string, limit: number): Promise<SiteSearchResult[]> {
  const { players, teams } = await loadRuntimeFallbacks();
  const normalized = query.toLowerCase();
  const playerRows = players
    .filter((player) => `${player.player_name} ${player.team_abbreviation ?? ""} ${player.position ?? ""}`.toLowerCase().includes(normalized))
    .slice(0, limit)
    .map((player): SiteSearchResult => ({
      type: "player",
      id: player.player_slug,
      label: player.player_name,
      href: `/players/${player.player_slug}`,
      meta: `${player.team_abbreviation ?? "NBA"} · ${player.position ?? "N/A"}`,
    }));
  const teamRows = teams
    .filter((team) => `${team.city} ${team.name} ${team.abbreviation}`.toLowerCase().includes(normalized))
    .slice(0, limit)
    .map((team): SiteSearchResult => ({
      type: "team",
      id: team.team_id,
      label: `${team.city} ${team.name}`,
      href: `/teams/${team.slug}`,
      meta: team.conference ?? "NBA",
    }));
  return [...playerRows, ...teamRows].slice(0, limit);
}

export async function searchSite(query: string, limit = 8): Promise<SiteSearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const safeLimit = Math.min(20, Math.max(1, limit));

  try {
    const pattern = `%${normalized}%`;
    const result = await queryDatabase<SearchDbRow>(`
      SELECT *
      FROM (
        SELECT
          'player'::text AS type,
          p.player_slug AS id,
          p.player_name AS label,
          '/players/' || p.player_slug AS href,
          COALESCE(p.primary_team_abbreviation, 'NBA') || ' · ' || COALESCE(p.position, 'N/A') AS meta,
          CASE WHEN p.player_name ILIKE $1 || '%' THEN 0 ELSE 1 END AS priority
        FROM players p
        JOIN current_player_season_summaries s USING (player_slug)
        WHERE p.player_name ILIKE $2
           OR p.primary_team_abbreviation ILIKE $2
        UNION ALL
        SELECT
          'team'::text AS type,
          t.id,
          trim(t.city || ' ' || t.name) AS label,
          '/teams/' || t.slug AS href,
          COALESCE(t.conference, 'NBA') AS meta,
          CASE WHEN t.city ILIKE $1 || '%' OR t.name ILIKE $1 || '%' OR t.abbreviation ILIKE $1 || '%' THEN 0 ELSE 1 END AS priority
        FROM teams t
        WHERE trim(t.city || ' ' || t.name) ILIKE $2
           OR t.abbreviation ILIKE $2
      ) matches
      ORDER BY priority, label
      LIMIT $3
    `, [normalized, pattern, safeLimit]);
    if (result) return result.rows.map(({ type, id, label, href, meta }) => ({ type, id, label, href, meta }));
  } catch {
    // The generated masterfile index remains available during DB outages.
  }

  return fallbackSearch(normalized, safeLimit);
}
