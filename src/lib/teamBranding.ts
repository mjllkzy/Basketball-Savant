import type { CSSProperties } from "react";
import type { Team } from "@/lib/types";

const teamLogoUrlOverrides: Record<string, string> = {
  "1610612745": "https://cdn.nba.com/logos/nba/1610612745/primary/L/logo.svg?v=2026-06-04",
};

export function nbaTeamLogoUrl(teamId: string) {
  if (teamLogoUrlOverrides[teamId]) return teamLogoUrlOverrides[teamId];
  return `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`;
}

function hexToRgb(hex: string) {
  const normalized = hex.replace("#", "");
  if (!/^[0-9a-fA-F]{6}$/.test(normalized)) return { r: 16, g: 24, b: 32 };
  return {
    r: parseInt(normalized.slice(0, 2), 16),
    g: parseInt(normalized.slice(2, 4), 16),
    b: parseInt(normalized.slice(4, 6), 16)
  };
}

function rgba(hex: string, alpha: number) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function luminance(hex: string) {
  const { r, g, b } = hexToRgb(hex);
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

export function teamAccentColor(team: Pick<Team, "primaryColor" | "secondaryColor">) {
  if (luminance(team.primaryColor) < 0.58) return team.primaryColor;
  if (luminance(team.secondaryColor) < 0.58) return team.secondaryColor;
  return "#101820";
}

export function teamTintStyle(team: Pick<Team, "primaryColor" | "secondaryColor">): CSSProperties {
  return {
    borderColor: rgba(team.primaryColor, 0.32),
    background: `linear-gradient(135deg, ${rgba(team.primaryColor, 0.15)} 0%, ${rgba(team.secondaryColor, 0.08)} 46%, rgba(255, 255, 255, 0.96) 100%)`,
    boxShadow: `inset 0 4px 0 ${rgba(team.primaryColor, 0.72)}`
  };
}
