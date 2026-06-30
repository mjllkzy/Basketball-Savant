import { loadRuntimeFallbacks } from "@/lib/data/runtimeFallbacks.server";
import { currentTeamAbbreviationForPlayerSlug } from "@/lib/data/currentRoster";
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

export type SiteSearchResultType = SiteSearchResult["type"];

type SearchDbRow = {
  type: "player" | "team";
  id: string;
  label: string;
  href: string;
  meta: string;
};

function allowedTypes(types?: readonly SiteSearchResultType[]) {
  const requested = new Set(types?.filter((type): type is SiteSearchResultType => type === "player" || type === "team"));
  return requested.size ? requested : new Set<SiteSearchResultType>(["player", "team"]);
}

async function fallbackSearch(query: string, limit: number, types?: readonly SiteSearchResultType[]): Promise<SiteSearchResult[]> {
  const { players, teams } = await loadRuntimeFallbacks();
  const normalized = query.toLowerCase();
  const typeSet = allowedTypes(types);
  const playerRows = typeSet.has("player") ? players
    .filter((player) => `${player.player_name} ${player.team_abbreviation ?? ""} ${player.position ?? ""}`.toLowerCase().includes(normalized))
    .slice(0, limit)
    .map((player): SiteSearchResult => ({
      type: "player",
      id: player.player_slug,
      label: player.player_name,
      href: `/players/${player.player_slug}`,
      meta: `${currentTeamAbbreviationForPlayerSlug(player.player_slug, player.team_abbreviation)} · ${player.position ?? "N/A"}`,
    })) : [];
  const teamRows = typeSet.has("team") ? teams
    .filter((team) => `${team.city} ${team.name} ${team.abbreviation}`.toLowerCase().includes(normalized))
    .slice(0, limit)
    .map((team): SiteSearchResult => ({
      type: "team",
      id: team.team_id,
      label: `${team.city} ${team.name}`,
      href: `/teams/${team.slug}`,
      meta: team.conference ?? "NBA",
    })) : [];
  return [...playerRows, ...teamRows].slice(0, limit);
}

export async function searchSite(query: string, limit = 8, types?: readonly SiteSearchResultType[]): Promise<SiteSearchResult[]> {
  const normalized = query.trim();
  if (!normalized) return [];
  const safeLimit = Math.min(20, Math.max(1, limit));
  const typeSet = allowedTypes(types);

  try {
    const pattern = `%${normalized}%`;
    const searches: string[] = [];

    if (typeSet.has("player")) {
      searches.push(`
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
      `);
    }

    if (typeSet.has("team")) {
      searches.push(`
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
      `);
    }

    const result = await queryDatabase<SearchDbRow>(`
      SELECT *
      FROM (
        ${searches.join("\nUNION ALL\n")}
      ) matches
      ORDER BY priority, label
      LIMIT $3
    `, [normalized, pattern, safeLimit]);
    if (result) {
      return result.rows.map(({ type, id, label, href, meta }) => ({
        type,
        id,
        label,
        href,
        meta: type === "player" ? `${currentTeamAbbreviationForPlayerSlug(id, meta.split(" · ")[0])} · ${meta.split(" · ").slice(1).join(" · ") || "N/A"}` : meta,
      }));
    }
  } catch {
    // The generated masterfile index remains available during DB outages.
  }

  return fallbackSearch(normalized, safeLimit, types);
}
