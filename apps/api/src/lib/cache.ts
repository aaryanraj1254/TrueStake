// Tiny in-memory TTL cache for live-data endpoints. Keeps us under provider
// rate limits and gives sub-ms responses for hot keys.

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

export function getCached<T>(key: string): T | undefined {
  const entry = store.get(key);
  if (!entry) return undefined;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return undefined;
  }
  return entry.value as T;
}

export function setCached<T>(key: string, value: T, ttlMs: number): void {
  store.set(key, { value, expiresAt: Date.now() + ttlMs });
}

/**
 * Returns cached value if fresh, otherwise runs `loader`, caches and returns it.
 * On loader failure, falls back to stale cache if present, else rethrows.
 */
export async function cached<T>(key: string, ttlMs: number, loader: () => Promise<T>): Promise<T> {
  const hit = getCached<T>(key);
  if (hit !== undefined) return hit;
  try {
    const value = await loader();
    setCached(key, value, ttlMs);
    return value;
  } catch (err) {
    const stale = store.get(key);
    if (stale) return stale.value as T;
    throw err;
  }
}
