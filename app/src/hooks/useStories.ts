import { useState, useEffect, useCallback } from 'react';
import { UserStory } from '@/types/story';
import { listStories, BackendStory } from '@/api/stories';
import { API_BASE_URL } from '@/config/api';

export const LOCAL_STORY_IMAGES: Record<string, any> = {
  'story1/Copy_of_DSC_2885_ehyu7g.jpg': require('@/assets/story1/Copy_of_DSC_2885_ehyu7g.jpg'),
  'story1/Copy_of_JPG06242_hugpaw.jpg': require('@/assets/story1/Copy_of_JPG06242_hugpaw.jpg'),
  'story2/Copy_of_DSC09217_cesaci.jpg': require('@/assets/story2/Copy_of_DSC09217_cesaci.jpg'),
  'story2/Copy_of_JPG06985_hrr7ta.jpg': require('@/assets/story2/Copy_of_JPG06985_hrr7ta.jpg'),
  'story2/Copy_of_OWL02218_ofmovh.jpg': require('@/assets/story2/Copy_of_OWL02218_ofmovh.jpg'),
  'story3/Copy_of_KAREE_SAT_PBKS-87_pllsr4.jpg': require('@/assets/story3/Copy_of_KAREE_SAT_PBKS-87_pllsr4.jpg'),
  'story3/Copy_of_OWL02359_lyncrp.jpg': require('@/assets/story3/Copy_of_OWL02359_lyncrp.jpg'),
};

export function resolveStoryImage(pathOrUrl: string): any {
  if (!pathOrUrl) return null;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  if (LOCAL_STORY_IMAGES[pathOrUrl]) {
    return LOCAL_STORY_IMAGES[pathOrUrl];
  }
  for (const [key, val] of Object.entries(LOCAL_STORY_IMAGES)) {
    if (pathOrUrl.endsWith(key) || key.endsWith(pathOrUrl)) {
      return val;
    }
    const baseKey = key.split('/').pop();
    const baseTarget = pathOrUrl.split('/').pop();
    if (baseKey && baseTarget && baseKey === baseTarget) {
      return val;
    }
  }
  return `${API_BASE_URL.replace(/\/api\/v1\/?$/, '')}/static/${pathOrUrl}`;
}

export const SEEDED_STORIES: UserStory[] = [];

export const useStories = () => {
  const { useContentCacheStore } = require('@/state/contentCacheStore');
  const stories = useContentCacheStore((s: any) => s.stories);
  const loading = useContentCacheStore((s: any) => s.storiesLoading);
  const error = useContentCacheStore((s: any) => s.storiesError);
  const getStories = useContentCacheStore((s: any) => s.getStories);

  useEffect(() => {
    getStories();
  }, [getStories]);

  const refresh = useCallback(async () => {
    return getStories(true);
  }, [getStories]);

  return {
    stories,
    loading,
    error,
    refresh,
  };
};
