export type Role = 'SUPER_ADMIN' | 'ADMIN' | 'STAFF';
export type FileType = 'PDF' | 'IMAGE' | 'EXCEL' | 'CSV' | 'CAMERA';
export type ImportStatus = 'PENDING' | 'PROCESSING' | 'PREVIEW' | 'APPROVED' | 'FAILED';
export type RowStatus = 'PENDING' | 'PARSED' | 'ERROR' | 'APPROVED' | 'SKIPPED';
export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'IMPORT' | 'LOGIN' | 'LOGOUT';
export type SortOrder = 'asc' | 'desc';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: Role;
  isActive: boolean;
  // COMPANY = the real business data; GUEST = the public demo opened by "Continue as guest".
  workspace?: 'COMPANY' | 'GUEST';
  createdAt: string;
  updatedAt: string;
}

export interface InventoryItem {
  id: string;
  description: string;
  brand: string;
  model: string;
  sku?: string;
  serialNumber?: string;
  quantity: number;
  costPrice: number;
  salePrice: number;
  totalCost: number;
  totalSale: number;
  profit: number;
  margin: number;
  dateAdded: string;
  supplier?: string;
  notes?: string;
  createdById: string;
  importId?: string;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface InventoryListResponse extends PaginatedResponse<InventoryItem> {
  summary: { totalCost: number; totalSale: number; totalProfit: number };
}

export interface InventorySummary {
  totalItems: number;
  totalCost: number;
  totalSale: number;
  totalProfit: number;
  avgMargin: number;
  addedToday: number;
  addedThisMonth: number;
}

export type ImportMode = 'APPEND' | 'REPLACE';
export type ConflictResolution = 'KEEP_EXISTING' | 'USE_IMPORTED' | 'MERGE' | 'CREATE_NEW' | 'SKIP';

export interface ConflictData {
  existingItemId: string;
  existingItem: Partial<InventoryItem>;
  confidence: number;
  reasons: string[];
}

export interface ImportCreatedBy {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

export interface InventoryImport {
  id: string;
  filename: string;
  originalName: string;
  fileType: FileType;
  status: ImportStatus;
  importMode: ImportMode;
  createdBy?: ImportCreatedBy;
  ocrConfidence?: number;
  totalRows: number;
  processedRows: number;
  failedRows: number;
  skippedRows: number;
  conflictsDetected: number;
  conflictsResolved: number;
  errorMessage?: string;
  importReport?: Record<string, unknown>;
  backupSnapshot?: unknown;
  createdById: string;
  createdAt: string;
  updatedAt: string;
  items?: InventoryItem[];
  importRows?: ImportRow[];
}

export interface ImportRow {
  id: string;
  importId: string;
  rowNumber: number;
  rawData: Record<string, unknown>;
  parsedData?: Record<string, unknown>;
  confidence?: number;
  status: RowStatus;
  errorMessage?: string;
  conflictData?: ConflictData | null;
  resolution?: ConflictResolution | null;
  resolvedData?: Record<string, unknown> | null;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface QueryInventoryParams {
  page?: number;
  limit?: number;
  search?: string;
  brand?: string;
  dateFrom?: string;
  dateTo?: string;
  sortBy?: string;
  sortOrder?: SortOrder;
}

export interface AnalyticsProfitSummary {
  totalProfit: number;
  totalCost: number;
  totalSale: number;
  avgMargin: number;
  totalItems: number;
  totalQuantity: number;
}

export interface MonthlyData {
  year: number;
  month: number;
  monthName: string;
  totalProfit: number;
  totalCost: number;
  totalSale: number;
  itemCount: number;
}

export interface YearlyData {
  year: number;
  totalProfit: number;
  totalCost: number;
  totalSale: number;
  itemCount: number;
}

export interface DailyData {
  year: number;
  month: number;
  day: number;
  label: string;
  totalProfit: number;
  totalCost: number;
  totalSale: number;
  itemCount: number;
}

export interface ChartPoint {
  label: string;
  totalProfit: number;
  totalCost: number;
  totalSale: number;
  itemCount: number;
}

export interface BrandData {
  brand: string;
  totalProfit: number;
  totalCost: number;
  totalSale: number;
  itemCount: number;
  avgMargin?: number;
}

export interface BrandDistribution {
  brand: string;
  totalSaleValue: number;
  percentage: number;
}

export interface ProfitGrowthData {
  year: number;
  month: number;
  cumulativeProfit: number;
  monthlyProfit: number;
}

export interface DateFilterPreset {
  label: string;
  value: string;
  dateFrom?: string;
  dateTo?: string;
}

export interface ApiError {
  statusCode: number;
  message: string;
  error: string;
}
