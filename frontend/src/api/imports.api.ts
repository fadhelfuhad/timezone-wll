import type { ConflictResolution, ImportRow, InventoryImport } from '../types';
import axiosInstance, { get, patch, post } from './client';

export interface ApproveRowPayload {
  rowId: string;
  parsedData?: Record<string, unknown>;
}

export interface RowResolutionPayload {
  rowId: string;
  resolution: ConflictResolution;
  resolvedData?: Record<string, unknown>;
}

export async function uploadFile(file: File, mode: 'APPEND' | 'REPLACE' = 'APPEND'): Promise<InventoryImport> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await axiosInstance.post<InventoryImport, InventoryImport>(
    `/imports/upload?mode=${mode}`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } },
  );
  return response;
}

export function getImports(): Promise<InventoryImport[]> {
  return get<InventoryImport[]>('/imports');
}

export function getImport(id: string): Promise<InventoryImport> {
  return get<InventoryImport>(`/imports/${id}`);
}

export function updateRow(
  importId: string,
  rowId: string,
  data: { parsedData?: Record<string, unknown>; status?: string },
): Promise<ImportRow> {
  return patch<ImportRow>(`/imports/${importId}/rows/${rowId}`, data);
}

export function resolveConflicts(
  importId: string,
  resolutions: RowResolutionPayload[],
): Promise<InventoryImport> {
  return post<InventoryImport>(`/imports/${importId}/resolve`, { resolutions });
}

export function approveImport(
  importId: string,
  rows: ApproveRowPayload[],
): Promise<{ created: number; updated: number; skipped: number; failed: number; errors: string[] }> {
  return post(`/imports/${importId}/approve`, { rows });
}

export function cancelImport(importId: string): Promise<void> {
  return post<void>(`/imports/${importId}/cancel`, {});
}
