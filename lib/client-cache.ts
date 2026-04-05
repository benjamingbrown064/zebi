// lib/client-cache.ts
// Module-level in-memory cache for client-side data
// Survives React re-renders and component unmounts
// Does NOT survive page refresh (intentional — fresh data on reload)

interface CacheEntry<T> {
  data: T
  fetchedAt: number
}

const cache = new Map<string, CacheEntry<unknown>>()

export const DEFAULT_TTL = 60 * 1000      // 60 seconds — default
export const STABLE_TTL = 5 * 60 * 1000  // 5 minutes — for spaces, projects, objectives
export const SHORT_TTL  = 30 * 1000      // 30 seconds — for tasks, now summary

export function getCache<T>(key: string, ttl = DEFAULT_TTL): T | null {
  const entry = cache.get(key) as CacheEntry<T> | undefined
  if (!entry) return null
  if (Date.now() - entry.fetchedAt > ttl) {
    cache.delete(key)
    return null
  }
  return entry.data
}

export function setCache<T>(key: string, data: T): void {
  cache.set(key, { data, fetchedAt: Date.now() })
}

export function invalidateCache(keyPrefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(keyPrefix)) cache.delete(key)
  }
}

export function clearCache(): void {
  cache.clear()
}

/**
 * cachedFetch — drop-in replacement for fetch() with cache.
 * If cached and fresh, returns immediately without network call.
 */
export async function cachedFetch<T>(
  url: string,
  options?: RequestInit & { ttl?: number }
): Promise<T> {
  const { ttl = DEFAULT_TTL, ...fetchOptions } = options || {}
  
  // Only cache GET requests
  if (!fetchOptions.method || fetchOptions.method === 'GET') {
    const cached = getCache<T>(url, ttl)
    if (cached !== null) return cached
  }

  const res = await fetch(url, fetchOptions)
  if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${url}`)
  const data: T = await res.json()

  if (!fetchOptions.method || fetchOptions.method === 'GET') {
    setCache(url, data)
  }

  return data
}
