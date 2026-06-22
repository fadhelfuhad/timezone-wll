import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import PercentIcon from '@mui/icons-material/Percent';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import type { SvgIconComponent } from '@mui/icons-material';

interface ProfitSummaryData {
  totalProfit: number;
  totalSale: number;
  totalCost: number;
  avgMargin: number;
}

interface Props {
  data?: ProfitSummaryData;
  previousData?: ProfitSummaryData;
  isLoading: boolean;
}

interface CardDef {
  title: string;
  subtitle: string;
  key: keyof ProfitSummaryData;
  icon: SvgIconComponent;
  color: string;
  bgColor: string;
  darkBgColor: string;
  format: 'currency' | 'percent';
}

const CARDS: CardDef[] = [
  {
    title: 'Total Profit',
    subtitle: 'Sale minus cost',
    key: 'totalProfit',
    icon: ShowChartIcon,
    color: '#9c27b0',
    bgColor: '#f3e5f5',
    darkBgColor: 'rgba(156,39,176,0.12)',
    format: 'currency',
  },
  {
    title: 'Total Revenue',
    subtitle: 'Sum of all sale prices',
    key: 'totalSale',
    icon: TrendingUpIcon,
    color: '#2e7d32',
    bgColor: '#e8f5e9',
    darkBgColor: 'rgba(46,125,50,0.12)',
    format: 'currency',
  },
  {
    title: 'Total Cost',
    subtitle: 'Sum of all cost prices',
    key: 'totalCost',
    icon: AccountBalanceIcon,
    color: '#e65100',
    bgColor: '#fff3e0',
    darkBgColor: 'rgba(230,81,0,0.12)',
    format: 'currency',
  },
  {
    title: 'Avg Margin',
    subtitle: 'Weighted profit margin',
    key: 'avgMargin',
    icon: PercentIcon,
    color: '#c9a84c',
    bgColor: '#fdf8ec',
    darkBgColor: 'rgba(201,168,76,0.12)',
    format: 'percent',
  },
];

function formatValue(value: number | string, format: CardDef['format']): string {
  const n = Number(value);
  if (format === 'currency') {
    return `BHD ${n.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
  }
  return `${n.toFixed(2)}%`;
}

function computeChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / Math.abs(previous)) * 100;
}

interface SummaryCardProps {
  def: CardDef;
  value: number;
  previousValue?: number;
  isLoading: boolean;
}

function SummaryCard({ def, value, previousValue, isLoading }: SummaryCardProps) {
  const Icon = def.icon;
  const change = previousValue !== undefined ? computeChange(value, previousValue) : null;
  const hasChange = change !== null;
  const isPositive = hasChange && change! >= 0;

  return (
    <Card
      elevation={0}
      sx={{
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 8px 24px rgba(0,0,0,0.10)',
        },
      }}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box display="flex" alignItems="flex-start" gap={2}>
          {/* Icon badge */}
          <Box
            sx={{
              width: 52,
              height: 52,
              borderRadius: 1.5,
              backgroundColor: def.bgColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              '.dark &': { backgroundColor: def.darkBgColor },
            }}
          >
            {isLoading ? (
              <Skeleton variant="circular" width={26} height={26} />
            ) : (
              <Icon sx={{ color: def.color, fontSize: 26 }} />
            )}
          </Box>

          {/* Content */}
          <Box flex={1} minWidth={0}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 0.7,
                fontSize: '0.67rem',
                display: 'block',
                mb: 0.5,
              }}
              noWrap
            >
              {def.title}
            </Typography>

            {isLoading ? (
              <>
                <Skeleton variant="text" width="85%" height={36} sx={{ my: 0.25 }} />
                <Skeleton variant="text" width="55%" height={16} />
              </>
            ) : (
              <>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color={def.color}
                  sx={{
                    lineHeight: 1.2,
                    fontSize: { xs: '0.95rem', sm: '1rem', md: '1.05rem' },
                    wordBreak: 'break-word',
                    mb: 0.5,
                  }}
                >
                  {formatValue(value, def.format)}
                </Typography>

                <Box display="flex" alignItems="center" gap={0.5}>
                  {hasChange ? (
                    <Tooltip
                      title={`Previous period: ${formatValue(previousValue!, def.format)}`}
                      placement="bottom"
                    >
                      <Box display="flex" alignItems="center" gap={0.25}>
                        {isPositive ? (
                          <TrendingUpIcon sx={{ fontSize: 14, color: 'success.main' }} />
                        ) : (
                          <TrendingDownIcon sx={{ fontSize: 14, color: 'error.main' }} />
                        )}
                        <Typography
                          variant="caption"
                          fontWeight={700}
                          sx={{
                            fontSize: '0.7rem',
                            color: isPositive ? 'success.main' : 'error.main',
                          }}
                        >
                          {isPositive ? '+' : ''}{change!.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                          vs prev.
                        </Typography>
                      </Box>
                    </Tooltip>
                  ) : (
                    <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                      {def.subtitle}
                    </Typography>
                  )}
                </Box>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function ProfitSummaryCards({ data, previousData, isLoading }: Props) {
  return (
    <Grid container spacing={2.5}>
      {CARDS.map((card) => (
        <Grid key={card.key} item xs={12} sm={6} md={3}>
          <SummaryCard
            def={card}
            value={data ? data[card.key] : 0}
            previousValue={previousData ? previousData[card.key] : undefined}
            isLoading={isLoading}
          />
        </Grid>
      ))}
    </Grid>
  );
}
