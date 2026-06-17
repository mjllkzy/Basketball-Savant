export type SortableTableValue = string | number | null | undefined;

export function parseSortableNumber(value: SortableTableValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (!trimmed || /^(n\/a|na|--|-)$/i.test(trimmed)) return null;

  const normalized = trimmed.replace(/\u2212/g, "-").replace(/,/g, "").replace(/\s/g, "");
  const numericText = normalized.endsWith("%") ? normalized.slice(0, -1) : normalized;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(numericText)) return null;

  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? parsed : null;
}

export function compareStatTableValues(a: SortableTableValue, b: SortableTableValue): number {
  const aNumber = parseSortableNumber(a);
  const bNumber = parseSortableNumber(b);

  if (aNumber !== null && bNumber !== null) return aNumber - bNumber;
  if (aNumber !== null) return -1;
  if (bNumber !== null) return 1;

  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
}
