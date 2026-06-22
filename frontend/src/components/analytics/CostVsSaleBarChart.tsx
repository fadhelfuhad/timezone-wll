import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartPoint } from '../../types';

interface Props {
  data: ChartPoint[];
  isLoading: boolean;
}

function formatBhd(value: number): string {
  return `BHD ${value.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

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
        minWidth: 180,
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

export default function CostVsSaleBarChart({ data, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton variant="rectangular" width="100%" height={350} sx={{ borderRadius: 1 }} />;
  }

  const chartData = data;

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart data={chartData} margin={{ top: 8, right: 16, left: 16, bottom: 8 }} barGap={2}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" vertical={false} />
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
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Legend
          wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
          formatter={(value: string) => (
            <span style={{ fontWeight: 600 }}>{value}</span>
          )}
        />
        <Bar dataKey="totalCost" name="Cost" fill="#ff9800" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="totalSale" name="Sale" fill="#4caf50" radius={[3, 3, 0, 0]} maxBarSize={32} />
        <Bar dataKey="totalProfit" name="Profit" fill="#9c27b0" radius={[3, 3, 0, 0]} maxBarSize={32} />
      </BarChart>
    </ResponsiveContainer>
  );
}
