type CacheEntry<T> = {
  expiresAt: number;
  value: Promise<T>;
};

type CacheOptions<TArgs extends unknown[]> = {
  ttlMs: number;
  maxEntries?: number;
  key?: (...args: TArgs) => string;
};

function normalizeForKey(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(normalizeForKey);
  if (!value || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, entryValue]) => entryValue !== undefined)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([entryKey, entryValue]) => [entryKey, normalizeForKey(entryValue)]),
  );
}

export function serverCacheKey(...values: unknown[]) {
  return JSON.stringify(values.map(normalizeForKey));
}

export function memoizeServer<TArgs extends unknown[], TResult>(
  loader: (...args: TArgs) => Promise<TResult>,
  options: CacheOptions<TArgs>,
) {
  const maxEntries = options.maxEntries ?? 100;
  const entries = new Map<string, CacheEntry<TResult>>();

  return async (...args: TArgs): Promise<TResult> => {
    const now = Date.now();
    const key = options.key ? options.key(...args) : serverCacheKey(...args);
    const cached = entries.get(key);
    if (cached && cached.expiresAt > now) return cached.value;

    const value = loader(...args).catch((error) => {
      if (entries.get(key)?.value === value) entries.delete(key);
      throw error;
    });
    entries.set(key, { expiresAt: now + options.ttlMs, value });

    if (entries.size > maxEntries) {
      const oldestKey = entries.keys().next().value;
      if (oldestKey) entries.delete(oldestKey);
    }

    return value;
  };
}
