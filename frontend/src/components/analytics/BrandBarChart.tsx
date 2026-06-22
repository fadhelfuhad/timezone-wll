import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { BrandData } from '../../types';

interface Props {
  data: BrandData[];
  isLoading: boolean;
}

function formatBhd(value: number): string {
  return `BHD ${value.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

interface TooltipPayload {
  payload: BrandData;
  value: number;
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
  label?: string;
}

function CustomTooltip({ active, payload, label }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0].payload;

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
      <Typography variant="caption" fontWeight={700} color="text.primary" display="block" mb={0.75}>
        {label}
      </Typography>
      <Box display="flex" justifyContent="space-between" gap={2} mb={0.25}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>Profit</Typography>
        <Typography variant="caption" fontWeight={700} color="#c9a84c">{formatBhd(entry.totalProfit)}</Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" gap={2} mb={0.25}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>Sale</Typography>
        <Typography variant="caption" fontWeight={700} color="text.primary">{formatBhd(entry.totalSale)}</Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" gap={2} mb={0.25}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>Cost</Typography>
        <Typography variant="caption" fontWeight={700} color="text.primary">{formatBhd(entry.totalCost)}</Typography>
      </Box>
      <Box display="flex" justifyContent="space-between" gap={2}>
        <Typography variant="caption" color="text.secondary" fontWeight={600}>Items</Typography>
        <Typography variant="caption" fontWeight={700} color="text.primary">{entry.itemCount}</Typography>
      </Box>
    </Box>
  );
}

export default function BrandBarChart({ data, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton variant="rectangular" width="100%" height={350} sx={{ borderRadius: 1 }} />;
  }

  const sorted = [...data].sort((a, b) => b.totalProfit - a.totalProfit);

  return (
    <ResponsiveContainer width="100%" height={350}>
      <BarChart
        data={sorted}
        layout="vertical"
        margin={{ top: 8, right: 24, left: 8, bottom: 8 }}
      >
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.08)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fontSize: 11 }}
          tickLine={false}
          axisLine={{ stroke: 'rgba(0,0,0,0.12)' }}
          tickFormatter={(v: number) => `${(v / 1000).toFixed(0)}k`}
        />
        <YAxis
          type="category"
          dataKey="brand"
          tick={{ fontSize: 12, fontWeight: 600 }}
          tickLine={false}
          axisLine={false}
          width={64}
        />
        <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} />
        <Bar dataKey="totalProfit" name="Profit" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {sorted.map((entry, index) => {
            const opacity = 1 - index * (0.5 / Math.max(sorted.length - 1, 1));
            return (
              <Cell
                key={`cell-${entry.brand}`}
                fill={`rgba(201,168,76,${Math.max(opacity, 0.4)})`}
              />
            );
          })}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
