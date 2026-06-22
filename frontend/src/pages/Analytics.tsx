import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import type { ReactNode } from 'react';
import {
  dailyToChartPoints,
  getInventoryByBrand,
  getProfitByBrand,
  getProfitByDay,
  getProfitByMonth,
  getProfitGrowth,
  getProfitSummary,
  toChartPoints,
} from '../api/analytics.api';
import AnalyticsDateFilter, {
  type AnalyticsDateFilterValue,
} from '../components/analytics/AnalyticsDateFilter';
import BrandBarChart from '../components/analytics/BrandBarChart';
import BrandPieChart from '../components/analytics/BrandPieChart';
import CostVsSaleBarChart from '../components/analytics/CostVsSaleBarChart';
import ProfitByMonthChart from '../components/analytics/ProfitByMonthChart';
import ProfitGrowthAreaChart from '../components/analytics/ProfitGrowthAreaChart';
import ProfitSummaryCards from '../components/analytics/ProfitSummaryCards';

const DEFAULT_FILTER: AnalyticsDateFilterValue = {
  preset: 'all',
  dateFrom: undefined,
  dateTo: undefined,
};

interface ChartPaperProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  isLoading?: boolean;
  skeletonHeight?: number;
}

function ChartPaper({ title, subtitle, children, isLoading, skeletonHeight = 350 }: ChartPaperProps) {
  return (
    <Paper
      variant="outlined"
      sx={{
        p: 2.5,
        borderRadius: 2,
        height: '100%',
      }}
    >
      <Typography variant="h6" fontWeight={600} color="text.primary">
        {title}
      </Typography>
      {subtitle ? (
        <Typography variant="body2" color="text.secondary" mt={0.25} mb={2} fontSize="0.8125rem">
          {subtitle}
        </Typography>
      ) : (
        <Box mb={2} />
      )}
      {isLoading ? (
        <Skeleton variant="rectangular" width="100%" height={skeletonHeight} sx={{ borderRadius: 1 }} />
      ) : (
        children
      )}
    </Paper>
  );
}

export default function Analytics() {
  const [dateFilter, setDateFilter] = useState<AnalyticsDateFilterValue>(DEFAULT_FILTER);

  const dateParams =
    dateFilter.preset === 'all'
      ? {}
      : { dateFrom: dateFilter.dateFrom, dateTo: dateFilter.dateTo };

  const useDaily =
    dateFilter.preset === 'week' ||
    (dateFilter.preset === 'custom' &&
      Boolean(dateFilter.dateFrom) &&
      Boolean(dateFilter.dateTo) &&
      (new Date(dateFilter.dateTo!).getTime() - new Date(dateFilter.dateFrom!).getTime()) /
        86_400_000 <=
        14);

  const { data: summaryData, isLoading: summaryLoading } = useQuery({
    queryKey: ['analytics', 'profit-summary', dateParams.dateFrom, dateParams.dateTo],
    queryFn: () => getProfitSummary(dateParams),
  });

  const { data: monthlyRaw = [], isLoading: monthlyLoading } = useQuery({
    queryKey: ['analytics', 'profit-by-month', dateParams.dateFrom, dateParams.dateTo],
    queryFn: () => getProfitByMonth(dateParams),
    enabled: !useDaily,
  });

  const { data: dailyRaw = [], isLoading: dailyLoading } = useQuery({
    queryKey: ['analytics', 'profit-by-day', dateParams.dateFrom, dateParams.dateTo],
    queryFn: () => getProfitByDay(dateParams),
    enabled: useDaily,
  });

  const timeSeriesLoading = useDaily ? dailyLoading : monthlyLoading;
  const timeSeriesData = useDaily ? dailyToChartPoints(dailyRaw) : toChartPoints(monthlyRaw);

  const { data: brandDistData = [], isLoading: brandDistLoading } = useQuery({
    queryKey: ['analytics', 'inventory-by-brand', dateParams.dateFrom, dateParams.dateTo],
    queryFn: () => getInventoryByBrand(dateParams),
  });

  const { data: profitGrowthData = [], isLoading: growthLoading } = useQuery({
    queryKey: ['analytics', 'profit-growth', dateParams.dateFrom, dateParams.dateTo],
    queryFn: () => getProfitGrowth(dateParams),
  });

  const { data: brandProfitData = [], isLoading: brandProfitLoading } = useQuery({
    queryKey: ['analytics', 'profit-by-brand', dateParams.dateFrom, dateParams.dateTo],
    queryFn: () => getProfitByBrand(dateParams),
  });

  return (
    <Box>
      {/* Row 1: Page header + date filter */}
      <Box
        display="flex"
        alignItems={{ xs: 'flex-start', md: 'center' }}
        flexDirection={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        gap={2}
        mb={2}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Analytics
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            Track profit, revenue, cost and brand performance over time
          </Typography>
        </Box>
        <AnalyticsDateFilter value={dateFilter} onChange={setDateFilter} />
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* Row 2: Summary cards */}
      <ProfitSummaryCards data={summaryData} isLoading={summaryLoading} />

      {/* Charts */}
      <Grid container spacing={2.5} mt={0.5}>
        {/* Row 3: Line chart — Profit vs Cost vs Sale (full width) */}
        <Grid item xs={12}>
          <ChartPaper
            title="Profit vs Cost vs Sale Over Time"
            subtitle={useDaily ? 'Daily breakdown of revenue, cost and profit' : 'Monthly breakdown of revenue, cost and profit trends'}
            isLoading={timeSeriesLoading}
          >
            <ProfitByMonthChart data={timeSeriesData} isLoading={false} />
          </ChartPaper>
        </Grid>

        {/* Row 4: Grouped bar chart + Pie chart */}
        <Grid item xs={12} md={7}>
          <ChartPaper
            title={useDaily ? 'Cost vs Sale by Day' : 'Cost vs Sale by Month'}
            subtitle="Grouped comparison of cost, sale and profit"
            isLoading={timeSeriesLoading}
          >
            <CostVsSaleBarChart data={timeSeriesData} isLoading={false} />
          </ChartPaper>
        </Grid>

        <Grid item xs={12} md={5}>
          <ChartPaper
            title="Revenue by Brand"
            subtitle="Share of total sale value per brand"
            isLoading={brandDistLoading}
          >
            <BrandPieChart data={brandDistData} isLoading={false} />
          </ChartPaper>
        </Grid>

        {/* Row 5: Area chart + Horizontal bar chart */}
        <Grid item xs={12} md={8}>
          <ChartPaper
            title="Profit Growth"
            subtitle="Cumulative profit trajectory alongside monthly profit"
            isLoading={growthLoading}
          >
            <ProfitGrowthAreaChart data={profitGrowthData} isLoading={false} />
          </ChartPaper>
        </Grid>

        <Grid item xs={12} md={4}>
          <ChartPaper
            title="Profit by Brand"
            subtitle="Brands ranked by total profit"
            isLoading={brandProfitLoading}
          >
            <BrandBarChart data={brandProfitData} isLoading={false} />
          </ChartPaper>
        </Grid>
      </Grid>
    </Box>
  );
}
