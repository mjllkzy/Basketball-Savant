export const blankPlayerHeadshotUrl = "/headshots/placeholder.svg";

export function nbaPlayerHeadshotUrl(playerId: string) {
  return /^\d+$/.test(playerId)
    ? `https://cdn.nba.com/headshots/nba/latest/1040x760/${playerId}.png`
    : blankPlayerHeadshotUrl;
}
