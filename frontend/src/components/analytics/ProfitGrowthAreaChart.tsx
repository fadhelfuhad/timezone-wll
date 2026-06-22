import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ProfitGrowthData } from '../../types';

interface Props {
  data: Array<ProfitGrowthData & { monthName?: string }>;
  isLoading: boolean;
}

function formatBhd(value: number): string {
  return `BHD ${value.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 1.5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        minWidth: 200,
      }}
    >
      <Typography variant="caption" fontWeight={700} color="text.secondary" display="block" mb={0.75}>
        {label}
      </Typography>
      {payload.map((entry) => (
        <Box key={entry.name} display="flex" justifyContent="space-between" gap={2} mb={0.25}>
          <Typography variant="caption" sx={{ color: entry.color, fontWeight: 600 }}>
            {entry.name}
          </Typography>
          <Typography variant="caption" fontWeight={700} color="text.primary">
            {formatBhd(entry.value)}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

export default function ProfitGrowthAreaChart({ data, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton variant="rectangular" width="100%" height={350} sx={{ borderRadius: 1 }} />;
  }

  const chartData = data.map((d) => ({
    ...d,
    label: d.monthName
      ? `${d.monthName.slice(0, 3)} ${d.year}`
      : `${MONTH_NAMES[(d.month ?? 1) - 1]} ${d.year}`,
  }));

  return (
    <ResponsiveContainer width="100%" height={350}>
      <AreaChart data={chartData} margin={{ top: 8, right: 24, left: 16, bottom: 8 }}>
        <defs>
          <linearGradient id="gradCumulative" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#9c27b0" stopOpacity={0.25} />
            <stop offset="95%" stopColor="#9c27b0" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradMonthly" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4caf50" stopOpacity={0.18} />
            <stop offset="95%" stopColor="#4caf50" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 12 }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(0,0,0,0.12)' }}
        />
        <YAxis
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v: number) => `BHD ${(v / 1000).toFixed(0)}k`}
          width={72}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value: string) => (
            <span style={{ fontWeight: 600 }}>{value}</span>
          )}
        />
        <Area
          type="monotone"
          dataKey="cumulativeProfit"
          name="Cumulative Profit"
          stroke="#9c27b0"
          strokeWidth={2.5}
          fill="url(#gradCumulative)"
          dot={false}
          activeDot={{ r: 5, fill: '#9c27b0' }}
        />
        <Area
          type="monotone"
          dataKey="monthlyProfit"
          name="Monthly Profit"
          stroke="#4caf50"
          strokeWidth={2}
          fill="url(#gradMonthly)"
          dot={{ r: 3, fill: '#4caf50' }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
