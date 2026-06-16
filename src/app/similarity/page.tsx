import { PageHeader } from "@/components/ui/PageHeader";
import { SimilarPlayersTable } from "@/components/domain/SimilarPlayersTable";
import { getPlayerByIdOrSlug, getPlayerProfile, players, type SimilarityBasis } from "@/lib/data/queries";
import { singleParam, type RouteSearchParams } from "@/lib/searchParams";

const bases: SimilarityBasis[] = ["Overall", "Scoring style", "Shot profile", "Playmaking", "Defense", "Physical/role"];

export default function SimilarityPage({ searchParams }: { searchParams: RouteSearchParams }) {
  const selected = singleParam(searchParams, "player") ?? players[0].slug;
  const basis = (singleParam(searchParams, "basis") ?? "Overall") as SimilarityBasis;
  const player = getPlayerByIdOrSlug(selected) ?? players[0];
  const profile = getPlayerProfile(player.slug)!;
  return (
    <div className="grid gap-4">
      <PageHeader eyebrow="Similarity" title="Player Similarity Finder" description="Compute cosine similarity over normalized metric vectors by overall profile, scoring style, shot profile, playmaking, defense, or physical role." />
      <form className="grid gap-3 rounded border border-slate-200 bg-white p-3 shadow-sm lg:grid-cols-[1fr_220px_120px]">
        <select name="player" defaultValue={player.slug} className="rounded border border-slate-300 px-3 py-2 text-sm">
          {players.map((option) => <option key={option.id} value={option.slug}>{option.name}</option>)}
        </select>
        <select name="basis" defaultValue={basis} className="rounded border border-slate-300 px-3 py-2 text-sm">
          {bases.map((option) => <option key={option}>{option}</option>)}
        </select>
        <button className="rounded bg-ink px-3 py-2 text-sm font-black text-white">Find</button>
      </form>
      <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
        <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">Selected Player</div>
        <h2 className="mt-1 text-2xl font-black text-ink">{profile.player.name}</h2>
        <p className="mt-1 text-sm text-slate-600">{profile.team.city} {profile.team.name} · {profile.player.position}</p>
      </div>
      <SimilarPlayersTable playerId={player.id} basis={basis} />
    </div>
  );
}
