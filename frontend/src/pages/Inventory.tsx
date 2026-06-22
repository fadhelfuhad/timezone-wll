import CircularProgress from '@mui/material/CircularProgress';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FileUploadIcon from '@mui/icons-material/FileUpload';
import GridOnIcon from '@mui/icons-material/GridOn';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import LinearProgress from '@mui/material/LinearProgress';
import Paper from '@mui/material/Paper';
import Skeleton from '@mui/material/Skeleton';
import Tab from '@mui/material/Tab';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  deleteInventoryItem,
  exportCsv,
  exportExcel,
  getInventory,
  getSummary,
} from '../api/inventory.api';
import ConfirmDialog from '../components/common/ConfirmDialog';
import PageHeader from '../components/common/PageHeader';
import DateFilter, { type DateFilterValue, getPresetDates } from '../components/dashboard/DateFilter';
import CreateInventoryDialog from '../components/inventory/CreateInventoryDialog';
import EditInventoryDialog from '../components/inventory/EditInventoryDialog';
import { useAuth } from '../contexts/AuthContext';
import type { InventoryItem, SortOrder } from '../types';


const BRAND_COLORS: Record<string, { bg: string; color: string }> = {
  Rolex: { bg: '#e8f5e9', color: '#2e7d32' },
  Omega: { bg: '#e3f2fd', color: '#1565c0' },
  'Tag Heuer': { bg: '#fce4ec', color: '#880e4f' },
  Tissot: { bg: '#fff3e0', color: '#e65100' },
  Casio: { bg: '#e0f7fa', color: '#00695c' },
  Seiko: { bg: '#f3e5f5', color: '#6a1b9a' },
  Citizen: { bg: '#f9fbe7', color: '#558b2f' },
  Longines: { bg: '#e8eaf6', color: '#283593' },
  Other: { bg: '#fafafa', color: '#424242' },
};

const FALLBACK_BRAND_COLOR = { bg: '#f5f5f5', color: '#616161' };

const WATCH_BRANDS_TABS = ['Rolex', 'Omega', 'Tag Heuer', 'Tissot', 'Casio', 'Seiko', 'Citizen', 'Longines', 'Other'];

function getBrandColor(brand: string): { bg: string; color: string } {
  return BRAND_COLORS[brand] ?? FALLBACK_BRAND_COLOR;
}

function formatBhd(value: number | string): string {
  return `BHD ${Number(value).toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

function formatDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  const day = String(d.getDate()).padStart(2, '0');
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${day} ${months[d.getMonth()]} ${d.getFullYear()}`;
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

type SortField =
  | 'dateAdded'
  | 'description'
  | 'brand'
  | 'model'
  | 'quantity'
  | 'costPrice'
  | 'salePrice'
  | 'totalCost'
  | 'totalSale'
  | 'profit'
  | 'margin';

interface ColumnDef {
  id: SortField | '#' | 'supplier' | 'actions';
  label: string;
  sortable: boolean;
  align?: 'right' | 'left' | 'center';
}

const COLUMNS: ColumnDef[] = [
  { id: '#', label: '#', sortable: false, align: 'center' },
  { id: 'dateAdded', label: 'Date', sortable: true },
  { id: 'description', label: 'Description', sortable: true },
  { id: 'brand', label: 'Brand', sortable: true },
  { id: 'model', label: 'Model', sortable: true },
  { id: 'quantity', label: 'Qty', sortable: true, align: 'right' },
  { id: 'costPrice', label: 'Cost Price', sortable: true, align: 'right' },
  { id: 'salePrice', label: 'Sale Price', sortable: true, align: 'right' },
  { id: 'totalCost', label: 'Total Cost', sortable: true, align: 'right' },
  { id: 'totalSale', label: 'Total Sale', sortable: true, align: 'right' },
  { id: 'profit', label: 'Profit', sortable: true, align: 'right' },
  { id: 'margin', label: 'Margin%', sortable: true, align: 'right' },
  { id: 'supplier', label: 'Supplier', sortable: false },
  { id: 'actions', label: 'Actions', sortable: false, align: 'center' },
];

const thisMonthDates = getPresetDates('thisMonth');
const DEFAULT_DATE_FILTER: DateFilterValue = {
  preset: 'all',
  dateFrom: thisMonthDates.dateFrom,
  dateTo: thisMonthDates.dateTo,
};

interface StatBoxProps {
  label: string;
  value: string;
  color?: string;
}

function StatBox({ label, value, color }: StatBoxProps) {
  return (
    <Box
      sx={{
        px: 2,
        py: 1.25,
        border: 1,
        borderColor: 'divider',
        borderRadius: 2,
        minWidth: 160,
        bgcolor: 'background.paper',
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 0.5, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={700} color={color ?? 'text.primary'} sx={{ lineHeight: 1.4 }}>
        {value}
      </Typography>
    </Box>
  );
}

export default function Inventory() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { enqueueSnackbar } = useSnackbar();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  // Date filter
  const [dateFilter, setDateFilter] = useState<DateFilterValue>(DEFAULT_DATE_FILTER);

  // Dialog state
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState('');
  const [brandTab, setBrandTab] = useState<string>('All');

  // Table state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<SortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');

  // Reset page on filter/sort changes
  useEffect(() => {
    setPage(0);
  }, [search, brandTab, dateFilter, sortBy, sortOrder]);

  const dateFrom = dateFilter.preset === 'all' ? undefined : dateFilter.dateFrom;
  const dateTo = dateFilter.preset === 'all' ? undefined : dateFilter.dateTo;
  const activeBrand = brandTab === 'All' ? undefined : brandTab;

  const queryParams = useMemo(
    () => ({
      page: page + 1,
      limit: rowsPerPage,
      search: search || undefined,
      brand: activeBrand,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    }),
    [page, rowsPerPage, search, activeBrand, dateFrom, dateTo, sortBy, sortOrder],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['inventory', queryParams],
    queryFn: () => getInventory(queryParams),
    placeholderData: (prev) => prev,
  });

  // Summary for stat boxes (all brands, current date filter)
  const { data: summary } = useQuery({
    queryKey: ['summary', dateFrom, dateTo],
    queryFn: () => getSummary(dateFrom, dateTo),
    staleTime: 2 * 60 * 1000,
  });

  // Brand counts — fetch per-brand counts for tab badges
  const brandCountQueries = useQuery({
    queryKey: ['inventory-brand-counts', dateFrom, dateTo, search],
    queryFn: async () => {
      const allBrands = ['All', ...WATCH_BRANDS_TABS];
      const results = await Promise.all(
        allBrands.map(async (b) => {
          const res = await getInventory({
            page: 1,
            limit: 1,
            search: search || undefined,
            brand: b === 'All' ? undefined : b,
            dateFrom,
            dateTo,
          });
          return { brand: b, count: res.total };
        }),
      );
      return Object.fromEntries(results.map((r) => [r.brand, r.count]));
    },
    staleTime: 60 * 1000,
  });

  const brandCounts = brandCountQueries.data ?? {};

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onSuccess: () => {
      enqueueSnackbar('Item deleted successfully', { variant: 'success' });
      setDeleteId(null);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
    onError: () => {
      enqueueSnackbar('Failed to delete item', { variant: 'error' });
    },
  });

  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  const handleExportCsv = useCallback(async () => {
    setExportingCsv(true);
    try {
      const blob = await exportCsv({ search: search || undefined, brand: activeBrand, dateFrom, dateTo });
      triggerDownload(blob, `inventory-${Date.now()}.csv`);
      enqueueSnackbar('CSV exported', { variant: 'success' });
    } catch {
      enqueueSnackbar('CSV export failed', { variant: 'error' });
    } finally {
      setExportingCsv(false);
    }
  }, [search, activeBrand, dateFrom, dateTo, enqueueSnackbar]);

  const handleExportExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      const blob = await exportExcel({ search: search || undefined, brand: activeBrand, dateFrom, dateTo });
      triggerDownload(blob, `inventory-${Date.now()}.xlsx`);
      enqueueSnackbar('Excel exported', { variant: 'success' });
    } catch {
      enqueueSnackbar('Excel export failed', { variant: 'error' });
    } finally {
      setExportingExcel(false);
    }
  }, [search, activeBrand, dateFrom, dateTo, enqueueSnackbar]);

  const rows = data?.data ?? [];

  const handleExportPdf = useCallback(() => {
    setExportingPdf(true);
    try {
      const doc = new jsPDF({ orientation: 'landscape' });
      doc.setFontSize(14);
      doc.text('Timezone W.L.L — Inventory Report', 14, 18);
      doc.setFontSize(9);
      doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 25);
      autoTable(doc, {
        startY: 30,
        head: [['#', 'Date', 'Description', 'Brand', 'Model', 'Qty', 'Cost (BHD)', 'Sale (BHD)', 'T.Cost', 'T.Sale', 'Profit', 'Margin%']],
        body: rows.map((row, idx) => [
          idx + 1,
          formatDate(row.dateAdded),
          row.description,
          row.brand,
          row.model,
          row.quantity,
          Number(row.costPrice).toFixed(3),
          Number(row.salePrice).toFixed(3),
          Number(row.totalCost).toFixed(3),
          Number(row.totalSale).toFixed(3),
          Number(row.profit).toFixed(3),
          `${Number(row.margin).toFixed(1)}%`,
        ]),
        styles: { fontSize: 7, cellPadding: 2 },
        headStyles: { fillColor: [13, 13, 13] },
      });
      doc.save(`inventory-${Date.now()}.pdf`);
      enqueueSnackbar('PDF exported', { variant: 'success' });
    } catch (err) {
      console.error('PDF export error:', err);
      enqueueSnackbar(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`, { variant: 'error' });
    } finally {
      setExportingPdf(false);
    }
  }, [rows, enqueueSnackbar]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  const total = data?.total ?? 0;
  const pageSummary = data?.summary;

  const skeletonRows = Array.from({ length: 8 });
  const allBrandTabs = ['All', ...WATCH_BRANDS_TABS];

  const pageOffset = page * rowsPerPage;

  return (
    <Box>
      <PageHeader
        title="Inventory"
        subtitle="Manage your watch inventory records"
        actions={
          <Box display="flex" gap={1} alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<FileUploadIcon />}
              onClick={() => navigate('/import')}
            >
              Import
            </Button>
            <Tooltip title="Export CSV">
              <span>
                <IconButton
                  size="small"
                  onClick={handleExportCsv}
                  disabled={exportingCsv}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  {exportingCsv ? <CircularProgress size={16} /> : <FileDownloadIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Export Excel">
              <span>
                <IconButton
                  size="small"
                  onClick={handleExportExcel}
                  disabled={exportingExcel}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1 }}
                >
                  {exportingExcel ? <CircularProgress size={16} /> : <GridOnIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Export PDF">
              <span>
                <IconButton
                  size="small"
                  onClick={handleExportPdf}
                  disabled={exportingPdf}
                  sx={{ border: 1, borderColor: 'divider', borderRadius: 1, color: 'error.main' }}
                >
                  {exportingPdf ? <CircularProgress size={16} color="error" /> : <PictureAsPdfIcon fontSize="small" />}
                </IconButton>
              </span>
            </Tooltip>
            {isAdmin && (
              <Button
                variant="contained"
                size="small"
                startIcon={<AddIcon />}
                onClick={() => setCreateOpen(true)}
              >
                Add Item
              </Button>
            )}
          </Box>
        }
      />

      {/* Date filter */}
      <Box mb={2.5}>
        <DateFilter value={dateFilter} onChange={setDateFilter} />
      </Box>

      {/* Summary stat boxes */}
      <Box display="flex" gap={1.5} flexWrap="wrap" mb={3}>
        {summary ? (
          <>
            <StatBox label="Total Items" value={summary.totalItems.toLocaleString()} />
            <StatBox label="Total Cost" value={formatBhd(summary.totalCost)} />
            <StatBox label="Total Sale" value={formatBhd(summary.totalSale)} />
            <StatBox
              label="Total Profit"
              value={formatBhd(summary.totalProfit)}
              color={summary.totalProfit >= 0 ? 'success.main' : 'error.main'}
            />
          </>
        ) : (
          [1, 2, 3, 4].map((i) => (
            <Box key={i} sx={{ px: 2, py: 1.25, border: 1, borderColor: 'divider', borderRadius: 2, minWidth: 160 }}>
              <Skeleton variant="text" width={80} height={16} />
              <Skeleton variant="text" width={120} height={28} />
            </Box>
          ))
        )}
      </Box>

      {/* Brand filter tabs */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <Tabs
          value={brandTab}
          onChange={(_, v: string) => setBrandTab(v)}
          variant="scrollable"
          scrollButtons="auto"
          sx={{
            borderBottom: 1,
            borderColor: 'divider',
            px: 1,
            minHeight: 44,
            '& .MuiTab-root': { minHeight: 44, textTransform: 'none', fontWeight: 600, fontSize: '0.8125rem' },
          }}
        >
          {allBrandTabs
            .filter((brand) => brand === 'All' || (brandCounts[brand] ?? 0) > 0)
            .map((brand) => (
            <Tab
              key={brand}
              value={brand}
              label={
                <Box display="flex" alignItems="center" gap={0.75}>
                  {brand}
                  {brandCounts[brand] !== undefined && (
                    <Chip
                      label={brandCounts[brand]}
                      size="small"
                      sx={{
                        height: 18,
                        fontSize: '0.68rem',
                        fontWeight: 700,
                        '& .MuiChip-label': { px: 0.75 },
                        bgcolor: brandTab === brand ? 'primary.main' : 'action.hover',
                        color: brandTab === brand ? 'primary.contrastText' : 'text.secondary',
                      }}
                    />
                  )}
                </Box>
              }
            />
          ))}
        </Tabs>

        {/* Search bar */}
        <Box px={2.5} py={1.5} display="flex" alignItems="center" gap={2} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            size="small"
            placeholder="Search description, model, SKU, serial..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            }}
            sx={{ minWidth: 260, flex: 1, maxWidth: 420 }}
          />
          {(isFetching && !isLoading) && (
            <Typography variant="caption" color="text.secondary">
              Refreshing...
            </Typography>
          )}
          <Box ml="auto">
            <Typography variant="caption" color="text.secondary">
              {total.toLocaleString()} record{total !== 1 ? 's' : ''}
            </Typography>
          </Box>
        </Box>

        {/* Fetch indicator */}
        {isFetching && !isLoading && (
          <LinearProgress sx={{ height: 2 }} />
        )}

        {/* Page-level summary chips */}
        {pageSummary && !isLoading && rows.length > 0 && (
          <Box px={2.5} py={1} display="flex" gap={1.5} flexWrap="wrap" sx={{ bgcolor: 'action.hover', borderBottom: 1, borderColor: 'divider' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ alignSelf: 'center', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              Page total:
            </Typography>
            <Chip label={`Cost ${formatBhd(pageSummary.totalCost)}`} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
            <Chip label={`Sale ${formatBhd(pageSummary.totalSale)}`} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.72rem' }} />
            <Chip
              label={`Profit ${formatBhd(pageSummary.totalProfit)}`}
              size="small"
              sx={{
                fontWeight: 700,
                fontSize: '0.72rem',
                bgcolor: pageSummary.totalProfit >= 0 ? '#e8f5e9' : '#ffebee',
                color: pageSummary.totalProfit >= 0 ? '#2e7d32' : '#c62828',
                border: 'none',
              }}
            />
          </Box>
        )}

        {/* Table */}
        <TableContainer>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align ?? 'left'}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: 0.5,
                      whiteSpace: 'nowrap',
                      bgcolor: 'background.paper',
                      py: 1.25,
                    }}
                  >
                    {col.sortable ? (
                      <TableSortLabel
                        active={sortBy === col.id}
                        direction={sortBy === col.id ? sortOrder : 'asc'}
                        onClick={() => handleSort(col.id as SortField)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {isLoading
                ? skeletonRows.map((_, idx) => (
                    // biome-ignore lint/suspicious/noArrayIndexKey: skeleton rows
                    <TableRow key={idx}>
                      {COLUMNS.map((col) => (
                        <TableCell key={col.id} align={col.align ?? 'left'}>
                          <Skeleton variant="text" width={col.id === 'description' ? 180 : col.id === '#' ? 30 : 80} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 8 }}>
                          <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                            <Inventory2OutlinedIcon sx={{ fontSize: 48, color: 'text.disabled' }} />
                            <Typography color="text.secondary" variant="body2">
                              No inventory records found
                            </Typography>
                            {(search || brandTab !== 'All') && (
                              <Button
                                size="small"
                                onClick={() => { setSearch(''); setBrandTab('All'); }}
                              >
                                Clear filters
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  : rows.map((row, idx) => {
                      const brandColor = getBrandColor(row.brand);
                      const profitColor = Number(row.profit) >= 0 ? 'success.main' : 'error.main';
                      const marginClamped = Math.min(Math.max(Number(row.margin), 0), 100);

                      return (
                        <TableRow
                          key={row.id}
                          hover
                          onClick={() => setEditItem(row)}
                          sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                        >
                          <TableCell align="center" sx={{ color: 'text.disabled', fontSize: '0.75rem', py: 1 }}>
                            {pageOffset + idx + 1}
                          </TableCell>
                          <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: '0.8125rem', py: 1 }}>
                            {formatDate(row.dateAdded)}
                          </TableCell>
                          <TableCell sx={{ maxWidth: 220, py: 1 }}>
                            <Typography variant="body2" fontWeight={500} noWrap title={row.description}>
                              {row.description}
                            </Typography>
                            {row.sku && (
                              <Typography variant="caption" color="text.disabled" display="block">
                                SKU: {row.sku}
                              </Typography>
                            )}
                            {row.serialNumber && (
                              <Typography variant="caption" color="text.disabled" display="block">
                                S/N: {row.serialNumber}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Chip
                              label={row.brand}
                              size="small"
                              sx={{
                                bgcolor: brandColor.bg,
                                color: brandColor.color,
                                fontWeight: 600,
                                fontSize: '0.72rem',
                                border: 'none',
                              }}
                            />
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 140 }} title={row.model}>
                              {row.model || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ py: 1 }}>
                            <Typography variant="body2" fontWeight={600}>
                              {row.quantity.toLocaleString()}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                            <Typography variant="body2">{formatBhd(row.costPrice)}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                            <Typography variant="body2">{formatBhd(row.salePrice)}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                            <Typography variant="body2">{formatBhd(row.totalCost)}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                            <Typography variant="body2">{formatBhd(row.totalSale)}</Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap', py: 1 }}>
                            <Typography variant="body2" fontWeight={600} color={profitColor}>
                              {formatBhd(row.profit)}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ minWidth: 100, py: 1 }}>
                            <Box display="flex" flexDirection="column" alignItems="flex-end" gap={0.25}>
                              <Typography variant="caption" fontWeight={600} color={profitColor}>
                                {Number(row.margin).toFixed(1)}%
                              </Typography>
                              <LinearProgress
                                variant="determinate"
                                value={marginClamped}
                                sx={{
                                  width: 64,
                                  height: 3,
                                  borderRadius: 2,
                                  bgcolor: 'action.hover',
                                  '& .MuiLinearProgress-bar': {
                                    bgcolor: row.margin >= 0 ? 'success.main' : 'error.main',
                                    borderRadius: 2,
                                  },
                                }}
                              />
                            </Box>
                          </TableCell>
                          <TableCell sx={{ py: 1 }}>
                            <Typography variant="body2" color="text.secondary" noWrap sx={{ maxWidth: 120 }}>
                              {row.supplier || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="center" sx={{ py: 1 }}>
                            <Box
                              display="flex"
                              gap={0.5}
                              justifyContent="center"
                              onClick={(e) => e.stopPropagation()}
                            >
                              <Tooltip title="Edit">
                                <IconButton
                                  size="small"
                                  onClick={() => setEditItem(row)}
                                  color="primary"
                                >
                                  <EditIcon sx={{ fontSize: 16 }} />
                                </IconButton>
                              </Tooltip>
                              {isAdmin && (
                                <Tooltip title="Delete">
                                  <IconButton
                                    size="small"
                                    onClick={() => setDeleteId(row.id)}
                                    color="error"
                                  >
                                    <DeleteIcon sx={{ fontSize: 16 }} />
                                  </IconButton>
                                </Tooltip>
                              )}
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Pagination */}
        <TablePagination
          component="div"
          count={total}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[10, 25, 50, 100]}
          sx={{ borderTop: 1, borderColor: 'divider' }}
        />
      </Paper>

      {/* Create dialog */}
      <CreateInventoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['summary'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }}
      />

      {/* Edit dialog */}
      <EditInventoryDialog
        open={Boolean(editItem)}
        item={editItem}
        onClose={() => setEditItem(null)}
        onSuccess={() => {
          setEditItem(null);
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['summary'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteId)}
        title="Delete Inventory Item"
        message="Are you sure you want to delete this inventory item? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        severity="error"
        onConfirm={() => {
          if (deleteId) deleteMutation.mutate(deleteId);
        }}
        onCancel={() => setDeleteId(null)}
      />
    </Box>
  );
}
