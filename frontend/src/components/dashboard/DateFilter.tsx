import Box from '@mui/material/Box';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';

export interface DateFilterValue {
  preset: string;
  dateFrom?: string;
  dateTo?: string;
}

interface Props {
  value: DateFilterValue;
  onChange: (v: DateFilterValue) => void;
}

export const PRESETS = [
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'This Week', value: 'thisWeek' },
  { label: 'Last Week', value: 'lastWeek' },
  { label: 'This Month', value: 'thisMonth' },
  { label: 'Last Month', value: 'lastMonth' },
  { label: 'This Quarter', value: 'thisQuarter' },
  { label: 'This Year', value: 'thisYear' },
  { label: 'Last Year', value: 'lastYear' },
  { label: 'All Time', value: 'all' },
  { label: 'Custom Range', value: 'custom' },
];

function toIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function getPresetDates(preset: string): { dateFrom?: string; dateTo?: string } {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  switch (preset) {
    case 'today': {
      const s = toIsoDate(today);
      return { dateFrom: s, dateTo: s };
    }
    case 'yesterday': {
      const y = new Date(today);
      y.setDate(y.getDate() - 1);
      const s = toIsoDate(y);
      return { dateFrom: s, dateTo: s };
    }
    case 'thisWeek': {
      const dow = today.getDay(); // 0=Sun
      const start = new Date(today);
      start.setDate(today.getDate() - dow);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case 'lastWeek': {
      const dow = today.getDay();
      const startOfThisWeek = new Date(today);
      startOfThisWeek.setDate(today.getDate() - dow);
      const end = new Date(startOfThisWeek);
      end.setDate(end.getDate() - 1);
      const start = new Date(end);
      start.setDate(end.getDate() - 6);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
    }
    case 'thisMonth': {
      const start = new Date(today.getFullYear(), today.getMonth(), 1);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case 'lastMonth': {
      const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
      const end = new Date(today.getFullYear(), today.getMonth(), 0);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
    }
    case 'thisQuarter': {
      const q = Math.floor(today.getMonth() / 3);
      const start = new Date(today.getFullYear(), q * 3, 1);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case 'thisYear': {
      const start = new Date(today.getFullYear(), 0, 1);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(today) };
    }
    case 'lastYear': {
      const start = new Date(today.getFullYear() - 1, 0, 1);
      const end = new Date(today.getFullYear() - 1, 11, 31);
      return { dateFrom: toIsoDate(start), dateTo: toIsoDate(end) };
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

export default function DateFilter({ value, onChange }: Props) {
  const isCustom = value.preset === 'custom';
  const showRange = value.preset !== 'all' && value.preset !== '' && value.dateFrom;

  function handlePresetChange(preset: string) {
    if (preset === 'custom') {
      onChange({ preset, dateFrom: value.dateFrom, dateTo: value.dateTo });
    } else {
      const dates = getPresetDates(preset);
      onChange({ preset, ...dates });
    }
  }

  function handleDateFromChange(dateFrom: string) {
    onChange({ ...value, dateFrom });
  }

  function handleDateToChange(dateTo: string) {
    onChange({ ...value, dateTo });
  }

  return (
    <Box display="flex" flexDirection="column" gap={1}>
      <Box display="flex" alignItems="center" gap={1.5} flexWrap="wrap">
        <FormControl size="small" sx={{ minWidth: 160 }}>
          <InputLabel id="date-filter-label">Date Range</InputLabel>
          <Select
            labelId="date-filter-label"
            value={value.preset}
            label="Date Range"
            onChange={(e) => handlePresetChange(e.target.value)}
          >
            {PRESETS.map((p) => (
              <MenuItem key={p.value} value={p.value}>
                {p.label}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {isCustom && (
          <>
            <TextField
              label="Start"
              type="date"
              size="small"
              value={value.dateFrom ?? ''}
              onChange={(e) => handleDateFromChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ max: value.dateTo || undefined }}
              sx={{ minWidth: 150 }}
            />
            <TextField
              label="End"
              type="date"
              size="small"
              value={value.dateTo ?? ''}
              onChange={(e) => handleDateToChange(e.target.value)}
              InputLabelProps={{ shrink: true }}
              inputProps={{ min: value.dateFrom || undefined }}
              sx={{ minWidth: 150 }}
            />
          </>
        )}
      </Box>

      {showRange && !isCustom && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
          {formatDateDisplay(value.dateFrom)}
          {value.dateTo && value.dateTo !== value.dateFrom && ` — ${formatDateDisplay(value.dateTo)}`}
        </Typography>
      )}

      {isCustom && value.dateFrom && value.dateTo && (
        <Typography variant="caption" color="text.secondary" sx={{ pl: 0.5 }}>
          {formatDateDisplay(value.dateFrom)} — {formatDateDisplay(value.dateTo)}
        </Typography>
      )}
    </Box>
  );
}
