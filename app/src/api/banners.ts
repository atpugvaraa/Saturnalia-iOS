import { apiFetch, readError } from './client';

export interface Banner {
  id: string;
  title: string;
  description: string;
  imageUrl: string;
  imageRef?: string;
  link: string;
  linkType?: 'internal' | 'external' | string;
  isActive: boolean;
  order: number;
  createdAt?: string;
  updatedAt?: string;
}

// User-facing public fetch (returns active banners)
export async function fetchBanners(): Promise<Banner[]> {
  const res = await apiFetch('/banners', { method: 'GET' }, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch banners'));
  }
  const json = await res.json();
  return json.items || [];
}

// User-facing single banner fetch
export async function getBanner(id: string): Promise<Banner> {
  const res = await apiFetch(`/banners/${id}`, { method: 'GET' }, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch banner'));
  }
  const json = await res.json();
  return json.banner;
}

// Admin: List all banners (including inactive)
export async function adminListBanners(): Promise<Banner[]> {
  const res = await apiFetch('/admin/banners', { method: 'GET' }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to fetch admin banners'));
  }
  const json = await res.json();
  return json.items || [];
}

// Admin: Create banner (supports JSON payload or FormData with multipart file)
export async function adminCreateBanner(data: Partial<Banner> | FormData): Promise<Banner> {
  const isFormData = data instanceof FormData;
  const res = await apiFetch('/admin/banners', {
    method: 'POST',
    body: isFormData ? data : JSON.stringify(data),
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to create banner'));
  }
  const json = await res.json();
  return json.banner;
}

// Admin: Update banner
export async function adminUpdateBanner(id: string, data: Partial<Banner> | FormData): Promise<Banner> {
  const isFormData = data instanceof FormData;
  const res = await apiFetch(`/admin/banners/${id}`, {
    method: 'PATCH',
    body: isFormData ? data : JSON.stringify(data),
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to update banner'));
  }
  const json = await res.json();
  return json.banner;
}

// Admin: Delete banner
export async function adminDeleteBanner(id: string): Promise<void> {
  const res = await apiFetch(`/admin/banners/${id}`, {
    method: 'DELETE',
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to delete banner'));
  }
}
