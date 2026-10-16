import { apiFetch, readError } from './client';

export interface StoreItem {
  id: string;
  name: string;
  description: string;
  price: number;
  image?: string;
  imageUrl?: string;
  createdAt?: string;
  updatedAt?: string;
}

export async function fetchStoreItems(): Promise<StoreItem[]> {
  const res = await apiFetch('/store', {}, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to load store items'));
  }
  const data = await res.json();
  return data.items || [];
}

export async function fetchStoreItem(id: string): Promise<StoreItem> {
  const res = await apiFetch(`/store/${id}`, {}, 'optional');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to load store item'));
  }
  const data = await res.json();
  return data.item;
}

export async function adminListStoreItems(): Promise<StoreItem[]> {
  const res = await apiFetch('/admin/store', {}, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to load store items'));
  }
  const data = await res.json();
  return data.items || [];
}

export async function adminGetStoreItem(id: string): Promise<StoreItem> {
  const res = await apiFetch(`/admin/store/${id}`, {}, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to load store item'));
  }
  const data = await res.json();
  return data.item;
}

export async function adminCreateStoreItem(payload: {
  name: string;
  description?: string;
  price: number;
  image?: string;
}): Promise<StoreItem> {
  const res = await apiFetch('/admin/store', {
    method: 'POST',
    body: JSON.stringify(payload),
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to create store item'));
  }
  const data = await res.json();
  return data.item;
}

export async function adminUpdateStoreItem(
  id: string,
  payload: {
    name?: string;
    description?: string;
    price?: number;
    image?: string;
  }
): Promise<StoreItem> {
  const res = await apiFetch(`/admin/store/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to update store item'));
  }
  const data = await res.json();
  return data.item;
}

export async function adminDeleteStoreItem(id: string): Promise<boolean> {
  const res = await apiFetch(`/admin/store/${id}`, {
    method: 'DELETE',
  }, 'required');
  if (!res.ok) {
    throw new Error(await readError(res, 'Failed to delete store item'));
  }
  return true;
}
