"use client";

import Image from "next/image";
import { useState } from "react";
import type { Team } from "@/lib/types";
import { nbaTeamLogoUrl } from "@/lib/teamBranding";

function TeamLogo({ team }: { team: Team }) {
  const [failed, setFailed] = useState(false);
  const label = `${team.city} ${team.name}`.trim();

  if (failed) {
    return (
      <div className="flex h-20 w-20 items-center justify-center rounded text-2xl font-black text-white" style={{ background: team.primaryColor }}>
        {team.abbreviation}
      </div>
    );
  }

  return (
    <div className="flex h-20 w-20 items-center justify-center rounded border border-slate-200 bg-white p-2 shadow-sm">
      <Image
        src={nbaTeamLogoUrl(team.id)}
        alt={`${label} logo`}
        width={72}
        height={72}
        className="h-full w-full object-contain"
        unoptimized
        priority
        onError={() => setFailed(true)}
      />
    </div>
  );
}

export function TeamHeader({ team, record }: { team: Team; record?: string }) {
  return (
    <div className="rounded border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <TeamLogo team={team} />
          <div>
            <div className="text-xs font-black uppercase tracking-[0.14em] text-signal">{team.conference} · {team.division}</div>
            <h1 className="text-3xl font-black tracking-tight text-ink">{team.city} {team.name}</h1>
            <div className="mt-1 text-sm font-semibold text-slate-600">{record ?? "Seed season profile"}</div>
          </div>
        </div>
        <div className="h-4 w-40 rounded" style={{ background: `linear-gradient(90deg, ${team.primaryColor}, ${team.secondaryColor})` }} />
      </div>
    </div>
  );
}
