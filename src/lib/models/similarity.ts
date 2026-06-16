export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length || a.length === 0) return 0;
  const dot = a.reduce((sum, value, index) => sum + value * b[index], 0);
  const magA = Math.sqrt(a.reduce((sum, value) => sum + value * value, 0));
  const magB = Math.sqrt(b.reduce((sum, value) => sum + value * value, 0));
  if (magA === 0 || magB === 0) return 0;
  return dot / (magA * magB);
}

export function minMaxNormalize(rows: Array<Record<string, number>>, keys: string[]): Array<Record<string, number>> {
  const ranges = keys.reduce<Record<string, { min: number; max: number }>>((acc, key) => {
    const values = rows.map((row) => row[key]).filter(Number.isFinite);
    acc[key] = { min: Math.min(...values), max: Math.max(...values) };
    return acc;
  }, {});

  return rows.map((row) => {
    const normalized: Record<string, number> = {};
    for (const key of keys) {
      const range = ranges[key];
      normalized[key] = range.max === range.min ? 0.5 : (row[key] - range.min) / (range.max - range.min);
    }
    return normalized;
  });
}
