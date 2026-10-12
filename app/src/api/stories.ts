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

// User: list stories
export async function listStories(): Promise<BackendStory[]> {
  const res = await apiFetch('/stories', { method: 'GET' }, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch stories'));
  }
  const json = await res.json();
  return json.items || [];
}

// User: get single story
export async function getStory(id: string): Promise<BackendStory> {
  const res = await apiFetch(`/stories/${id}`, { method: 'GET' }, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch story'));
  }
  const json = await res.json();
  return json.story;
}

// Admin: list all stories
export async function adminListStories(): Promise<BackendStory[]> {
  const res = await apiFetch('/admin/stories', { method: 'GET' }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch admin stories'));
  }
  const json = await res.json();
  return json.items || [];
}

// Admin: get story by id
export async function adminGetStory(id: string): Promise<BackendStory> {
  const res = await apiFetch(`/admin/stories/${id}`, { method: 'GET' }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch admin story'));
  }
  const json = await res.json();
  return json.story;
}

// Admin: create story
export async function adminCreateStory(data: Partial<BackendStory> | FormData): Promise<BackendStory> {
  const isFormData = data instanceof FormData;
  const res = await apiFetch('/admin/stories', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to create story'));
  }
  const json = await res.json();
  return json.story;
}

// Admin: update story
export async function adminUpdateStory(id: string, data: Partial<BackendStory> | FormData): Promise<BackendStory> {
  const isFormData = data instanceof FormData;
  const res = await apiFetch(`/admin/stories/${id}`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to update story'));
  }
  const json = await res.json();
  return json.story;
}

// Admin: delete story
export async function adminDeleteStory(id: string): Promise<void> {
  const res = await apiFetch(`/admin/stories/${id}`, {
    method: 'DELETE',
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to delete story'));
  }
}
