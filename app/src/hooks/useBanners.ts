import { useEffect, useCallback } from 'react';
import { useContentCacheStore } from '@/state/contentCacheStore';

export function useBanners() {
  const banners = useContentCacheStore((s) => s.banners);
  const loading = useContentCacheStore((s) => s.bannersLoading);
  const error = useContentCacheStore((s) => s.bannersError);
  const getBanners = useContentCacheStore((s) => s.getBanners);

  useEffect(() => {
    // Only fetches from backend if not already in session cache
    getBanners();
  }, [getBanners]);

  const refresh = useCallback(async () => {
    return getBanners(true);
  }, [getBanners]);

  return {
    banners,
    loading,
    error,
    refresh,
  };
}
