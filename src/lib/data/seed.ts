import type {
  DefensiveEvent,
  Game,
  Lineup,
  Pass,
  Player,
  PlayerGameStat,
  Possession,
  Rebound,
  Shot,
  ShotZone,
  Team,
  TeamGameStat
} from "@/lib/types";
import { estimatePossessions, trueShootingPercentage } from "@/lib/metrics/formulas";
import { expectedShotValue } from "@/lib/models/expectedShotValue";
import { formatClock, seededNumber, slugify, stableHash } from "@/lib/utils";

export const datasetVersion = "seed-2026.06.16";
const season = "2025-26";
const now = "2026-06-16T00:00:00.000Z";

export const teams: Team[] = [
  { id: "tm-nyh", slug: "new-york-harbor", name: "Harbor", abbreviation: "NYH", city: "New York", conference: "East", division: "Atlantic", primaryColor: "#0f766e", secondaryColor: "#f97316" },
  { id: "tm-saf", slug: "san-antonio-forge", name: "Forge", abbreviation: "SAF", city: "San Antonio", conference: "West", division: "Southwest", primaryColor: "#334155", secondaryColor: "#facc15" },
  { id: "tm-ser", slug: "seattle-rain", name: "Rain", abbreviation: "SEA", city: "Seattle", conference: "West", division: "Northwest", primaryColor: "#0f4c81", secondaryColor: "#22c55e" },
  { id: "tm-lvs", slug: "las-vegas-sol", name: "Sol", abbreviation: "LVS", city: "Las Vegas", conference: "West", division: "Pacific", primaryColor: "#7c2d12", secondaryColor: "#f59e0b" },
  { id: "tm-nat", slug: "nashville-tempo", name: "Tempo", abbreviation: "NAT", city: "Nashville", conference: "East", division: "Central", primaryColor: "#4c1d95", secondaryColor: "#38bdf8" },
  { id: "tm-bab", slug: "baltimore-blue", name: "Blue", abbreviation: "BAB", city: "Baltimore", conference: "East", division: "Atlantic", primaryColor: "#1d4ed8", secondaryColor: "#f8fafc" },
  { id: "tm-por", slug: "portland-pines", name: "Pines", abbreviation: "POR", city: "Portland", conference: "West", division: "Northwest", primaryColor: "#166534", secondaryColor: "#d1d5db" },
  { id: "tm-chm", slug: "charlotte-mint", name: "Mint", abbreviation: "CHM", city: "Charlotte", conference: "East", division: "Southeast", primaryColor: "#047857", secondaryColor: "#a7f3d0" }
];

const firstNames = [
  "Avery",
  "Malik",
  "Jonah",
  "Darius",
  "Theo",
  "Cam",
  "Elias",
  "Noah",
  "Micah",
  "Jalen",
  "Kian",
  "Andre",
  "Miles",
  "Nico",
  "Taj",
  "Rowan"
];

const lastNames = [
  "Cole",
  "Stone",
  "Bennett",
  "Reed",
  "Holloway",
  "Pierce",
  "Monroe",
  "Carter",
  "Hayes",
  "Watts",
  "Sutton",
  "Brooks",
  "Mercer",
  "Cross",
  "Dawson",
  "Ellis"
];

const positions: Player["position"][] = ["PG", "SG", "SF", "PF", "C", "PG", "SG", "SF", "PF", "C"];
const roles = [
  "Primary Creator",
  "Pull-Up Scorer",
  "Two-Way Wing",
  "Rim Pressure Forward",
  "Defensive Anchor",
  "Second-Side Playmaker",
  "Movement Shooter",
  "Switch Defender",
  "Energy Big",
  "Reserve Organizer"
];

const heightByPosition: Record<Player["position"], string[]> = {
  PG: ["6-1", "6-2", "6-3", "6-4"],
  SG: ["6-3", "6-4", "6-5", "6-6"],
  SF: ["6-6", "6-7", "6-8"],
  PF: ["6-8", "6-9", "6-10"],
  C: ["6-10", "6-11", "7-0", "7-1"]
};

const weightByPosition: Record<Player["position"], number> = {
  PG: 188,
  SG: 204,
  SF: 218,
  PF: 235,
  C: 252
};

export const players: Player[] = teams.flatMap((team, teamIndex) =>
  Array.from({ length: 10 }, (_, rosterIndex) => {
    const first = firstNames[(teamIndex * 3 + rosterIndex) % firstNames.length];
    const last = lastNames[(teamIndex * 5 + rosterIndex * 2) % lastNames.length];
    const name = `${first} ${last}`;
    const position = positions[rosterIndex];
    const baseSkill = 0.72 - rosterIndex * 0.075 + seededNumber(`${team.id}-${rosterIndex}-skill`, -0.12, 0.16, 2);
    const heightOptions = heightByPosition[position];
    return {
      id: `ply-${team.abbreviation.toLowerCase()}-${String(rosterIndex + 1).padStart(2, "0")}`,
      name,
      slug: slugify(`${name}-${team.abbreviation}`),
      teamId: team.id,
      position,
      height: heightOptions[(teamIndex + rosterIndex) % heightOptions.length],
      weight: weightByPosition[position] + Math.round(seededNumber(`${name}-weight`, -9, 13)),
      age: Math.round(seededNumber(`${name}-age`, rosterIndex < 3 ? 23 : 21, rosterIndex < 3 ? 31 : 34)),
      draftYear: Math.round(seededNumber(`${name}-draft-year`, 2015, 2025)),
      draftRound: rosterIndex < 7 ? 1 : 2,
      draftPick: Math.round(seededNumber(`${name}-draft-pick`, 1, 58)),
      headshotUrl: "/headshots/placeholder.svg",
      active: true,
      handedness: stableHash(`${name}-hand`) % 5 === 0 ? "Left" : "Right",
      jerseyNumber: String((stableHash(`${team.id}-${name}-jersey`) % 98) + 1),
      role: roles[rosterIndex],
      skill: Math.max(-0.25, Math.min(0.95, baseSkill)),
      createdAt: now,
      updatedAt: now
    };
  })
);

const rawGames = [
  [0, 1],
  [2, 3],
  [4, 5],
  [6, 7],
  [1, 2],
  [3, 4],
  [5, 6],
  [7, 0],
  [0, 2],
  [1, 3],
  [4, 6],
  [5, 7],
  [2, 4],
  [3, 5],
  [6, 0],
  [7, 1],
  [0, 3],
  [1, 4],
  [2, 5],
  [6, 1]
].map(([homeIndex, awayIndex], index) => ({
  id: `game-${String(index + 1).padStart(3, "0")}`,
  date: `2026-0${(index % 5) + 1}-${String(8 + index).padStart(2, "0")}`,
  homeTeamId: teams[homeIndex].id,
  awayTeamId: teams[awayIndex].id
}));

function roster(teamId: string) {
  return players.filter((player) => player.teamId === teamId);
}

function opponentTeamId(game: { homeTeamId: string; awayTeamId: string }, teamId: string) {
  return game.homeTeamId === teamId ? game.awayTeamId : game.homeTeamId;
}

function roleIndex(player: Player) {
  const index = Number(player.id.slice(-2)) - 1;
  return Number.isFinite(index) ? index : 0;
}

function threeAttemptShare(player: Player): number {
  if (player.role.includes("Shooter")) return 0.58;
  if (player.position === "C") return player.skill > 0.45 ? 0.2 : 0.08;
  if (player.position === "PF") return 0.32;
  if (player.position === "PG" || player.position === "SG") return 0.43;
  return 0.38;
}

function playerGameLine(gameId: string, teamId: string, opponentId: string, player: Player, gameIndex: number): PlayerGameStat {
  const index = roleIndex(player);
  const minuteTemplate = [34, 32, 30, 29, 28, 22, 18, 16, 8, 6];
  const minutes = Math.max(4, minuteTemplate[index] + seededNumber(`${gameId}-${player.id}-min`, -3, 4, 1));
  const usageBoost = player.role.includes("Creator") ? 3 : player.role.includes("Scorer") ? 2 : player.position === "C" ? -1 : 0;
  const fga = Math.max(1, Math.round([18, 15, 12, 11, 9, 8, 7, 5, 4, 3][index] + player.skill * 5 + usageBoost + seededNumber(`${gameId}-${player.id}-fga`, -2.2, 2.6)));
  const threePa = Math.min(fga, Math.max(0, Math.round(fga * threeAttemptShare(player) + seededNumber(`${gameId}-${player.id}-3pa`, -1.2, 1.4))));
  const twoPa = fga - threePa;
  const fgPct = Math.max(0.35, Math.min(0.68, 0.43 + player.skill * 0.09 + (player.position === "C" ? 0.08 : 0) + seededNumber(`${gameId}-${player.id}-fg`, -0.045, 0.045, 3)));
  const threePct = Math.max(0.24, Math.min(0.48, 0.33 + player.skill * 0.075 + (player.role.includes("Shooter") ? 0.04 : 0) + seededNumber(`${gameId}-${player.id}-3p`, -0.045, 0.045, 3)));
  const threePm = Math.min(threePa, Math.round(threePa * threePct));
  const twoPm = Math.min(twoPa, Math.round(twoPa * Math.min(0.72, fgPct + (player.position === "C" ? 0.1 : 0.03))));
  const fgm = threePm + twoPm;
  const fta = Math.max(0, Math.round((player.role.includes("Rim") || player.position === "C" ? 0.34 : 0.2) * fga + player.skill * 1.2 + seededNumber(`${gameId}-${player.id}-fta`, -1, 2)));
  const ftm = Math.min(fta, Math.round(fta * Math.max(0.62, Math.min(0.92, 0.75 + player.skill * 0.08))));
  const pts = (fgm - threePm) * 2 + threePm * 3 + ftm;
  const reb = Math.max(0, Math.round((player.position === "C" ? 8 : player.position === "PF" ? 6 : player.position === "SF" ? 4.5 : 3) + player.skill * 2 + seededNumber(`${gameId}-${player.id}-reb`, -2, 2)));
  const ast = Math.max(0, Math.round((player.position === "PG" ? 6 : player.role.includes("Playmaker") ? 4 : 2) + player.skill * 3 + seededNumber(`${gameId}-${player.id}-ast`, -1.5, 1.8)));
  const stl = Math.max(0, Math.round(0.6 + player.skill * 1.1 + seededNumber(`${gameId}-${player.id}-stl`, -0.6, 1.2)));
  const blk = Math.max(0, Math.round((player.position === "C" ? 1.3 : player.position === "PF" ? 0.8 : 0.25) + player.skill * 0.9 + seededNumber(`${gameId}-${player.id}-blk`, -0.5, 0.9)));
  const tov = Math.max(0, Math.round((fga + ast) * 0.09 + seededNumber(`${gameId}-${player.id}-tov`, -0.8, 1.2)));
  const pf = Math.max(0, Math.round(1.5 + seededNumber(`${gameId}-${player.id}-pf`, -1, 1.8)));
  const plusMinus = Math.round((player.skill - 0.25) * 12 + seededNumber(`${gameId}-${player.id}-pm-${gameIndex}`, -9, 9));

  return {
    id: `pgs-${gameId}-${player.id}`,
    gameId,
    playerId: player.id,
    teamId,
    opponentTeamId: opponentId,
    minutes,
    pts,
    reb,
    oreb: Math.max(0, Math.round(reb * (player.position === "C" || player.position === "PF" ? 0.29 : 0.13))),
    dreb: 0,
    ast,
    stl,
    blk,
    tov,
    pf,
    fgm,
    fga,
    threePm,
    threePa,
    ftm,
    fta,
    plusMinus
  };
}

const generatedPlayerLines = rawGames.flatMap((game, gameIndex) =>
  [game.homeTeamId, game.awayTeamId].flatMap((teamId) =>
    roster(teamId).map((player) => {
      const line = playerGameLine(game.id, teamId, opponentTeamId(game, teamId), player, gameIndex);
      return { ...line, dreb: Math.max(0, line.reb - line.oreb) };
    })
  )
);

export const playerGameStats: PlayerGameStat[] = generatedPlayerLines;

export const teamGameStats: TeamGameStat[] = rawGames.flatMap((game) =>
  [game.homeTeamId, game.awayTeamId].map((teamId) => {
    const lines = playerGameStats.filter((line) => line.gameId === game.id && line.teamId === teamId);
    const totals = lines.reduce(
      (acc, line) => ({
        pts: acc.pts + line.pts,
        fgm: acc.fgm + line.fgm,
        fga: acc.fga + line.fga,
        threePm: acc.threePm + line.threePm,
        threePa: acc.threePa + line.threePa,
        ftm: acc.ftm + line.ftm,
        fta: acc.fta + line.fta,
        oreb: acc.oreb + line.oreb,
        dreb: acc.dreb + line.dreb,
        ast: acc.ast + line.ast,
        stl: acc.stl + line.stl,
        blk: acc.blk + line.blk,
        tov: acc.tov + line.tov,
        pf: acc.pf + line.pf
      }),
      { pts: 0, fgm: 0, fga: 0, threePm: 0, threePa: 0, ftm: 0, fta: 0, oreb: 0, dreb: 0, ast: 0, stl: 0, blk: 0, tov: 0, pf: 0 }
    );
    const possessions = Math.round(estimatePossessions(totals.fga, totals.fta, totals.oreb, totals.tov));
    return {
      id: `tgs-${game.id}-${teamId}`,
      gameId: game.id,
      teamId,
      opponentTeamId: opponentTeamId(game, teamId),
      ...totals,
      minutes: 48,
      reb: totals.oreb + totals.dreb,
      possessions
    };
  })
);

export const games: Game[] = rawGames.map((game) => {
  const home = teamGameStats.find((line) => line.gameId === game.id && line.teamId === game.homeTeamId);
  const away = teamGameStats.find((line) => line.gameId === game.id && line.teamId === game.awayTeamId);
  return {
    id: game.id,
    date: game.date,
    season,
    seasonType: "Regular Season",
    homeTeamId: game.homeTeamId,
    awayTeamId: game.awayTeamId,
    homeScore: home?.pts ?? 0,
    awayScore: away?.pts ?? 0,
    status: "Final",
    arena: `${teams.find((team) => team.id === game.homeTeamId)?.city ?? "Metro"} Fieldhouse`
  };
});

export const lineups: Lineup[] = games.flatMap((game) =>
  [game.homeTeamId, game.awayTeamId].map((teamId) => {
    const teamLine = teamGameStats.find((line) => line.gameId === game.id && line.teamId === teamId);
    const opponent = teamGameStats.find((line) => line.gameId === game.id && line.teamId === opponentTeamId(game, teamId));
    const topFive = roster(teamId).slice(0, 5);
    const possessions = Math.round((teamLine?.possessions ?? 98) * 0.62);
    const offensiveRating = ((teamLine?.pts ?? 100) / Math.max(teamLine?.possessions ?? 100, 1)) * 100 + seededNumber(`${game.id}-${teamId}-lineup-o`, -4, 4, 1);
    const defensiveRating = ((opponent?.pts ?? 100) / Math.max(opponent?.possessions ?? 100, 1)) * 100 + seededNumber(`${game.id}-${teamId}-lineup-d`, -4, 4, 1);
    return {
      id: `lu-${game.id}-${teamId}`,
      gameId: game.id,
      teamId,
      player1Id: topFive[0].id,
      player2Id: topFive[1].id,
      player3Id: topFive[2].id,
      player4Id: topFive[3].id,
      player5Id: topFive[4].id,
      startTime: "12:00 Q1",
      endTime: "05:36 Q4",
      possessions,
      offensiveRating,
      defensiveRating,
      netRating: offensiveRating - defensiveRating
    };
  })
);

function shotZoneForAttempt(player: Player, attemptIndex: number, isThree: boolean): ShotZone {
  const code = stableHash(`${player.id}-${attemptIndex}-zone`) % 100;
  if (isThree) return code < 34 ? "Corner Three" : "Above Break Three";
  if (player.position === "C" || player.role.includes("Rim")) return code < 64 ? "Rim" : code < 84 ? "Short Midrange" : "Long Midrange";
  if (player.role.includes("Scorer")) return code < 28 ? "Rim" : code < 58 ? "Long Midrange" : "Short Midrange";
  return code < 38 ? "Rim" : code < 72 ? "Short Midrange" : "Long Midrange";
}

function shotCoordinates(zone: ShotZone, seed: string): { x: number; y: number; distance: number } {
  if (zone === "Rim") return { x: seededNumber(`${seed}-x`, -4, 4, 1), y: seededNumber(`${seed}-y`, 1, 7, 1), distance: seededNumber(`${seed}-d`, 1, 5, 1) };
  if (zone === "Short Midrange") return { x: seededNumber(`${seed}-x`, -13, 13, 1), y: seededNumber(`${seed}-y`, 8, 16, 1), distance: seededNumber(`${seed}-d`, 8, 15, 1) };
  if (zone === "Long Midrange") return { x: seededNumber(`${seed}-x`, -19, 19, 1), y: seededNumber(`${seed}-y`, 15, 22, 1), distance: seededNumber(`${seed}-d`, 16, 22, 1) };
  if (zone === "Corner Three") return { x: stableHash(`${seed}-side`) % 2 ? 22 : -22, y: seededNumber(`${seed}-y`, 1, 8, 1), distance: seededNumber(`${seed}-d`, 22, 24, 1) };
  return { x: seededNumber(`${seed}-x`, -22, 22, 1), y: seededNumber(`${seed}-y`, 22, 31, 1), distance: seededNumber(`${seed}-d`, 24, 30, 1) };
}

const playTypes = ["Transition", "P&R Handler", "P&R Roll Man", "Isolation", "Post-Up", "Handoff", "Cut", "Off-Screen", "Spot-Up", "Putback"];

function playTypeFor(player: Player, index: number): string {
  if (player.position === "PG") return index % 3 === 0 ? "P&R Handler" : playTypes[stableHash(`${player.id}-${index}`) % playTypes.length];
  if (player.position === "C") return index % 3 === 0 ? "P&R Roll Man" : index % 4 === 0 ? "Post-Up" : playTypes[stableHash(`${player.id}-${index}`) % playTypes.length];
  if (player.role.includes("Shooter")) return index % 2 === 0 ? "Spot-Up" : "Off-Screen";
  return playTypes[stableHash(`${player.id}-${index}`) % playTypes.length];
}

function contestLevel(distance: number): Shot["contestLevel"] {
  if (distance >= 6) return "Open";
  if (distance >= 4) return "Light";
  if (distance >= 2) return "Tight";
  return "Smothered";
}

function buildEvents() {
  const eventShots: Shot[] = [];
  const eventPossessions: Possession[] = [];
  const eventPasses: Pass[] = [];
  const eventRebounds: Rebound[] = [];
  const eventDefensiveEvents: DefensiveEvent[] = [];

  for (const line of playerGameStats) {
    const player = players.find((item) => item.id === line.playerId)!;
    const game = games.find((item) => item.id === line.gameId)!;
    const opponentRoster = roster(line.opponentTeamId);
    const teammateRoster = roster(line.teamId).filter((item) => item.id !== player.id);
    const teamLineup = lineups.find((item) => item.gameId === line.gameId && item.teamId === line.teamId)!;
    const opponentLineup = lineups.find((item) => item.gameId === line.gameId && item.teamId === line.opponentTeamId)!;
    const twoPointMakes = line.fgm - line.threePm;
    const twoPointAttempts = line.fga - line.threePa;

    for (let index = 0; index < line.fga; index += 1) {
      const isThree = index < line.threePa;
      const made = isThree ? index < line.threePm : index - line.threePa < twoPointMakes;
      const zone = shotZoneForAttempt(player, index, isThree);
      const pointsValue = isThree ? 3 : 2;
      const shotSeed = `${line.id}-${index}`;
      const coords = shotCoordinates(zone, shotSeed);
      const defender = opponentRoster[(index + roleIndex(player)) % opponentRoster.length];
      const assister = teammateRoster[(index + 2) % teammateRoster.length];
      const assisted = stableHash(`${shotSeed}-assist`) % 100 < (player.position === "PG" ? 30 : 58);
      const quarter = (index % 4) + 1;
      const clock = formatClock(Math.max(12, 710 - (index * 43 + stableHash(shotSeed) % 38)));
      const playType = playTypeFor(player, index);
      const defenderDistance = seededNumber(`${shotSeed}-def-dist`, 0.9, 8.7, 1);
      const shotClock = Math.round(seededNumber(`${shotSeed}-shot-clock`, 2, 23));
      const isCatchAndShoot = playType === "Spot-Up" || playType === "Off-Screen" || assisted;
      const isPullUp = player.position === "PG" || player.role.includes("Scorer") ? stableHash(`${shotSeed}-pull`) % 100 < 48 : false;
      const model = expectedShotValue({
        shotDistance: coords.distance,
        shotZone: zone,
        pointsValue,
        defenderDistance,
        touchTime: seededNumber(`${shotSeed}-touch`, isCatchAndShoot ? 0.6 : 2.8, isCatchAndShoot ? 2.5 : 8.5, 1),
        dribblesBeforeShot: Math.round(seededNumber(`${shotSeed}-dribbles`, isCatchAndShoot ? 0 : 2, isPullUp ? 9 : 5)),
        shotClock,
        playerSkill: player.skill,
        playType,
        transition: playType === "Transition",
        catchAndShoot: isCatchAndShoot,
        pullUp: isPullUp,
        quarter,
        clutch: quarter === 4 && shotClock <= 8
      });
      const actualPoints = made ? pointsValue : 0;
      const possessionId = `poss-${line.gameId}-${line.playerId}-${index}`;
      const shot: Shot = {
        id: `shot-${line.gameId}-${line.playerId}-${index}`,
        possessionId,
        gameId: line.gameId,
        season: game.season,
        playerId: line.playerId,
        teamId: line.teamId,
        defenderId: defender.id,
        assisterId: assisted ? assister.id : undefined,
        quarter,
        clock,
        x: coords.x,
        y: coords.y,
        shotDistance: coords.distance,
        shotZone: zone,
        shotType: zone === "Rim" ? (player.position === "C" ? "Dunk" : "Layup") : isCatchAndShoot ? "Catch-and-Shoot" : isPullUp ? "Pull-Up" : "Stepback",
        pointsValue,
        made,
        assisted,
        dribblesBeforeShot: isCatchAndShoot ? 0 : Math.round(seededNumber(`${shotSeed}-drib`, 1, 9)),
        touchTime: seededNumber(`${shotSeed}-touch-final`, isCatchAndShoot ? 0.7 : 2.4, isCatchAndShoot ? 2.4 : 8.6, 1),
        defenderDistance,
        closestDefender: defender.name,
        contestLevel: contestLevel(defenderDistance),
        shotClock,
        expectedFgPct: model.expectedFgPct,
        expectedPoints: model.expectedPoints,
        actualMinusExpected: actualPoints - model.expectedPoints,
        playType,
        isClutch: quarter === 4 && shotClock <= 8,
        isTransition: playType === "Transition",
        isCatchAndShoot,
        isPullUp,
        isAtRim: zone === "Rim",
        isCornerThree: zone === "Corner Three",
        isAboveBreakThree: zone === "Above Break Three"
      };

      eventShots.push(shot);
      eventPossessions.push({
        id: possessionId,
        gameId: line.gameId,
        season: game.season,
        quarter,
        clock,
        offenseTeamId: line.teamId,
        defenseTeamId: line.opponentTeamId,
        lineupOffenseId: teamLineup.id,
        lineupDefenseId: opponentLineup.id,
        possessionNumber: eventPossessions.length + 1,
        startType: index % 5 === 0 ? "Live Rebound" : index % 7 === 0 ? "Turnover" : "Inbound",
        playType,
        primaryPlayerId: line.playerId,
        screenerPlayerId: teammateRoster[(index + 3) % teammateRoster.length].id,
        passerPlayerId: assisted ? assister.id : undefined,
        defenderPlayerId: defender.id,
        resultType: made ? "Made Shot" : "Missed Shot",
        points: actualPoints,
        expectedPoints: model.expectedPoints,
        actualMinusExpected: actualPoints - model.expectedPoints,
        turnover: false,
        foulDrawn: index < line.fta,
        offensiveRebound: !made && stableHash(`${shotSeed}-oreb`) % 100 < 24,
        transition: playType === "Transition",
        clutch: quarter === 4 && shotClock <= 8,
        garbageTime: Math.abs(game.homeScore - game.awayScore) > 18 && quarter === 4,
        createdAt: now
      });

      if (assisted) {
        eventPasses.push({
          id: `pass-${line.gameId}-${line.playerId}-${index}`,
          possessionId,
          passerId: assister.id,
          receiverId: line.playerId,
          gameId: line.gameId,
          season: game.season,
          quarter,
          clock,
          passType: isCatchAndShoot ? "Kickout" : "Pocket",
          ledToShot: true,
          ledToAssist: made,
          potentialAssist: true,
          secondaryAssist: index % 4 === 0,
          expectedAssistValue: model.expectedPoints,
          xStart: seededNumber(`${shotSeed}-pass-xs`, -22, 22, 1),
          yStart: seededNumber(`${shotSeed}-pass-ys`, 3, 26, 1),
          xEnd: coords.x,
          yEnd: coords.y
        });
      }

      if (!made) {
        const rebounderRoster = eventPossessions[eventPossessions.length - 1].offensiveRebound ? teammateRoster : opponentRoster;
        const rebounder = rebounderRoster[(index + 1) % rebounderRoster.length];
        eventRebounds.push({
          id: `reb-${line.gameId}-${line.playerId}-${index}`,
          gameId: line.gameId,
          possessionId,
          playerId: rebounder.id,
          teamId: rebounder.teamId,
          reboundType: rebounder.teamId === line.teamId ? "Offensive" : "Defensive",
          contested: stableHash(`${shotSeed}-cont-reb`) % 100 < 38,
          chance: true,
          distance: seededNumber(`${shotSeed}-reb-dist`, 2, 14, 1),
          boxoutByPlayerId: opponentRoster[(index + 2) % opponentRoster.length].id
        });
      }

      eventDefensiveEvents.push({
        id: `def-${line.gameId}-${line.playerId}-${index}`,
        gameId: line.gameId,
        possessionId,
        defenderId: defender.id,
        offensivePlayerId: line.playerId,
        eventType: shot.contestLevel === "Open" ? "Late Closeout" : "Shot Contest",
        shotContested: shot.contestLevel !== "Open",
        rimContest: shot.isAtRim && shot.contestLevel !== "Open",
        deflection: stableHash(`${shotSeed}-deflect`) % 100 < 12,
        steal: false,
        block: !made && shot.isAtRim && stableHash(`${shotSeed}-block`) % 100 < 8,
        chargeDrawn: playType === "Transition" && stableHash(`${shotSeed}-charge`) % 100 < 3,
        closeoutSpeed: seededNumber(`${shotSeed}-closeout`, 8, 19, 1),
        matchupDuration: seededNumber(`${shotSeed}-matchup`, 1.2, 7.8, 1),
        expectedPointsAllowed: model.expectedPoints,
        actualPointsAllowed: actualPoints
      });
    }
  }

  return { eventShots, eventPossessions, eventPasses, eventRebounds, eventDefensiveEvents };
}

const generatedEvents = buildEvents();

export const shots: Shot[] = generatedEvents.eventShots;
export const possessions: Possession[] = generatedEvents.eventPossessions;
export const passes: Pass[] = generatedEvents.eventPasses;
export const rebounds: Rebound[] = generatedEvents.eventRebounds;
export const defensiveEvents: DefensiveEvent[] = generatedEvents.eventDefensiveEvents;

export const insights = [
  {
    title: "The league's best rim pressure creators",
    body: "New York Harbor and San Antonio Forge guards bend the floor by combining drive volume with rim attempts and foul pressure.",
    href: "/leaderboards?category=Creation&metric=rim_pressure_score"
  },
  {
    title: "Players outperforming expected shot value",
    body: "Shotmakers with positive actual-minus-expected profiles are separating themselves from players living only on easy attempts.",
    href: "/leaderboards?category=Shot%20Quality&metric=actual_minus_expected_points"
  },
  {
    title: "Best young defenders by contest value",
    body: "Switch wings and mobile bigs rate well when matchup difficulty, contest rate, and opponent xFG are combined.",
    href: "/leaderboards?category=Defense&metric=defensive_playmaking"
  }
];

export function playerTrueShooting(line: PlayerGameStat): number {
  return trueShootingPercentage(line.pts, line.fga, line.fta) ?? 0;
}
