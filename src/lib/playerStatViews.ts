export type PlayerStatView = "standard" | "advanced" | "contracts";

export function parsePlayerStatView(value: string | null | undefined): PlayerStatView {
  if (value === "advanced" || value === "contracts") return value;
  return "standard";
}
