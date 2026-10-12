import { apiFetch, readError } from './client';

export interface BackendStoryItem {
  id: string;
  url: string;
  ref?: string;
  mediaType?: 'image' | 'video';
  uploadedAt?: string;
}

export interface BackendStory {
  id: string;
  name: string;
  eventId?: string;
  images: string[];
  items?: BackendStoryItem[];
  order?: number;
  createdAt?: string;
  updatedAt?: string;
}

export async function listStories(): Promise<BackendStory[]> {
  const res = await apiFetch('/stories', { method: 'GET' }, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch stories'));
  }
  const json = await res.json();
  return json.items || [];
}
