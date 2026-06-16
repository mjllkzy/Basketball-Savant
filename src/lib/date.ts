export function formatShortDate(date: string): string {
  const [rawYear, rawMonth, rawDay] = date.slice(0, 10).split("-");
  const year = Number(rawYear);
  const month = Number(rawMonth);
  const day = Number(rawDay);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return date;
  return `${month}/${day}/${String(year).slice(-2)}`;
}
