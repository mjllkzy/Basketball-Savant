import type { ShotZone } from "@/lib/types";
import { expectedPoints } from "@/lib/metrics/formulas";

export type ExpectedShotInput = {
  shotDistance: number;
  shotZone: ShotZone;
  pointsValue: 2 | 3;
  defenderDistance: number;
  touchTime: number;
  dribblesBeforeShot: number;
  shotClock: number;
  playerSkill: number;
  playType: string;
  transition: boolean;
  catchAndShoot: boolean;
  pullUp: boolean;
  quarter: number;
  clutch: boolean;
};

const zoneBaselines: Record<ShotZone, number> = {
  Rim: 0.675,
  "Short Midrange": 0.455,
  "Long Midrange": 0.405,
  "Corner Three": 0.392,
  "Above Break Three": 0.356
};

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function expectedShotValue(input: ExpectedShotInput): { expectedFgPct: number; expectedPoints: number } {
  let fg = zoneBaselines[input.shotZone] ?? 0.45;

  if (input.defenderDistance >= 6) fg += input.pointsValue === 3 ? 0.045 : 0.035;
  if (input.defenderDistance < 4) fg -= 0.035;
  if (input.defenderDistance < 2) fg -= 0.075;

  if (input.catchAndShoot) fg += input.pointsValue === 3 ? 0.03 : 0.01;
  if (input.pullUp) fg -= input.pointsValue === 3 ? 0.028 : 0.018;
  if (input.transition) fg += 0.028;
  if (/post|isolation/i.test(input.playType)) fg -= 0.012;
  if (/cut|roll/i.test(input.playType)) fg += 0.025;

  if (input.shotClock <= 4) fg -= 0.06;
  else if (input.shotClock <= 7) fg -= 0.025;
  else if (input.shotClock >= 18) fg += 0.012;

  if (input.touchTime > 6) fg -= 0.018;
  if (input.dribblesBeforeShot >= 7) fg -= 0.02;
  if (input.clutch) fg -= 0.012;

  fg += clamp(input.playerSkill, -1, 1) * 0.035;

  const expectedFgPct = clamp(fg, 0.18, 0.82);
  return {
    expectedFgPct,
    expectedPoints: expectedPoints(expectedFgPct, input.pointsValue)
  };
}
