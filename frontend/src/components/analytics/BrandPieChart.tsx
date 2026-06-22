import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts';
import type { BrandDistribution } from '../../types';

interface Props {
  data: BrandDistribution[];
  isLoading: boolean;
}

const COLORS = ['#1a1a2e', '#c9a84c', '#2196f3', '#4caf50', '#ff9800', '#9c27b0', '#f44336', '#00bcd4'];

function formatBhd(value: number): string {
  return `BHD ${value.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

interface TooltipPayload {
  name: string;
  value: number;
  payload: BrandDistribution & { fill: string };
}

interface CustomTooltipProps {
  active?: boolean;
  payload?: TooltipPayload[];
}

function CustomTooltip({ active, payload }: CustomTooltipProps) {
  if (!active || !payload?.length) return null;
  const entry = payload[0];

  return (
    <Box
      sx={{
        bgcolor: 'background.paper',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 1.5,
        p: 1.5,
        boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
        minWidth: 160,
      }}
    >
      <Typography variant="caption" fontWeight={700} color="text.primary" display="block" mb={0.5}>
        {entry.name}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {formatBhd(entry.payload.totalSaleValue)}
      </Typography>
      <Typography variant="caption" color="text.secondary" display="block">
        {Number(entry.payload.percentage).toFixed(1)}% of total
      </Typography>
    </Box>
  );
}

interface OuterLabelProps {
  cx: number;
  cy: number;
  midAngle: number;
  outerRadius: number;
  brand: string;
  percentage: number;
}

function renderOuterLabel({ cx, cy, midAngle, outerRadius, brand, percentage }: OuterLabelProps) {
  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 28;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  if (percentage < 4) return null;

  return (
    <text
      x={x}
      y={y}
      textAnchor={x > cx ? 'start' : 'end'}
      dominantBaseline="central"
      fontSize={11}
      fontWeight={600}
      fill="#5a5a7a"
    >
      {`${brand} ${Number(percentage).toFixed(1)}%`}
    </text>
  );
}

export default function BrandPieChart({ data, isLoading }: Props) {
  if (isLoading) {
    return <Skeleton variant="rectangular" width="100%" height={350} sx={{ borderRadius: 1 }} />;
  }

  return (
    <ResponsiveContainer width="100%" height={350}>
      <PieChart>
        <Pie
          data={data}
          dataKey="totalSaleValue"
          nameKey="brand"
          cx="50%"
          cy="50%"
          outerRadius={110}
          labelLine={false}
          label={(props) =>
            renderOuterLabel({
              cx: props.cx,
              cy: props.cy,
              midAngle: props.midAngle,
              outerRadius: props.outerRadius,
              brand: props.brand,
              percentage: props.percentage,
            })
          }
        >
          {data.map((entry, index) => (
            <Cell
              key={`cell-${entry.brand}`}
              fill={COLORS[index % COLORS.length]}
              stroke="none"
            />
          ))}
        </Pie>
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
          formatter={(value: string) => (
            <span style={{ fontWeight: 600, fontSize: 11 }}>{value}</span>
          )}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}
