import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";
import { teamSeasonAggregates } from "@/lib/data/queries";
import { calculateTeamMetric } from "@/lib/metrics/registry";
import { formatMetric } from "@/lib/metrics/format";

function nbaTeamLogoUrl(teamId: string) {
  return `https://cdn.nba.com/logos/nba/${teamId}/primary/L/logo.svg`;
}

export default function TeamsPage() {
  const rows = teamSeasonAggregates.map((row) => ({
    team: `${row.team.city} ${row.team.name}`,
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
    efg: formatMetric("efg_pct", calculateTeamMetric("efg_pct", row)),
    three: formatMetric("three_pct", calculateTeamMetric("three_pct", row))
  }));
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Team Index" title="Teams" description="Team style, four factors, shot diet, lineup performance, and roster contribution entry point." />
      <StatTable
        columns={[
          { key: "team", label: "Team", hrefKey: "href", imageKey: "teamLogo", imageAltKey: "teamLogoAlt", imageFallbackKey: "teamLogoFallback" },
          { key: "conf", label: "Conf" },
          { key: "record", label: "Record" },
          { key: "ortg", label: "ORtg", align: "right" },
          { key: "drtg", label: "DRtg", align: "right" },
          { key: "net", label: "Net", align: "right" },
          { key: "pace", label: "Pace", align: "right" },
          { key: "efg", label: "eFG%", align: "right" },
          { key: "three", label: "3P%", align: "right" }
        ]}
        rows={rows}
      />
    </div>
  );
}
