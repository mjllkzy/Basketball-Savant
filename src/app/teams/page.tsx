import type { Metadata } from "next";
import { TeamFilterForm } from "@/components/domain/TeamFilterForm";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable, type StatTableColumn } from "@/components/ui/StatTable";
import { listTeamSeasonSummaries, loadTeamSeasonSummaryFilters } from "@/lib/db/teamAnalytics.server";
import { calculateTeamMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
import { parseSeasonType } from "@/lib/seasonTypes";
import { DEFAULT_SEASON, parseSeason } from "@/lib/seasons";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";
import { nbaTeamLogoUrl } from "@/lib/teamBranding";

const entityColumnWidth = "290px";
const secondaryColumnWidth = "86px";
const teamTableMinWidth = "1322px";

export const metadata: Metadata = {
  title: "NBA Teams",
  description: "Compare 2025-26 NBA team records, ratings, pace, shooting, ball movement, and rebounding.",
  alternates: { canonical: "/teams" },
};

function centerColumn(key: string, label: string, group: string, width: string): StatTableColumn {
  return { key, label, group, width, align: "center" };
}

const teamColumns: StatTableColumn[] = [
  {
    key: "team",
    label: "Team",
    group: "Profile",
    hrefKey: "href",
    imageKey: "teamLogo",
    imageAltKey: "teamLogoAlt",
    imageFallbackKey: "teamLogoFallback",
    width: entityColumnWidth,
    truncate: true
  },
  centerColumn("conf", "Conf", "Profile", secondaryColumnWidth),
  centerColumn("record", "Record", "Profile", secondaryColumnWidth),
  centerColumn("ortg", "ORtg", "Ratings", secondaryColumnWidth),
  centerColumn("drtg", "DRtg", "Ratings", secondaryColumnWidth),
  centerColumn("net", "Net", "Ratings", secondaryColumnWidth),
  centerColumn("pace", "Pace", "Tempo", secondaryColumnWidth),
  centerColumn("ts", "TS%", "Efficiency", secondaryColumnWidth),
  centerColumn("efg", "eFG%", "Efficiency", secondaryColumnWidth),
  centerColumn("three", "3P%", "Efficiency", secondaryColumnWidth),
  centerColumn("ast", "AST%", "Ball Movement", secondaryColumnWidth),
  centerColumn("reb", "REB%", "Possession", secondaryColumnWidth),
  centerColumn("tov", "TOV%", "Possession", secondaryColumnWidth)
];

function selectedOption<T extends string>(value: string | undefined, options: Array<{ value: T }>) {
  return options.some((option) => option.value === value) ? (value as T) : undefined;
}

function divisionsForConference<T extends { conference: "East" | "West" }>(divisions: T[], conference?: "East" | "West") {
  return conference ? divisions.filter((division) => division.conference === conference) : divisions;
}

function teamHref(slug: string, seasonType: string, season: string) {
  const params = new URLSearchParams();
  if (season !== DEFAULT_SEASON) params.set("season", season);
  if (seasonType !== "Regular Season") params.set("seasonType", seasonType);
  const query = params.toString();
  return query ? `/teams/${slug}?${query}` : `/teams/${slug}`;
}

export default async function TeamsPage({ searchParams }: { searchParams: Promise<RouteSearchParams> }) {
  const resolvedSearchParams = await searchParams;
  const q = singleParam(resolvedSearchParams, "q")?.trim() || undefined;
  const season = parseSeason(singleParam(resolvedSearchParams, "season"));
  const seasonType = parseSeasonType(singleParam(resolvedSearchParams, "seasonType"));
  const filterOptions = await loadTeamSeasonSummaryFilters({ season, seasonType });
  const conference = selectedOption(singleParam(resolvedSearchParams, "conference"), filterOptions.conferences);
  const availableDivisions = divisionsForConference(filterOptions.divisions, conference);
  const division = selectedOption(singleParam(resolvedSearchParams, "division"), availableDivisions);
  const month = selectedOption(singleParam(resolvedSearchParams, "month"), filterOptions.months);
  const result = await listTeamSeasonSummaries({ q, season, seasonType, conference, division, month });
  const selectedMonthLabel = filterOptions.months.find((option) => option.value === month)?.label;
  const rows = result.rows.map((row) => ({
    team: `${row.team.city} ${row.team.name}`,
    teamAccent: row.team.primaryColor,
    teamLogo: nbaTeamLogoUrl(row.team.id),
    teamLogoAlt: `${row.team.city} ${row.team.name} logo`,
    teamLogoFallback: row.team.abbreviation,
    href: teamHref(row.team.slug, seasonType, season),
    conf: row.team.conference,
    record: `${row.wins}-${row.losses}`,
    ortg: formatMetric("off_rating", calculateTeamMetric("off_rating", row)),
    drtg: formatMetric("def_rating", calculateTeamMetric("def_rating", row)),
    net: formatMetric("net_rating", calculateTeamMetric("net_rating", row)),
    pace: formatMetric("pace", calculateTeamMetric("pace", row)),
    ts: formatMetric("ts_pct", calculateTeamMetric("ts_pct", row)),
    efg: formatMetric("efg_pct", calculateTeamMetric("efg_pct", row)),
    three: formatMetric("three_pct", calculateTeamMetric("three_pct", row)),
    ast: formatMetric("ast_pct", calculateTeamMetric("ast_pct", row)),
    reb: formatMetric("reb_pct", calculateTeamMetric("reb_pct", row)),
    tov: formatMetric("turnover_rate", calculateTeamMetric("turnover_rate", row))
  }));
  return (
    <div className="grid gap-4">
      <PageHeader
        eyebrow="Team Index"
        title="Teams"
        description={selectedMonthLabel
          ? `Official ${season} ${seasonType.toLowerCase()} team records, ratings, pace, shooting, ball movement, and rebounding context for ${selectedMonthLabel}.`
          : `Official ${season} ${seasonType.toLowerCase()} team records, ratings, pace, shooting, ball movement, and rebounding context.`}
      />
      <TeamFilterForm
        q={q}
        season={season}
        seasonType={seasonType}
        conference={conference}
        division={division}
        month={month}
        seasons={filterOptions.seasons}
        seasonTypes={filterOptions.seasonTypes}
        conferences={filterOptions.conferences}
        divisions={filterOptions.divisions}
        months={filterOptions.months}
      />
      <div data-data-source={result.source} className="rounded border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-sm">
        Showing <strong className="text-ink">{rows.length}</strong> {season} {seasonType.toLowerCase()} teams{q ? <> matching <strong className="text-ink">{q}</strong></> : null}{selectedMonthLabel ? <> for <strong className="text-ink">{selectedMonthLabel}</strong></> : null}.
      </div>
      <div data-data-source={result.source}>
        <StatTable
          columns={teamColumns}
          rows={rows}
          layout="fixed"
          minWidth={teamTableMinWidth}
          rowAccentColorKey="teamAccent"
          rowAccentColumnKey="team"
        />
      </div>
    </div>
  );
}
