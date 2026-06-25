import type { MetadataRoute } from "next";
import playerIndexJson from "../../public/data/players.json";
import type { MasterPlayerIndexEntry } from "@/lib/data/masterProfiles.server";
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

const teamSlugs = [
  "atlanta-hawks",
  "boston-celtics",
  "brooklyn-nets",
  "charlotte-hornets",
  "chicago-bulls",
  "cleveland-cavaliers",
  "dallas-mavericks",
  "denver-nuggets",
  "detroit-pistons",
  "golden-state-warriors",
  "houston-rockets",
  "indiana-pacers",
  "la-clippers",
  "los-angeles-lakers",
  "memphis-grizzlies",
  "miami-heat",
  "milwaukee-bucks",
  "minnesota-timberwolves",
  "new-orleans-pelicans",
  "new-york-knicks",
  "oklahoma-city-thunder",
  "orlando-magic",
  "philadelphia-76ers",
  "phoenix-suns",
  "portland-trail-blazers",
  "sacramento-kings",
  "san-antonio-spurs",
  "toronto-raptors",
  "utah-jazz",
  "washington-wizards",
];

export default function sitemap(): MetadataRoute.Sitemap {
  const masterPlayers = playerIndexJson as MasterPlayerIndexEntry[];
  const lastModified = new Date(process.env.MASTER_DATA_UPDATED_AT ?? "2026-06-17T10:30:46.492Z");

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
