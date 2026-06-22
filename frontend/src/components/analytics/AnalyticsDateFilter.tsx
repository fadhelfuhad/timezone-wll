import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';

export interface AnalyticsDateFilterValue {
  preset: string;
  dateFrom?: string;
  dateTo?: string;
}

interface Props {
  value: AnalyticsDateFilterValue;
  onChange: (v: AnalyticsDateFilterValue) => void;
}

const PRESETS = [
  { label: 'Week', value: 'week' },
  { label: 'Month', value: 'month' },
  { label: 'Quarter', value: 'quarter' },
  { label: 'Year', value: 'year' },
  { label: 'All', value: 'all' },
  { label: 'Custom', value: 'custom' },
];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getAnalyticsPresetDates(preset: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'week': {
      const start = new Date(today);
      start.setDate(today.getDate() - 6);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case 'month': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case 'quarter': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case 'year': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case 'all':
    case 'custom':
    default:
      return {};
  }
}

function formatDateDisplay(iso?: string): string {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${d} ${months[parseInt(m, 10) - 1]} ${y}`;
}

export default function AnalyticsDateFilter({ value, onChange }: Props) {
  function handlePresetChange(_: React.MouseEvent<HTMLElement>, newPreset: string | null) {
    if (!newPreset) return;
    if (newPreset === 'custom') {
      onChange({ preset: 'custom', dateFrom: value.dateFrom, dateTo: value.dateTo });
    } else {
      const dates = getAnalyticsPresetDates(newPreset);
      onChange({ preset: newPreset, ...dates });
    }
  }

  function handleDateFromChange(dateFrom: string) {
    onChange({ ...value, dateFrom });
  }

  function handleDateToChange(dateTo: string) {
    onChange({ ...value, dateTo });
  }

  const showRangeLabel =
    value.preset !== 'all' &&
    value.preset !== 'custom' &&
    value.dateFrom &&
    value.dateTo;

  return (
    <Box display="flex" flexDirection="column" gap={0.75} alignItems="flex-end">
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
        <ToggleButtonGroup
          value={value.preset}
          exclusive
          onChange={handlePresetChange}
          size="small"
          sx={{
            '& .MuiToggleButton-root': {
              px: 1.75,
              py: 0.5,
              fontSize: '0.8125rem',
              fontWeight: 600,
              textTransform: 'none',
              borderRadius: '6px !important',
              border: '1px solid',
              borderColor: 'divider',
              '&.Mui-selected': {
                bgcolor: 'primary.main',
                color: 'primary.contrastText',
                borderColor: 'primary.main',
                '&:hover': { bgcolor: 'primary.dark' },
              },
            },
          }}
        >
          {PRESETS.map((p) => (
            <ToggleButton key={p.value} value={p.value}>
              {p.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {value.preset === 'custom' && (
          <>
            <TextField
              label="From"
              type="date"
              size="small"
              value={value.dateFrom ?? ''}
              onChange={(e) => handleDateFromChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: value.dateTo || undefined }}
              sx={{ minWidth: 140 }}
            />
            <TextField
              label="To"
              type="date"
              size="small"
              value={value.dateTo ?? ''}
              onChange={(e) => handleDateToChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: value.dateFrom || undefined }}
              sx={{ minWidth: 140 }}
            />
          </>
        )}
      </Box>

      {showRangeLabel && (
        <Typography variant="caption" color="text.disabled" sx={{ pr: 0.25 }}>
          {formatDateDisplay(value.dateFrom)}
          {value.dateTo && value.dateTo !== value.dateFrom
            ? ` — ${formatDateDisplay(value.dateTo)}`
            : ''}
        </Typography>
      )}

      {value.preset === 'custom' && value.dateFrom && value.dateTo && (
        <Typography variant="caption" color="text.disabled" sx={{ pr: 0.25 }}>
          {formatDateDisplay(value.dateFrom)} — {formatDateDisplay(value.dateTo)}
        </Typography>
      )}
    </Box>
  );
}
