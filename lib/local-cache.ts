/**
 * Local Storage Cache with TTL
 * For static data that rarely changes (statuses, workspace metadata, etc.)
 */

interface CacheItem<T> {
  data: T
  expiry: number
}

export const localCache = {
  /**
   * Set data in cache with TTL (milliseconds)
   */
  set: <T>(key: string, data: T, ttl: number): void => {
    if (typeof window === 'undefined') return
    
    try {
      const item: CacheItem<T> = {
        data,
        expiry: Date.now() + ttl,
      }
      localStorage.setItem(`zebi_cache_${key}`, JSON.stringify(item))
    } catch (error) {
      console.warn('Failed to set cache:', error)
    }
  },

  /**
   * Get data from cache (returns null if expired or not found)
   */
  get: <T>(key: string): T | null => {
    if (typeof window === 'undefined') return null
    
    try {
      const item = localStorage.getItem(`zebi_cache_${key}`)
      if (!item) return null

      const parsed: CacheItem<T> = JSON.parse(item)
      
      // Check if expired
      if (Date.now() > parsed.expiry) {
        localStorage.removeItem(`zebi_cache_${key}`)
        return null
      }

      return parsed.data
    } catch (error) {
      console.warn('Failed to get cache:', error)
      return null
    }
  },

  /**
   * Remove item from cache
   */
  remove: (key: string): void => {
    if (typeof window === 'undefined') return
    try {
      localStorage.removeItem(`zebi_cache_${key}`)
    } catch (error) {
      console.warn('Failed to remove cache:', error)
    }
  },

  /**
   * Clear all Zebi cache
   */
  clearAll: (): void => {
    if (typeof window === 'undefined') return
    try {
      const keys = Object.keys(localStorage)
      keys.forEach(key => {
        if (key.startsWith('zebi_cache_')) {
          localStorage.removeItem(key)
        }
      })
    } catch (error) {
      console.warn('Failed to clear cache:', error)
    }
  },
}

/**
 * Cache TTL presets
 */
export const CACHE_TTL = {
  SHORT: 30 * 1000, // 30 seconds
  MEDIUM: 5 * 60 * 1000, // 5 minutes
  LONG: 60 * 60 * 1000, // 1 hour
  DAY: 24 * 60 * 60 * 1000, // 24 hours
}

/**
 * Hook to use cached data with React Query
 * Provides immediate data from localStorage while React Query fetches fresh data
 */
export function useCachedQuery<T>(
  cacheKey: string,
  initialData: T | null = null
): T | null {
  if (typeof window === 'undefined') return initialData
  
  const cached = localCache.get<T>(cacheKey)
  return cached || initialData
}
