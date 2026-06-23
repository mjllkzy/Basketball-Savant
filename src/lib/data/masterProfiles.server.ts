import fs from "node:fs";
import path from "node:path";
import publicPlayerIndexJson from "../../../public/data/players.json";

export type MasterPlayerIndexEntry = {
  player_name: string;
  player_slug: string;
  season: string;
  season_type: string;
  primary_team: string | null;
  teams: string[];
  name_variants: string[];
  source_sheets: string[];
  stat_rows: number;
  profile_path: string;
};

export type MasterProfileStat = {
  player_name: string;
  raw_player_name?: string;
  team: string | null;
  season: string;
  season_type: string;
  source_sheet: string;
  stat_category: string;
  original_column_name: string;
  cleaned_column_name: string;
  raw_value: unknown;
  numeric_value: number | null;
  import_notes: string | null;
};

export type MasterPlayerProfile = {
  player_name: string;
  player_slug: string;
  season: string;
  season_type: string;
  primary_team: string | null;
  teams: string[];
  name_variants: string[];
  source_sheets: string[];
  stat_rows: number;
  stats: MasterProfileStat[];
};

export type MasterProfileCategorySummary = {
  category: string;
  statRows: number;
  sheetCount: number;
};

export type MasterProfileKeyStat = {
  label: string;
  sourceSheet: string;
  value: string;
};

export const masterPlayerIndex = publicPlayerIndexJson as unknown as MasterPlayerIndexEntry[];

const indexBySlug = new Map(masterPlayerIndex.map((entry) => [entry.player_slug.toLowerCase(), entry]));
const indexByName = new Map(masterPlayerIndex.map((entry) => [normalizeName(entry.player_name), entry]));
const profileCache = new Map<string, MasterPlayerProfile | null>();

function normalizeName(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function findBySlug(slug: string | undefined) {
  if (!slug) return undefined;
  const normalizedSlug = slug.trim().toLowerCase();
  if (!normalizedSlug) return undefined;
  return indexBySlug.get(normalizedSlug) ?? indexBySlug.get(normalizedSlug.replace(/-\d+$/, ""));
}

export function getMasterPlayerIndexEntry(input: string | { slug?: string; playerName?: string }): MasterPlayerIndexEntry | undefined {
  if (typeof input === "string") return findBySlug(input);
  const slugEntry = findBySlug(input.slug);
  if (slugEntry) return slugEntry;
  if (input.playerName) return indexByName.get(normalizeName(input.playerName));
  return undefined;
}

function profileFilePath(entry: MasterPlayerIndexEntry): string | null {
  const publicPath = entry.profile_path.replace(/^\/+/, "");
  if (!publicPath.startsWith("data/player_profiles/") || publicPath.includes("..")) return null;
  return path.join(process.cwd(), "public", publicPath);
}

export function hasMasterPlayerProfile(input: string | { slug?: string; playerName?: string }) {
  const entry = getMasterPlayerIndexEntry(input);
  const filePath = entry ? profileFilePath(entry) : null;
  return Boolean(filePath && fs.existsSync(filePath));
}

export function loadMasterPlayerProfile(input: string | { slug?: string; playerName?: string }): MasterPlayerProfile | null {
  const entry = getMasterPlayerIndexEntry(input);
  if (!entry) return null;
  const cached = profileCache.get(entry.player_slug);
  if (cached !== undefined) return cached;

  const filePath = profileFilePath(entry);
  if (!filePath || !fs.existsSync(filePath)) {
    profileCache.set(entry.player_slug, null);
    return null;
  }

  try {
    const parsed = JSON.parse(fs.readFileSync(filePath, "utf8")) as MasterPlayerProfile;
    if (!parsed || parsed.player_slug !== entry.player_slug || !Array.isArray(parsed.stats)) {
      profileCache.set(entry.player_slug, null);
      return null;
    }
    profileCache.set(entry.player_slug, parsed);
    return parsed;
  } catch {
    profileCache.set(entry.player_slug, null);
    return null;
  }
}

export function masterProfileCategorySummary(profile: MasterPlayerProfile): MasterProfileCategorySummary[] {
  const categories = new Map<string, { statRows: number; sheets: Set<string> }>();
  for (const stat of profile.stats) {
    const category = stat.stat_category || "Uncategorized";
    const existing = categories.get(category) ?? { statRows: 0, sheets: new Set<string>() };
    existing.statRows += 1;
    existing.sheets.add(stat.source_sheet);
    categories.set(category, existing);
  }
  return Array.from(categories.entries())
    .map(([category, value]) => ({ category, statRows: value.statRows, sheetCount: value.sheets.size }))
    .sort((a, b) => b.statRows - a.statRows || a.category.localeCompare(b.category));
}

function displayStatValue(stat: MasterProfileStat | undefined) {
  if (!stat || stat.raw_value === null || stat.raw_value === undefined || stat.raw_value === "") return "N/A";
  const raw = String(stat.raw_value);
  if (stat.numeric_value !== null && /pct|%|percentage/i.test(`${stat.cleaned_column_name} ${stat.original_column_name}`)) {
    return `${stat.numeric_value.toFixed(1)}%`;
  }
  return raw;
}

function findStat(profile: MasterPlayerProfile, sourceSheet: string, cleanedColumnName: string) {
  return profile.stats.find((stat) => stat.source_sheet === sourceSheet && stat.cleaned_column_name === cleanedColumnName);
}

export function masterProfileKeyStats(profile: MasterPlayerProfile): MasterProfileKeyStat[] {
  const definitions = [
    ["Games", "General - Traditional", "gp"],
    ["Minutes", "General - Traditional", "min"],
    ["Points", "General - Traditional", "pts"],
    ["Rebounds", "General - Traditional", "reb"],
    ["Assists", "General - Traditional", "ast"],
    ["Steals", "General - Traditional", "stl"],
    ["Blocks", "General - Traditional", "blk"],
    ["Turnovers", "General - Traditional", "tov"],
    ["True Shooting", "General - Advanced", "ts_pct"],
    ["Usage", "General - Advanced", "usg_pct"],
    ["PIE", "General - Advanced", "pie"],
    ["Net Rating", "General - Advanced", "netrtg"]
  ] as const;

  return definitions.map(([label, sourceSheet, cleanedColumnName]) => ({
    label,
    sourceSheet,
    value: displayStatValue(findStat(profile, sourceSheet, cleanedColumnName))
  }));
}
