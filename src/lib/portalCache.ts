'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

// In-memory client-side cache scoped to the current browser session
const cacheMap = new Map<string, CacheEntry<any>>();

// Subscribers for real-time cache mutations
const listenersMap = new Map<string, Set<(data: any) => void>>();

/**
 * Retrieve current cached data synchronously (0ms latency)
 */
export function getCached<T>(key: string, ttlMs = 120_000): T | null {
  const entry = cacheMap.get(key);
  if (!entry) return null;
  const isExpired = Date.now() - entry.timestamp > ttlMs;
  // Even if stale, SWR returns stale data immediately while revalidating
  return entry.data as T;
}

/**
 * Update cache and notify all active mounted subscribers
 */
export function setCached<T>(key: string, data: T): void {
  cacheMap.set(key, { data, timestamp: Date.now() });
  const listeners = listenersMap.get(key);
  if (listeners) {
    listeners.forEach((fn) => {
      try {
        fn(data);
      } catch (e) {
        console.error('Cache listener error:', e);
      }
    });
  }
}

/**
 * Invalidate cache matching a key or pattern
 */
export function invalidateCache(keyOrPrefix: string): void {
  for (const k of Array.from(cacheMap.keys())) {
    if (k === keyOrPrefix || k.startsWith(keyOrPrefix)) {
      cacheMap.delete(k);
    }
  }
}

/**
 * Clear user-specific cache completely on logout or account switch
 */
export function clearPortalCache(): void {
  cacheMap.clear();
}

/**
 * Stale-While-Revalidate custom hook for high-performance instant tab switching
 */
export function usePortalSWR<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    ttlMs?: number;
    revalidateOnFocus?: boolean;
    initialData?: T;
  }
) {
  const ttlMs = options?.ttlMs ?? 120_000;
  const initial = getCached<T>(key, ttlMs) ?? options?.initialData ?? null;

  const [data, setData] = useState<T | null>(initial);
  const [isValidating, setIsValidating] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);
  const [hasData, setHasData] = useState<boolean>(initial !== null);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;

  const revalidate = useCallback(async () => {
    setIsValidating(true);
    try {
      const fresh = await fetcherRef.current();
      setCached(key, fresh);
      setData(fresh);
      setHasData(true);
      setError(null);
    } catch (err: any) {
      setError(err);
    } finally {
      setIsValidating(false);
    }
  }, [key]);

  useEffect(() => {
    // Subscribe to cache updates from mutations
    let listeners = listenersMap.get(key);
    if (!listeners) {
      listeners = new Set();
      listenersMap.set(key, listeners);
    }
    const updateHandler = (newData: T) => {
      setData(newData);
      setHasData(true);
    };
    listeners.add(updateHandler);

    // Initial check: if cache exists, use it and revalidate in background
    const cached = getCached<T>(key, ttlMs);
    if (cached) {
      setData(cached);
      setHasData(true);
      // Background revalidation
      revalidate();
    } else {
      revalidate();
    }

    return () => {
      listeners?.delete(updateHandler);
      if (listeners?.size === 0) {
        listenersMap.delete(key);
      }
    };
  }, [key, ttlMs, revalidate]);

  const mutate = useCallback(
    (updater: T | ((prev: T | null) => T), shouldRevalidate = true) => {
      setData((prev) => {
        const next = typeof updater === 'function' ? (updater as any)(prev) : updater;
        setCached(key, next);
        return next;
      });
      if (shouldRevalidate) {
        revalidate();
      }
    },
    [key, revalidate]
  );

  return {
    data,
    isLoading: !hasData && !error,
    isValidating,
    error,
    revalidate,
    mutate,
  };
}
