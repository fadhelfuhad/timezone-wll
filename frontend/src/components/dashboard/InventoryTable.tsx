import React, { useCallback, useEffect, useMemo, useState } from 'react';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';

import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import FilterListIcon from '@mui/icons-material/FilterList';
import GridOnIcon from '@mui/icons-material/GridOn';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import SearchIcon from '@mui/icons-material/Search';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import Grid from '@mui/material/Grid';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import InputLabel from '@mui/material/InputLabel';
import LinearProgress from '@mui/material/LinearProgress';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Select from '@mui/material/Select';
import Skeleton from '@mui/material/Skeleton';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TablePagination from '@mui/material/TablePagination';
import TableRow from '@mui/material/TableRow';
import TableSortLabel from '@mui/material/TableSortLabel';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';

import {
  deleteInventoryItem,
  exportCsv,
  exportExcel,
  getInventory,
  updateInventoryItem,
} from '../../api/inventory.api';
import { useAuth } from '../../contexts/AuthContext';
import type { InventoryItem, SortOrder } from '../../types';
import ConfirmDialog from '../common/ConfirmDialog';
import CreateInventoryDialog from '../inventory/CreateInventoryDialog';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Props {
  dateFrom?: string;
  dateTo?: string;
  search?: string;
  brand?: string;
  compact?: boolean;
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

// ---------------------------------------------------------------------------
// Brand colour helpers
// ---------------------------------------------------------------------------

const BRAND_COLORS: Record<string, { bg: string; color: string }> = {
  Apple: { bg: '#e8f5e9', color: '#2e7d32' },
  Samsung: { bg: '#e3f2fd', color: '#1565c0' },
  Sony: { bg: '#f3e5f5', color: '#6a1b9a' },
  Dell: { bg: '#fff3e0', color: '#e65100' },
  HP: { bg: '#e0f7fa', color: '#00695c' },
  Lenovo: { bg: '#fce4ec', color: '#880e4f' },
  LG: { bg: '#f9fbe7', color: '#558b2f' },
  Microsoft: { bg: '#e8eaf6', color: '#283593' },
  Asus: { bg: '#fff8e1', color: '#f57f17' },
  Acer: { bg: '#e0f2f1', color: '#00695c' },
};

const FALLBACK_COLORS = [
  { bg: '#fafafa', color: '#424242' },
  { bg: '#f3e5f5', color: '#7b1fa2' },
  { bg: '#e8f5e9', color: '#388e3c' },
  { bg: '#fff3e0', color: '#f57c00' },
  { bg: '#e3f2fd', color: '#1976d2' },
  { bg: '#fce4ec', color: '#c62828' },
];

let fallbackIndex = 0;
const brandColorCache: Record<string, { bg: string; color: string }> = {};

function getBrandColor(brand: string): { bg: string; color: string } {
  if (BRAND_COLORS[brand]) return BRAND_COLORS[brand];
  if (!brandColorCache[brand]) {
    brandColorCache[brand] = FALLBACK_COLORS[fallbackIndex % FALLBACK_COLORS.length];
    fallbackIndex += 1;
  }
  return brandColorCache[brand];
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Inline Edit Dialog
// ---------------------------------------------------------------------------

interface EditDialogProps {
  item: InventoryItem;
  onClose: () => void;
  onSaved: () => void;
}

function EditDialog({ item, onClose, onSaved }: EditDialogProps) {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [form, setForm] = useState({
    description: item.description,
    brand: item.brand,
    model: item.model,
    quantity: item.quantity,
    costPrice: item.costPrice,
    salePrice: item.salePrice,
    supplier: item.supplier ?? '',
    notes: item.notes ?? '',
    dateAdded: item.dateAdded ? item.dateAdded.slice(0, 10) : '',
  });

  const mutation = useMutation({
    mutationFn: (data: typeof form) =>
      updateInventoryItem(item.id, {
        ...data,
        quantity: Number(data.quantity),
        costPrice: Number(data.costPrice),
        salePrice: Number(data.salePrice),
      }),
    onSuccess: () => {
      enqueueSnackbar('Item updated successfully.', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      onSaved();
    },
    onError: () => {
      enqueueSnackbar('Failed to update item.', { variant: 'error' });
    },
  });

  function set(field: keyof typeof form, value: string | number) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    mutation.mutate(form);
  }

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 2 } }}>
      <DialogTitle sx={{ fontWeight: 700 }}>Edit Inventory Item</DialogTitle>
      <Divider />
      <form onSubmit={handleSubmit}>
        <DialogContent sx={{ pt: 3 }}>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField label="Description" value={form.description} onChange={(e) => set('description', e.target.value)} fullWidth required size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Brand" value={form.brand} onChange={(e) => set('brand', e.target.value)} fullWidth required size="small" />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Model" value={form.model} onChange={(e) => set('model', e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid item xs={4}>
              <TextField label="Quantity" type="number" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} fullWidth required size="small" inputProps={{ min: 1 }} />
            </Grid>
            <Grid item xs={4}>
              <TextField label="Cost Price (BHD)" type="number" value={form.costPrice} onChange={(e) => set('costPrice', e.target.value)} fullWidth required size="small" inputProps={{ min: 0, step: 0.001 }} />
            </Grid>
            <Grid item xs={4}>
              <TextField label="Sale Price (BHD)" type="number" value={form.salePrice} onChange={(e) => set('salePrice', e.target.value)} fullWidth required size="small" inputProps={{ min: 0, step: 0.001 }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Date Added" type="date" value={form.dateAdded} onChange={(e) => set('dateAdded', e.target.value)} fullWidth size="small" InputLabelProps={{ shrink: true }} />
            </Grid>
            <Grid item xs={6}>
              <TextField label="Supplier" value={form.supplier} onChange={(e) => set('supplier', e.target.value)} fullWidth size="small" />
            </Grid>
            <Grid item xs={12}>
              <TextField label="Notes" value={form.notes} onChange={(e) => set('notes', e.target.value)} fullWidth size="small" multiline rows={2} />
            </Grid>
          </Grid>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, gap: 1 }}>
          <Button onClick={onClose} variant="outlined" color="inherit" disabled={mutation.isPending}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending} startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}>
            {mutation.isPending ? 'Saving…' : 'Save Changes'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

interface ColDef {
  id: SortField | 'num' | 'actions';
  label: string;
  sortable: boolean;
  align?: 'right' | 'left' | 'center';
  minWidth?: number;
}

const COLUMNS: ColDef[] = [
  { id: 'num', label: '#', sortable: false, minWidth: 40 },
  { id: 'dateAdded', label: 'Date Added', sortable: true, minWidth: 110 },
  { id: 'description', label: 'Description', sortable: true, minWidth: 200 },
  { id: 'brand', label: 'Brand', sortable: true, minWidth: 110 },
  { id: 'model', label: 'Model', sortable: true, minWidth: 110 },
  { id: 'quantity', label: 'Qty', sortable: true, align: 'right' },
  { id: 'costPrice', label: 'Cost Price', sortable: true, align: 'right', minWidth: 130 },
  { id: 'salePrice', label: 'Sale Price', sortable: true, align: 'right', minWidth: 130 },
  { id: 'totalCost', label: 'Total Cost', sortable: true, align: 'right', minWidth: 130 },
  { id: 'totalSale', label: 'Total Sale', sortable: true, align: 'right', minWidth: 130 },
  { id: 'profit', label: 'Profit', sortable: true, align: 'right', minWidth: 130 },
  { id: 'margin', label: 'Margin %', sortable: true, minWidth: 140 },
  { id: 'actions', label: 'Actions', sortable: false, align: 'center' },
];

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function InventoryTable({ dateFrom, dateTo, search: externalSearch, brand: externalBrand, compact = false }: Props) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();
  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(25);
  const [sortBy, setSortBy] = useState<SortField>('dateAdded');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [localSearch, setLocalSearch] = useState(externalSearch ?? '');
  const [localBrand, setLocalBrand] = useState(externalBrand ?? '');
  const [createOpen, setCreateOpen] = useState(false);
  const [editItem, setEditItem] = useState<InventoryItem | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<InventoryItem | null>(null);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingExcel, setExportingExcel] = useState(false);
  const [exportingPdf, setExportingPdf] = useState(false);

  // Sync external props when they change
  useEffect(() => {
    if (externalSearch !== undefined) setLocalSearch(externalSearch);
  }, [externalSearch]);

  useEffect(() => {
    if (externalBrand !== undefined) setLocalBrand(externalBrand);
  }, [externalBrand]);

  // Reset page when filters change
  useEffect(() => {
    setPage(0);
  }, [localSearch, localBrand, dateFrom, dateTo, sortBy, sortOrder]);

  const queryParams = useMemo(
    () => ({
      page: page + 1,
      limit: rowsPerPage,
      search: localSearch || undefined,
      brand: localBrand || undefined,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
    }),
    [page, rowsPerPage, localSearch, localBrand, dateFrom, dateTo, sortBy, sortOrder],
  );

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['inventory', queryParams],
    queryFn: () => getInventory(queryParams),
    placeholderData: (prev) => prev,
  });

  // Delete with optimistic update
  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteInventoryItem(id),
    onMutate: async (id) => {
      await queryClient.cancelQueries({ queryKey: ['inventory', queryParams] });
      const previous = queryClient.getQueryData(['inventory', queryParams]);
      queryClient.setQueryData(['inventory', queryParams], (old: typeof data) => {
        if (!old) return old;
        return { ...old, data: old.data.filter((r) => r.id !== id), total: old.total - 1 };
      });
      return { previous };
    },
    onError: (_err, _id, context) => {
      if (context?.previous) {
        queryClient.setQueryData(['inventory', queryParams], context.previous);
      }
      enqueueSnackbar('Failed to delete item.', { variant: 'error' });
    },
    onSuccess: () => {
      enqueueSnackbar('Item deleted successfully.', { variant: 'success' });
    },
    onSettled: () => {
      setDeleteTarget(null);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  const handleExportCsv = useCallback(async () => {
    setExportingCsv(true);
    try {
      const blob = await exportCsv({ search: localSearch || undefined, brand: localBrand || undefined, dateFrom, dateTo });
      triggerDownload(blob, `inventory-${Date.now()}.csv`);
    } catch {
      enqueueSnackbar('CSV export failed.', { variant: 'error' });
    } finally {
      setExportingCsv(false);
    }
  }, [localSearch, localBrand, dateFrom, dateTo, enqueueSnackbar]);

  const handleExportExcel = useCallback(async () => {
    setExportingExcel(true);
    try {
      const blob = await exportExcel({ search: localSearch || undefined, brand: localBrand || undefined, dateFrom, dateTo });
      triggerDownload(blob, `inventory-${Date.now()}.xlsx`);
    } catch {
      enqueueSnackbar('Excel export failed.', { variant: 'error' });
    } finally {
      setExportingExcel(false);
    }
  }, [localSearch, localBrand, dateFrom, dateTo, enqueueSnackbar]);

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
          page * rowsPerPage + idx + 1,
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
        headStyles: { fillColor: [21, 101, 192] },
      });

      doc.save(`inventory-${Date.now()}.pdf`);
      enqueueSnackbar('PDF exported', { variant: 'success' });
    } catch (err) {
      console.error('PDF export error:', err);
      enqueueSnackbar(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`, { variant: 'error' });
    } finally {
      setExportingPdf(false);
    }
  }, [rows, page, rowsPerPage, enqueueSnackbar]);

  function handleSort(field: SortField) {
    if (sortBy === field) {
      setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }

  const total = data?.total ?? 0;

  const brandOptions = useMemo(() => {
    const set = new Set(rows.map((r) => r.brand).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const skeletonRows = Array.from({ length: compact ? 5 : 8 });

  return (
    <Box>
      {/* Toolbar */}
      <Box display="flex" flexWrap="wrap" gap={1.5} alignItems="center" mb={1.5}>
        {/* Search */}
        <TextField
          size="small"
          placeholder="Search description, model, SKU…"
          value={localSearch}
          onChange={(e) => { setLocalSearch(e.target.value); }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          }}
          sx={{ minWidth: 240, flex: 1, maxWidth: 360 }}
        />

        {/* Brand filter */}
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Brand</InputLabel>
          <Select
            value={localBrand}
            label="Brand"
            onChange={(e) => setLocalBrand(e.target.value)}
            startAdornment={
              <InputAdornment position="start">
                <FilterListIcon fontSize="small" />
              </InputAdornment>
            }
          >
            <MenuItem value="">All Brands</MenuItem>
            {brandOptions.map((b) => (
              <MenuItem key={b} value={b}>{b}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box flex={1} />

        {/* Export buttons */}
        <Tooltip title="Export CSV">
          <span>
            <Button size="small" variant="outlined" startIcon={exportingCsv ? <CircularProgress size={14} /> : <FileDownloadIcon />} onClick={handleExportCsv} disabled={exportingCsv}>
              CSV
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Export Excel">
          <span>
            <Button size="small" variant="outlined" color="success" startIcon={exportingExcel ? <CircularProgress size={14} /> : <GridOnIcon />} onClick={handleExportExcel} disabled={exportingExcel}>
              Excel
            </Button>
          </span>
        </Tooltip>
        <Tooltip title="Export PDF">
          <span>
            <Button size="small" variant="outlined" color="error" startIcon={exportingPdf ? <CircularProgress size={14} /> : <PictureAsPdfIcon />} onClick={handleExportPdf} disabled={exportingPdf}>
              PDF
            </Button>
          </span>
        </Tooltip>

        {isAdmin && (
          <Button variant="contained" size="small" startIcon={<AddIcon />} onClick={() => setCreateOpen(true)}>
            Add Item
          </Button>
        )}
      </Box>

      {/* Fetch progress */}
      {isFetching && !isLoading && (
        <LinearProgress sx={{ mb: 0.75, borderRadius: 1 }} />
      )}

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table size={compact ? 'small' : 'medium'} stickyHeader>
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align ?? 'left'}
                    sx={{
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      textTransform: 'uppercase',
                      letterSpacing: 0.4,
                      whiteSpace: 'nowrap',
                      bgcolor: 'background.paper',
                      minWidth: col.minWidth,
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
                          <Skeleton variant="text" width={col.id === 'description' ? 180 : 70} />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                : rows.length === 0
                  ? (
                      <TableRow>
                        <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 8 }}>
                          <Box display="flex" flexDirection="column" alignItems="center" gap={1.5}>
                            <Inventory2OutlinedIcon sx={{ fontSize: 52, color: 'text.disabled', opacity: 0.5 }} />
                            <Typography variant="h6" color="text.secondary" fontWeight={600}>
                              No inventory records found
                            </Typography>
                            <Typography variant="body2" color="text.disabled">
                              Try adjusting your search or date filters.
                            </Typography>
                            {(localSearch || localBrand) && (
                              <Button size="small" onClick={() => { setLocalSearch(''); setLocalBrand(''); }}>
                                Clear filters
                              </Button>
                            )}
                          </Box>
                        </TableCell>
                      </TableRow>
                    )
                  : rows.map((row, idx) => {
                      const brandColor = getBrandColor(row.brand);
                      const isPositiveProfit = Number(row.profit) >= 0;
                      const profitColor = isPositiveProfit ? 'success.main' : 'error.main';
                      const marginNum = Number(row.margin);
                      const marginClamped = Math.min(Math.max(marginNum, 0), 100);
                      const marginBarColor = marginNum >= 20 ? '#2e7d32' : marginNum >= 10 ? '#f57f17' : '#c62828';

                      return (
                        <TableRow
                          key={row.id}
                          hover
                          sx={{ cursor: 'pointer', '&:last-child td': { border: 0 } }}
                          onClick={() => setEditItem(row)}
                        >
                          {/* # */}
                          <TableCell>
                            <Typography variant="body2" color="text.disabled">
                              {page * rowsPerPage + idx + 1}
                            </Typography>
                          </TableCell>

                          {/* Date Added */}
                          <TableCell sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" color="text.secondary">
                              {formatDate(row.dateAdded)}
                            </Typography>
                          </TableCell>

                          {/* Description */}
                          <TableCell sx={{ maxWidth: 240 }}>
                            <Typography variant="body2" fontWeight={500} noWrap title={row.description}>
                              {row.description}
                            </Typography>
                            {row.sku && (
                              <Typography variant="caption" color="text.disabled" display="block">
                                SKU: {row.sku}
                              </Typography>
                            )}
                          </TableCell>

                          {/* Brand */}
                          <TableCell>
                            <Chip
                              label={row.brand}
                              size="small"
                              sx={{ bgcolor: brandColor.bg, color: brandColor.color, fontWeight: 600, fontSize: '0.75rem', border: 'none' }}
                            />
                          </TableCell>

                          {/* Model */}
                          <TableCell>
                            <Typography variant="body2" noWrap sx={{ maxWidth: 130 }} title={row.model}>
                              {row.model || '—'}
                            </Typography>
                          </TableCell>

                          {/* Qty */}
                          <TableCell align="right">
                            <Typography variant="body2" fontWeight={600}>
                              {row.quantity.toLocaleString()}
                            </Typography>
                          </TableCell>

                          {/* Cost Price */}
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2">{formatBhd(row.costPrice)}</Typography>
                          </TableCell>

                          {/* Sale Price */}
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2">{formatBhd(row.salePrice)}</Typography>
                          </TableCell>

                          {/* Total Cost */}
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2">{formatBhd(row.totalCost)}</Typography>
                          </TableCell>

                          {/* Total Sale */}
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2">{formatBhd(row.totalSale)}</Typography>
                          </TableCell>

                          {/* Profit */}
                          <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>
                            <Typography variant="body2" fontWeight={600} color={profitColor}>
                              {isPositiveProfit ? '+' : ''}
                              {formatBhd(row.profit)}
                            </Typography>
                          </TableCell>

                          {/* Margin % */}
                          <TableCell sx={{ minWidth: 140 }}>
                            <Box display="flex" alignItems="center" gap={1}>
                              <LinearProgress
                                variant="determinate"
                                value={marginClamped}
                                sx={{
                                  flex: 1,
                                  height: 6,
                                  borderRadius: 3,
                                  bgcolor: 'action.hover',
                                  '& .MuiLinearProgress-bar': {
                                    borderRadius: 3,
                                    backgroundColor: marginBarColor,
                                  },
                                }}
                              />
                              <Typography variant="caption" fontWeight={600} sx={{ minWidth: 40, textAlign: 'right' }}>
                                {Number(row.margin).toFixed(1)}%
                              </Typography>
                            </Box>
                          </TableCell>

                          {/* Actions */}
                          <TableCell align="center" onClick={(e) => e.stopPropagation()}>
                            <Box display="flex" gap={0.5} justifyContent="center">
                              <Tooltip title="Edit">
                                <IconButton size="small" color="primary" onClick={() => setEditItem(row)}>
                                  <EditIcon fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              {isAdmin && (
                                <Tooltip title="Delete">
                                  <IconButton size="small" color="error" onClick={() => setDeleteTarget(row)}>
                                    <DeleteIcon fontSize="small" />
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

        <Divider />

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
        />
      </Paper>

      {/* Create dialog */}
      <CreateInventoryDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSuccess={() => {
          setCreateOpen(false);
          queryClient.invalidateQueries({ queryKey: ['inventory'] });
          queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
          queryClient.invalidateQueries({ queryKey: ['summary'] });
          queryClient.invalidateQueries({ queryKey: ['analytics'] });
        }}
      />

      {/* Edit dialog */}
      {editItem && (
        <EditDialog item={editItem} onClose={() => setEditItem(null)} onSaved={() => setEditItem(null)} />
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Inventory Item"
        message={`Are you sure you want to delete "${deleteTarget?.description}"? This action cannot be undone.`}
        confirmText="Delete"
        severity="error"
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
}
