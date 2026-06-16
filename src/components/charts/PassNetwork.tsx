import type { Pass, Player } from "@/lib/types";

export function PassNetwork({ passes, players }: { passes: Pass[]; players: Player[] }) {
  const nodes = players.slice(0, 7).map((player, index) => {
    const angle = (Math.PI * 2 * index) / Math.max(players.slice(0, 7).length, 1) - Math.PI / 2;
    return { player, x: 180 + Math.cos(angle) * 120, y: 160 + Math.sin(angle) * 105 };
  });
  const maxVolume = Math.max(
    ...nodes.flatMap((from) => nodes.map((to) => passes.filter((pass) => pass.passerId === from.player.id && pass.receiverId === to.player.id).length)),
    1
  );
  return (
    <div className="rounded border border-slate-200 bg-white p-3 shadow-sm">
      <h3 className="mb-2 text-sm font-black text-ink">Pass Network</h3>
      <svg viewBox="0 0 360 320" className="h-auto w-full" role="img" aria-label="Pass network">
        <rect width="360" height="320" rx="12" fill="#f8fafc" />
        {nodes.flatMap((from) =>
          nodes.map((to) => {
            if (from.player.id === to.player.id) return null;
            const volume = passes.filter((pass) => pass.passerId === from.player.id && pass.receiverId === to.player.id).length;
            if (!volume) return null;
            return <line key={`${from.player.id}-${to.player.id}`} x1={from.x} y1={from.y} x2={to.x} y2={to.y} stroke="#0f766e" strokeWidth={1 + (volume / maxVolume) * 7} opacity="0.25" />;
          })
        )}
        {nodes.map((node) => (
          <g key={node.player.id}>
            <circle cx={node.x} cy={node.y} r="25" fill="#101820" />
            <text x={node.x} y={node.y + 4} textAnchor="middle" fontSize="11" fontWeight="900" fill="#fff">
              {node.player.name.split(" ").map((part) => part[0]).join("")}
            </text>
          </g>
        ))}
      </svg>
    </div>
  );
}
