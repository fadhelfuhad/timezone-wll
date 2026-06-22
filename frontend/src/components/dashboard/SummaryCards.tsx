import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import Inventory2Icon from '@mui/icons-material/Inventory2';
import PercentIcon from '@mui/icons-material/Percent';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import TodayIcon from '@mui/icons-material/Today';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Grid from '@mui/material/Grid';
import Skeleton from '@mui/material/Skeleton';
import Typography from '@mui/material/Typography';
import { alpha } from '@mui/material/styles';
import type { SvgIconComponent } from '@mui/icons-material';
import type { InventorySummary } from '../../types';

interface Props {
  summary?: InventorySummary;
  isLoading: boolean;
}

interface CardDef {
  title: string;
  subtitle: string;
  key: keyof InventorySummary;
  icon: SvgIconComponent;
  color: string;
  format: 'number' | 'currency' | 'percent';
}

const CARDS: CardDef[] = [
  {
    title: 'Total Inventory Items',
    subtitle: 'All active inventory records',
    key: 'totalItems',
    icon: Inventory2Icon,
    color: '#1565c0',
    format: 'number',
  },
  {
    title: 'Total Cost Value',
    subtitle: 'Sum of all cost prices',
    key: 'totalCost',
    icon: AccountBalanceIcon,
    color: '#e65100',
    format: 'currency',
  },
  {
    title: 'Total Sale Value',
    subtitle: 'Sum of all sale prices',
    key: 'totalSale',
    icon: TrendingUpIcon,
    color: '#2e7d32',
    format: 'currency',
  },
  {
    title: 'Total Profit',
    subtitle: 'Sale value minus cost value',
    key: 'totalProfit',
    icon: ShowChartIcon,
    color: '#6a1b9a',
    format: 'currency',
  },
  {
    title: 'Average Margin',
    subtitle: 'Weighted profit margin',
    key: 'avgMargin',
    icon: PercentIcon,
    color: '#00695c',
    format: 'percent',
  },
  {
    title: 'Added Today',
    subtitle: 'Items added today',
    key: 'addedToday',
    icon: TodayIcon,
    color: '#f57f17',
    format: 'number',
  },
  {
    title: 'Added This Month',
    subtitle: 'Items added this month',
    key: 'addedThisMonth',
    icon: CalendarMonthIcon,
    color: '#283593',
    format: 'number',
  },
];

function formatValue(value: number | string, format: CardDef['format']): string {
  const n = Number(value);
  switch (format) {
    case 'currency':
      return `BHD ${n.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
    case 'percent':
      return `${n.toFixed(2)}%`;
    case 'number':
    default:
      return n.toLocaleString('en-US', { maximumFractionDigits: 0 });
  }
}

interface SummaryCardProps {
  def: CardDef;
  value: number;
  isLoading: boolean;
}

function SummaryCard({ def, value, isLoading }: SummaryCardProps) {
  const Icon = def.icon;

  return (
    <Card
      sx={{
        height: '100%',
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        '&:hover': {
          transform: 'translateY(-2px)',
          boxShadow: '0 6px 20px rgba(0,0,0,0.10)',
        },
      }}
      elevation={1}
    >
      <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
        <Box display="flex" alignItems="flex-start" gap={2}>
          <Box
            sx={{
              width: 48,
              height: 48,
              borderRadius: 1.5,
              backgroundColor: alpha(def.color, 0.15),
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
            }}
          >
            {isLoading ? (
              <Skeleton variant="circular" width={24} height={24} />
            ) : (
              <Icon sx={{ color: def.color, fontSize: 24 }} />
            )}
          </Box>

          <Box flex={1} minWidth={0}>
            <Typography
              variant="caption"
              color="text.secondary"
              fontWeight={600}
              sx={{
                textTransform: 'uppercase',
                letterSpacing: 0.6,
                fontSize: '0.68rem',
                display: 'block',
                mb: 0.5,
              }}
              noWrap
            >
              {def.title}
            </Typography>

            {isLoading ? (
              <>
                <Skeleton variant="text" width="75%" height={34} sx={{ my: 0.25 }} />
                <Skeleton variant="text" width="55%" height={16} />
              </>
            ) : (
              <>
                <Typography
                  variant="h6"
                  fontWeight={700}
                  color={def.color}
                  sx={{
                    lineHeight: 1.25,
                    fontSize: { xs: '1rem', sm: '1.05rem', md: '1.1rem' },
                    wordBreak: 'break-word',
                  }}
                >
                  {formatValue(value, def.format)}
                </Typography>
                <Typography variant="caption" color="text.disabled" sx={{ fontSize: '0.7rem' }}>
                  {def.subtitle}
                </Typography>
              </>
            )}
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
}

export default function SummaryCards({ summary, isLoading }: Props) {
  return (
    <Grid container spacing={2.5}>
      {CARDS.map((card) => (
        <Grid key={card.key} item xs={12} sm={6} md={4} lg={3}>
          <SummaryCard def={card} value={summary ? summary[card.key] : 0} isLoading={isLoading} />
        </Grid>
      ))}
    </Grid>
  );
}
