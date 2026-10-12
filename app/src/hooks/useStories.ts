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

export const SEEDED_STORIES: UserStory[] = [
  {
    userId: 'event-1',
    name: 'Event 1',
    stories: [
      {
        storyId: 's1-1',
        storyLink: require('@/assets/story1/Copy_of_DSC_2885_ehyu7g.jpg'),
        storyUploadTime: Date.now(),
        storyExpiryTime: Date.now() + 86400000 * 365,
        mediaType: 'image',
      },
      {
        storyId: 's1-2',
        storyLink: require('@/assets/story1/Copy_of_JPG06242_hugpaw.jpg'),
        storyUploadTime: Date.now(),
        storyExpiryTime: Date.now() + 86400000 * 365,
        mediaType: 'image',
      },
    ],
    photoURL: require('@/assets/story1/Copy_of_DSC_2885_ehyu7g.jpg'),
    lastUploadTime: Date.now(),
  },
  {
    userId: 'event-2',
    name: 'Event 2',
    stories: [
      {
        storyId: 's2-1',
        storyLink: require('@/assets/story2/Copy_of_DSC09217_cesaci.jpg'),
        storyUploadTime: Date.now(),
        storyExpiryTime: Date.now() + 86400000 * 365,
        mediaType: 'image',
      },
      {
        storyId: 's2-2',
        storyLink: require('@/assets/story2/Copy_of_JPG06985_hrr7ta.jpg'),
        storyUploadTime: Date.now(),
        storyExpiryTime: Date.now() + 86400000 * 365,
        mediaType: 'image',
      },
      {
        storyId: 's2-3',
        storyLink: require('@/assets/story2/Copy_of_OWL02218_ofmovh.jpg'),
        storyUploadTime: Date.now(),
        storyExpiryTime: Date.now() + 86400000 * 365,
        mediaType: 'image',
      },
    ],
    photoURL: require('@/assets/story2/Copy_of_DSC09217_cesaci.jpg'),
    lastUploadTime: Date.now(),
  },
  {
    userId: 'event-3',
    name: 'Event 3',
    stories: [
      {
        storyId: 's3-1',
        storyLink: require('@/assets/story3/Copy_of_KAREE_SAT_PBKS-87_pllsr4.jpg'),
        storyUploadTime: Date.now(),
        storyExpiryTime: Date.now() + 86400000 * 365,
        mediaType: 'image',
      },
      {
        storyId: 's3-2',
        storyLink: require('@/assets/story3/Copy_of_OWL02359_lyncrp.jpg'),
        storyUploadTime: Date.now(),
        storyExpiryTime: Date.now() + 86400000 * 365,
        mediaType: 'image',
      },
    ],
    photoURL: require('@/assets/story3/Copy_of_KAREE_SAT_PBKS-87_pllsr4.jpg'),
    lastUploadTime: Date.now(),
  },
];

export const useStories = () => {
  const [stories, setStories] = useState<UserStory[]>(SEEDED_STORIES);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStories = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const items: BackendStory[] = await listStories();

      if (items && items.length > 0) {
        const mapped: UserStory[] = items.map((st) => {
          const rawImages: string[] = st.images && st.images.length > 0
            ? st.images
            : (st.items ? st.items.map((it) => it.url) : []);

          const storyItems = rawImages.map((img, idx) => ({
            storyId: st.items?.[idx]?.id || `${st.id || st.name}-${idx}`,
            storyLink: resolveStoryImage(img),
            storyUploadTime: st.createdAt ? new Date(st.createdAt).getTime() : Date.now(),
            storyExpiryTime: Date.now() + 86400000 * 365,
            mediaType: (st.items?.[idx]?.mediaType as 'image' | 'video') || 'image',
          }));

          const firstImage = rawImages.length > 0 ? resolveStoryImage(rawImages[0]) : undefined;

          return {
            userId: st.id || st.name,
            name: st.name || 'Event',
            photoURL: firstImage,
            stories: storyItems,
            lastUploadTime: st.createdAt ? new Date(st.createdAt).getTime() : Date.now(),
          };
        });

        setStories(mapped);
      } else {
        setStories(SEEDED_STORIES);
      }
    } catch (err) {
      console.warn('Backend stories fetch note:', err);
      setError('Could not reach stories backend, using fallback.');
      setStories(SEEDED_STORIES);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStories();
  }, [fetchStories]);

  const refresh = useCallback(async () => {
    await fetchStories();
  }, [fetchStories]);

  return {
    stories,
    loading,
    error,
    refresh,
  };
};
