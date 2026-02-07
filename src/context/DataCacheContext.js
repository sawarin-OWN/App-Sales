import React, { createContext, useContext, useState, useCallback } from 'react';

const DataCacheContext = createContext();

// Cache expiration time: 5 minutes (300000 ms)
const CACHE_EXPIRY = 5 * 60 * 1000;

export function useDataCache() {
  const context = useContext(DataCacheContext);
  if (!context) {
    throw new Error('useDataCache must be used within DataCacheProvider');
  }
  return context;
}

export function DataCacheProvider({ children }) {
  // Cache structure: { key: { data, timestamp, params } }
  const [cache, setCache] = useState({});

  /**
   * Get cached data if available and not expired
   * @param {string} key - Cache key
   * @param {object} params - Parameters used to fetch the data (for comparison)
   * @returns {object|null} - Cached data or null if not found/expired
   */
  const getCachedData = useCallback((key, params = {}) => {
    const cached = cache[key];
    if (!cached) return null;

    // Check if expired
    const now = Date.now();
    if (now - cached.timestamp > CACHE_EXPIRY) {
      // Remove expired cache
      setCache(prev => {
        const newCache = { ...prev };
        delete newCache[key];
        return newCache;
      });
      return null;
    }

    // Check if params match (simple deep comparison for common cases)
    const paramsMatch = JSON.stringify(cached.params) === JSON.stringify(params);
    if (!paramsMatch) {
      return null;
    }

    return cached.data;
  }, [cache]);

  /**
   * Set data in cache
   * @param {string} key - Cache key
   * @param {object} data - Data to cache
   * @param {object} params - Parameters used to fetch the data
   */
  const setCachedData = useCallback((key, data, params = {}) => {
    setCache(prev => ({
      ...prev,
      [key]: {
        data,
        timestamp: Date.now(),
        params
      }
    }));
  }, []);

  /**
   * Clear specific cache entry
   * @param {string} key - Cache key to clear
   */
  const clearCache = useCallback((key) => {
    setCache(prev => {
      const newCache = { ...prev };
      delete newCache[key];
      return newCache;
    });
  }, []);

  /**
   * Clear all cache
   */
  const clearAllCache = useCallback(() => {
    setCache({});
  }, []);

  /**
   * Invalidate cache for a specific key (mark as expired)
   * This is useful when data is updated and we want to force a refresh
   * @param {string} key - Cache key to invalidate
   */
  const invalidateCache = useCallback((key) => {
    clearCache(key);
  }, [clearCache]);

  /**
   * Invalidate multiple cache keys
   * @param {string[]} keys - Array of cache keys to invalidate
   */
  const invalidateMultiple = useCallback((keys) => {
    setCache(prev => {
      const newCache = { ...prev };
      keys.forEach(key => {
        delete newCache[key];
      });
      return newCache;
    });
  }, []);

  /**
   * Invalidate cache keys matching a pattern
   * @param {string} pattern - Pattern to match (supports * wildcard)
   */
  const invalidatePattern = useCallback((pattern) => {
    setCache(prev => {
      const newCache = { ...prev };
      const regex = new RegExp('^' + pattern.replace(/\*/g, '.*') + '$');
      Object.keys(newCache).forEach(key => {
        if (regex.test(key)) {
          delete newCache[key];
        }
      });
      return newCache;
    });
  }, []);

  const value = {
    getCachedData,
    setCachedData,
    clearCache,
    clearAllCache,
    invalidateCache,
    invalidateMultiple,
    invalidatePattern
  };

  return (
    <DataCacheContext.Provider value={value}>
      {children}
    </DataCacheContext.Provider>
  );
}
