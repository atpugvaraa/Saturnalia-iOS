import { apiFetch, readError } from './client';
import { Reel } from '@/types/models';

// User: fetch public reels
export async function fetchReels(): Promise<Reel[]> {
  const res = await apiFetch('/reels', { method: 'GET' }, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch reels'));
  }
  const json = await res.json();
  return json.items || [];
}

// User: get reel by id
export async function getReel(id: string): Promise<Reel> {
  const res = await apiFetch(`/reels/${id}`, { method: 'GET' }, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch reel'));
  }
  const json = await res.json();
  return json.reel;
}

// Admin: list all reels
export async function adminListReels(): Promise<Reel[]> {
  const res = await apiFetch('/admin/reels', { method: 'GET' }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch admin reels'));
  }
  const json = await res.json();
  return json.items || [];
}

// Admin: create reel (supports JSON or multipart FormData)
export async function adminCreateReel(data: Partial<Reel> | FormData): Promise<Reel> {
  const isFormData = data instanceof FormData;
  const res = await apiFetch('/admin/reels', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to create reel'));
  }
  const json = await res.json();
  return json.reel;
}

// Admin: update reel
export async function adminUpdateReel(id: string, data: Partial<Reel> | FormData): Promise<Reel> {
  const isFormData = data instanceof FormData;
  const res = await apiFetch(`/admin/reels/${id}`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to update reel'));
  }
  const json = await res.json();
  return json.reel;
}

// Admin: delete reel
export async function adminDeleteReel(id: string): Promise<void> {
  const res = await apiFetch(`/admin/reels/${id}`, {
    method: 'DELETE',
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to delete reel'));
  }
}
