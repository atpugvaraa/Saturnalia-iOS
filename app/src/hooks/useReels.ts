import { useEffect, useCallback } from 'react';
import { useContentCacheStore } from '@/state/contentCacheStore';

export function useReels() {
  const reels = useContentCacheStore((s) => s.reels);
  const loading = useContentCacheStore((s) => s.reelsLoading);
  const error = useContentCacheStore((s) => s.reelsError);
  const getReels = useContentCacheStore((s) => s.getReels);

  useEffect(() => {
    // Only fetches from backend if not already in session cache
    getReels();
  }, [getReels]);

  const refresh = useCallback(async () => {
    return getReels(true);
  }, [getReels]);

  return {
    reels,
    loading,
    error,
    refresh,
  };
}
