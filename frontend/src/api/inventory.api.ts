import type { InventoryItem, InventoryListResponse, InventorySummary, QueryInventoryParams } from '../types';
import axiosInstance, { del, get, patch, post } from './client';

export function getInventory(params?: QueryInventoryParams): Promise<InventoryListResponse> {
  return get<InventoryListResponse>('/inventory', params as Record<string, unknown>);
}

export function getSummary(dateFrom?: string, dateTo?: string): Promise<InventorySummary> {
  const params: Record<string, string> = {};
  if (dateFrom) params.dateFrom = dateFrom;
  if (dateTo) params.dateTo = dateTo;
  return get<InventorySummary>('/inventory/summary', params);
}

export function getInventoryBrands(): Promise<string[]> {
  return get<string[]>('/inventory/brands');
}

export function getInventoryItem(id: string): Promise<InventoryItem> {
  return get<InventoryItem>(`/inventory/${id}`);
}

export function getInventoryItemBySku(sku: string): Promise<InventoryItem> {
  return get<InventoryItem>(`/inventory/by-sku/${encodeURIComponent(sku)}`);
}

export function createInventoryItem(
  data: Omit<InventoryItem, 'id' | 'createdById' | 'isDeleted' | 'createdAt' | 'updatedAt' | 'totalCost' | 'totalSale' | 'profit' | 'margin'>,
): Promise<InventoryItem> {
  return post<InventoryItem>('/inventory', data);
}

export function updateInventoryItem(
  id: string,
  data: Partial<Omit<InventoryItem, 'id' | 'createdById' | 'isDeleted' | 'createdAt' | 'updatedAt'>>,
): Promise<InventoryItem> {
  return patch<InventoryItem>(`/inventory/${id}`, data);
}

export function deleteInventoryItem(id: string): Promise<void> {
  return del<void>(`/inventory/${id}`);
}

export function bulkImport(data: { items: Partial<InventoryItem>[] }): Promise<{ imported: number; failed: number }> {
  return post<{ imported: number; failed: number }>('/inventory/bulk-import', data);
}

export async function exportCsv(params?: QueryInventoryParams): Promise<Blob> {
  const response = await axiosInstance.get('/inventory/export/csv', {
    params,
    responseType: 'blob',
  });
  return response as unknown as Blob;
}

export async function exportExcel(params?: QueryInventoryParams): Promise<Blob> {
  const response = await axiosInstance.get('/inventory/export/excel', {
    params,
    responseType: 'blob',
  });
  return response as unknown as Blob;
}
