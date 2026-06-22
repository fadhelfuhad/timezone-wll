import type {
  AnalyticsProfitSummary,
  BrandData,
  BrandDistribution,
  ChartPoint,
  DailyData,
  MonthlyData,
  ProfitGrowthData,
  YearlyData,
} from '../types';
import { get } from './client';

interface DateRangeParams {
  dateFrom?: string;
  dateTo?: string;
}

interface TopPerformer {
  brand: string;
  model: string;
  totalProfit: number;
  totalSale: number;
  totalCost: number;
  quantity: number;
  margin: number;
}

interface CostVsSaleData {
  period: string;
  totalCost: number;
  totalSale: number;
  totalProfit: number;
}

interface ProductData {
  brand: string;
  model: string;
  totalProfit: number;
  totalCost: number;
  totalSale: number;
  itemCount: number;
  avgMargin: number;
}

function toParams(params?: DateRangeParams): Record<string, string> {
  const out: Record<string, string> = {};
  if (params?.dateFrom) out.dateFrom = params.dateFrom;
  if (params?.dateTo) out.dateTo = params.dateTo;
  return out;
}

export function getProfitSummary(params?: DateRangeParams): Promise<AnalyticsProfitSummary> {
  return get<AnalyticsProfitSummary>('/analytics/profit-summary', toParams(params));
}

export function getProfitByMonth(params?: DateRangeParams): Promise<MonthlyData[]> {
  return get<MonthlyData[]>('/analytics/profit-by-month', toParams(params));
}

export function getProfitByDay(params?: DateRangeParams): Promise<DailyData[]> {
  return get<DailyData[]>('/analytics/profit-by-day', toParams(params));
}

export function toChartPoints(data: MonthlyData[]): ChartPoint[] {
  const monthNames = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return data.map((d) => ({
    label: `${monthNames[d.month - 1] ?? ''} ${d.year}`,
    totalProfit: d.totalProfit,
    totalCost: d.totalCost,
    totalSale: d.totalSale,
    itemCount: d.itemCount,
  }));
}

export function dailyToChartPoints(data: DailyData[]): ChartPoint[] {
  return data.map((d) => ({
    label: d.label,
    totalProfit: d.totalProfit,
    totalCost: d.totalCost,
    totalSale: d.totalSale,
    itemCount: d.itemCount,
  }));
}

export function getProfitByYear(params?: DateRangeParams): Promise<YearlyData[]> {
  return get<YearlyData[]>('/analytics/profit-by-year', toParams(params));
}

export function getProfitByBrand(params?: DateRangeParams): Promise<BrandData[]> {
  return get<BrandData[]>('/analytics/profit-by-brand', toParams(params));
}

export function getProfitByProduct(params?: DateRangeParams): Promise<ProductData[]> {
  return get<ProductData[]>('/analytics/profit-by-product', toParams(params));
}

export function getCostVsSale(params?: DateRangeParams): Promise<CostVsSaleData[]> {
  return get<CostVsSaleData[]>('/analytics/cost-vs-sale', toParams(params));
}

export function getInventoryByBrand(params?: DateRangeParams): Promise<BrandDistribution[]> {
  return get<BrandDistribution[]>('/analytics/inventory-by-brand', toParams(params));
}

export function getProfitGrowth(params?: DateRangeParams): Promise<ProfitGrowthData[]> {
  return get<ProfitGrowthData[]>('/analytics/profit-growth', toParams(params));
}

export function getTopPerformers(
  params?: DateRangeParams & { limit?: number },
): Promise<TopPerformer[]> {
  const out: Record<string, string> = toParams(params);
  if (params?.limit != null) out.limit = String(params.limit);
  return get<TopPerformer[]>('/analytics/top-performers', out);
}
