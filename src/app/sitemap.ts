import type { MetadataRoute } from "next";
import playerIndexJson from "../../public/data/players.json";
import type { MasterPlayerIndexEntry } from "@/lib/data/masterProfiles.server";
import { loadRuntimeFallbacks } from "@/lib/data/runtimeFallbacks.server";
import { absoluteUrl } from "@/lib/site";

export const revalidate = 86_400;

const staticRoutes = [
  "",
  "/players",
  "/teams",
  "/compare",
  "/similarity",
  "/leaderboards",
  "/games",
  "/news",
  "/glossary",
  "/about",
  "/docs/api",
];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const masterPlayers = playerIndexJson as MasterPlayerIndexEntry[];
  const fallback = await loadRuntimeFallbacks();
  const lastModified = new Date(process.env.MASTER_DATA_UPDATED_AT ?? fallback.metadata.generated_at);
  const teamSlugs = fallback.teams.map((team) => team.slug);

  return [
    ...staticRoutes.map((route) => ({
      url: absoluteUrl(route || "/"),
      lastModified,
      changeFrequency: route === "/news" ? "daily" as const : "weekly" as const,
      priority: route === "" ? 1 : route === "/players" || route === "/teams" ? 0.9 : 0.7,
    })),
    ...masterPlayers.map((player) => ({
      url: absoluteUrl(`/players/${player.player_slug}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
    ...teamSlugs.map((teamSlug) => ({
      url: absoluteUrl(`/teams/${teamSlug}`),
      lastModified,
      changeFrequency: "weekly" as const,
      priority: 0.8,
    })),
  ];
}
