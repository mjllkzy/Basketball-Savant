import { PageHeader } from "@/components/ui/PageHeader";
import { StatTable } from "@/components/ui/StatTable";

const endpoints = [
  ["GET", "/api/health", "Dataset and service status"],
  ["GET", "/api/players", "Player list with search, pagination, sorting, and filters"],
  ["GET", "/api/players/:id", "Player profile, aggregate, shots, game logs, similar players"],
  ["GET", "/api/players/:id/summary", "Player header and season aggregate"],
  ["GET", "/api/players/:id/metrics", "Metric values, ranks, and percentiles"],
  ["GET", "/api/players/:id/shots", "Player shot events"],
  ["GET", "/api/players/:id/rolling", "Recent game trend rows"],
  ["GET", "/api/players/:id/similar", "Blended similarity scores with physical, role, ratio, and per-minute components"],
  ["GET", "/api/teams", "Team list"],
  ["GET", "/api/teams/:id", "Team profile"],
  ["GET", "/api/games", "Game list"],
  ["GET", "/api/games/:id", "Game report"],
  ["GET", "/api/games/:id/feed", "Possession feed"],
  ["GET", "/api/search/shots", "Advanced shot search"],
  ["GET", "/api/search/possessions", "Possession search"],
  ["GET", "/api/leaderboards", "Player leaderboard"],
  ["GET", "/api/leaderboards/custom", "Custom leaderboard rows"],
  ["GET", "/api/metrics", "Metric registry"],
  ["GET", "/api/glossary", "Glossary-friendly metric docs"],
  ["POST", "/api/import/csv", "CSV preview for local import pipeline"]
];

export default function ApiDocsPage() {
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="API Docs" title="API Reference" description="All endpoints return JSON envelopes with data, meta, and error fields. The /api/v1 aliases expose the same core list/detail endpoints." />
      <StatTable columns={[{ key: "method", label: "Method" }, { key: "path", label: "Path" }, { key: "description", label: "Description" }]} rows={endpoints.map(([method, path, description]) => ({ method, path, description }))} />
    </div>
  );
}
