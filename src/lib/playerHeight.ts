export function formatPlayerHeight(height: string | null | undefined) {
  const trimmed = height?.trim();
  if (!trimmed || /^n\/a$/i.test(trimmed)) return "N/A";

  const match = trimmed.match(/^(\d+)-(\d{1,2})$/);
  if (!match) return trimmed;

  return `${Number(match[1])}'${Number(match[2])}`;
}
