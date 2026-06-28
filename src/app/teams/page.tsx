import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable, type StatTableColumn } from "@/components/ui/StatTable";
import { listTeamSeasonSummaries } from "@/lib/db/teamAnalytics.server";
import { calculateTeamMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";
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

export default async function TeamsPage() {
  const result = await listTeamSeasonSummaries();
  const rows = result.rows.map((row) => ({
    team: `${row.team.city} ${row.team.name}`,
    teamAccent: row.team.primaryColor,
    teamLogo: nbaTeamLogoUrl(row.team.id),
    teamLogoAlt: `${row.team.city} ${row.team.name} logo`,
    teamLogoFallback: row.team.abbreviation,
    href: `/teams/${row.team.slug}`,
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
      <PageHeader eyebrow="Team Index" title="Teams" description="Official team records, ratings, pace, shooting, ball movement, and rebounding context." />
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
