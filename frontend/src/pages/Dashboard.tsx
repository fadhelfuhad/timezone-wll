import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSummary } from '../api/inventory.api';
import DateFilter, { type DateFilterValue } from '../components/dashboard/DateFilter';
import InventoryTable from '../components/dashboard/InventoryTable';
import SummaryCards from '../components/dashboard/SummaryCards';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatCurrentDate(): string {
  const now = new Date();
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];
  return `${days[now.getDay()]}, ${months[now.getMonth()]} ${now.getDate()}, ${now.getFullYear()}`;
}

// ---------------------------------------------------------------------------
// Default filter: This Month
// ---------------------------------------------------------------------------

const DEFAULT_FILTER: DateFilterValue = {
  preset: 'all',
  dateFrom: undefined,
  dateTo: undefined,
};

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function Dashboard() {
  const navigate = useNavigate();
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_FILTER);

  // When preset is "all" we pass undefined date params (no date restriction)
  const summaryDateFrom = dateFilter.preset === 'all' ? undefined : dateFilter.dateFrom;
  const summaryDateTo = dateFilter.preset === 'all' ? undefined : dateFilter.dateTo;

  const {
    data: summary,
    isLoading: summaryLoading,
    isError: summaryError,
  } = useQuery({
    queryKey: ['inventory-summary', summaryDateFrom, summaryDateTo],
    queryFn: () => getSummary(summaryDateFrom, summaryDateTo),
    staleTime: 2 * 60 * 1000,
    retry: 2,
  });

  return (
    <Box>
      {/* ------------------------------------------------------------------ */}
      {/* Page header                                                         */}
      {/* ------------------------------------------------------------------ */}
      <Box
        display="flex"
        alignItems={{ xs: 'flex-start', md: 'flex-end' }}
        flexDirection={{ xs: 'column', md: 'row' }}
        justifyContent="space-between"
        gap={2}
        mb={2.5}
      >
        <Box>
          <Typography variant="h5" fontWeight={700} color="text.primary">
            Dashboard
          </Typography>
          <Typography variant="body2" color="text.secondary" mt={0.25}>
            {formatCurrentDate()}
          </Typography>
        </Box>

        {/* Right side: import button + date filter */}
        <Box display="flex" gap={1.5} alignItems="center">
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileUploadIcon />}
            onClick={() => navigate('/import')}
          >
            Import
          </Button>
          <DateFilter value={dateFilter} onChange={setDateFilter} />
        </Box>
      </Box>

      <Divider sx={{ mb: 3 }} />

      {/* ------------------------------------------------------------------ */}
      {/* Summary error                                                       */}
      {/* ------------------------------------------------------------------ */}
      {summaryError && (
        <Alert severity="error" sx={{ mb: 2.5, borderRadius: 2 }}>
          Failed to load summary data. The cards below may be stale — please refresh.
        </Alert>
      )}

      {/* ------------------------------------------------------------------ */}
      {/* Summary cards                                                       */}
      {/* ------------------------------------------------------------------ */}
      <SummaryCards summary={summary} isLoading={summaryLoading} />

      {/* ------------------------------------------------------------------ */}
      {/* Inventory table section                                             */}
      {/* ------------------------------------------------------------------ */}
      <Paper
        variant="outlined"
        sx={{ mt: 3.5, borderRadius: 2, overflow: 'hidden' }}
      >
        {/* Section header */}
        <Box
          px={2.5}
          py={1.75}
          display="flex"
          alignItems="center"
          justifyContent="space-between"
          flexWrap="wrap"
          gap={1}
          sx={{ borderBottom: 1, borderColor: 'divider' }}
        >
          <Box>
            <Typography variant="subtitle1" fontWeight={700} color="text.primary">
              Inventory Records
            </Typography>
            {!summaryLoading && summary && (
              <Typography variant="caption" color="text.secondary">
                {summary.totalItems.toLocaleString()} item{summary.totalItems !== 1 ? 's' : ''} in selected period
              </Typography>
            )}
          </Box>
        </Box>

        <Box px={2} pb={1} pt={0.5}>
          <InventoryTable dateFrom={summaryDateFrom} dateTo={summaryDateTo} />
        </Box>
      </Paper>
    </Box>
  );
}
