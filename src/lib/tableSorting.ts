export type SortableTableValue = string | number | null | undefined;
export type SortDirection = "asc" | "desc";

export function isMissingSortableValue(value: SortableTableValue): boolean {
  if (value === null || value === undefined) return true;
  if (typeof value === "number") return !Number.isFinite(value);
  return /^(|n\/a|na|--|-)$/i.test(value.trim());
}

export function parseSortableNumber(value: SortableTableValue): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  if (isMissingSortableValue(trimmed)) return null;

  const normalized = trimmed.replace(/\u2212/g, "-").replace(/,/g, "").replace(/\s/g, "");
  const numericText = normalized.endsWith("%") ? normalized.slice(0, -1) : normalized;
  if (!/^[+-]?(?:\d+\.?\d*|\.\d+)$/.test(numericText)) return null;

  const parsed = Number(numericText);
  return Number.isFinite(parsed) ? parsed : null;
}

export function compareStatTableValues(a: SortableTableValue, b: SortableTableValue): number {
  const aMissing = isMissingSortableValue(a);
  const bMissing = isMissingSortableValue(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  const aNumber = parseSortableNumber(a);
  const bNumber = parseSortableNumber(b);

  if (aNumber !== null && bNumber !== null) return aNumber - bNumber;
  if (aNumber !== null) return -1;
  if (bNumber !== null) return 1;

  return String(a ?? "").localeCompare(String(b ?? ""), undefined, { numeric: true, sensitivity: "base" });
}

export function compareStatTableValuesForSort(a: SortableTableValue, b: SortableTableValue, direction: SortDirection): number {
  const aMissing = isMissingSortableValue(a);
  const bMissing = isMissingSortableValue(b);
  if (aMissing && bMissing) return 0;
  if (aMissing) return 1;
  if (bMissing) return -1;

  const compared = compareStatTableValues(a, b);
  return direction === "asc" ? compared : -compared;
}
