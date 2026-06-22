import React, { useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  FormLabel,
  Grid,
  IconButton,
  LinearProgress,
  MenuItem,
  Paper,
  Radio,
  RadioGroup,
  Select,
  Stack,
  Step,
  StepLabel,
  Stepper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import EditIcon from '@mui/icons-material/Edit';
import WarningIcon from '@mui/icons-material/Warning';
import ErrorIcon from '@mui/icons-material/Error';
import InfoIcon from '@mui/icons-material/Info';
import SwapHorizIcon from '@mui/icons-material/SwapHoriz';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import PageHeader from '../components/common/PageHeader';
import { useAuth } from '../contexts/AuthContext';
import {
  uploadFile,
  getImport,
  getImports,
  approveImport,
  cancelImport,
  resolveConflicts,
  updateRow,
  type RowResolutionPayload,
} from '../api/imports.api';
import type { ConflictData, ConflictResolution, ImportRow, InventoryImport } from '../types';

// ─── Constants ─────────────────────────────────────────────────────────────────

const STEPS = [
  'Upload',
  'Processing',
  'Column Preview',
  'Conflict Detection',
  'Conflict Resolution',
  'Import Preview',
  'Confirm',
  'Complete',
];

const ACCEPTED = [
  'application/pdf',
  'image/jpeg', 'image/png', 'image/webp',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
  'text/csv',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getField(row: ImportRow, field: string): string {
  const pd = row.parsedData as Record<string, unknown> | undefined;
  if (pd?.[field] != null) return String(pd[field]);
  const rd = row.rawData as Record<string, unknown> | undefined;
  if (rd?.[field] != null) return String(rd[field]);
  return '';
}

function fmtBhd(v: number | string | undefined): string {
  const n = Number(v);
  if (!n && n !== 0) return '—';
  return `BHD ${n.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

function conflictColor(confidence: number): 'error' | 'warning' | 'info' {
  if (confidence >= 85) return 'error';
  if (confidence >= 65) return 'warning';
  return 'info';
}

function conflictLabel(confidence: number): string {
  if (confidence >= 85) return 'High conflict';
  if (confidence >= 65) return 'Medium conflict';
  return 'Low conflict';
}

// ─── Step 0: Upload ───────────────────────────────────────────────────────────

interface UploadStepProps {
  isAdmin: boolean;
  onUpload: (file: File, mode: 'APPEND' | 'REPLACE') => void;
  isLoading: boolean;
}

function UploadStep({ isAdmin, onUpload, isLoading }: UploadStepProps) {
  const [mode, setMode] = useState<'APPEND' | 'REPLACE'>('APPEND');
  const [dragging, setDragging] = useState(false);
  const [confirmReplace, setConfirmReplace] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);

  const handleFile = (file: File) => {
    if (mode === 'REPLACE') {
      setPendingFile(file);
      setConfirmReplace(true);
    } else {
      onUpload(file, 'APPEND');
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    e.target.value = '';
  };

  return (
    <Box maxWidth={680}>
      {isAdmin && (
        <Paper variant="outlined" sx={{ p: 2.5, mb: 3, borderRadius: 2 }}>
          <FormControl component="fieldset">
            <FormLabel component="legend" sx={{ fontWeight: 700, mb: 1, color: 'text.primary' }}>
              Import Mode
            </FormLabel>
            <RadioGroup
              row
              value={mode}
              onChange={(e) => setMode(e.target.value as 'APPEND' | 'REPLACE')}
            >
              <FormControlLabel
                value="APPEND"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600}>Append</Typography>
                    <Typography variant="caption" color="text.secondary">Add rows to existing inventory</Typography>
                  </Box>
                }
              />
              <FormControlLabel
                value="REPLACE"
                control={<Radio />}
                label={
                  <Box>
                    <Typography variant="body2" fontWeight={600} color="error.main">Replace Entire Inventory</Typography>
                    <Typography variant="caption" color="text.secondary">Soft-deletes all current items, replaces with import</Typography>
                  </Box>
                }
                sx={{ ml: 3 }}
              />
            </RadioGroup>
          </FormControl>
          {mode === 'REPLACE' && (
            <Alert severity="error" sx={{ mt: 1.5, borderRadius: 2 }} icon={<WarningIcon />}>
              <strong>Destructive action:</strong> All existing inventory will be archived and replaced with the imported data. A backup snapshot is taken automatically.
            </Alert>
          )}
        </Paper>
      )}

      <Box
        component="label"
        htmlFor="file-upload"
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          border: 2,
          borderStyle: 'dashed',
          borderColor: dragging ? 'primary.main' : 'divider',
          borderRadius: 3,
          p: 6,
          bgcolor: dragging ? 'action.focus' : 'action.hover',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          transition: 'all 0.2s',
          '&:hover': { borderColor: 'primary.main', bgcolor: 'action.focus' },
        }}
      >
        <input
          id="file-upload"
          type="file"
          hidden
          accept={ACCEPTED.join(',')}
          onChange={handleFileChange}
          disabled={isLoading}
        />
        {isLoading ? (
          <CircularProgress size={48} />
        ) : (
          <>
            <CloudUploadIcon sx={{ fontSize: 56, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" fontWeight={600} mb={0.5}>Drop your file here</Typography>
            <Typography variant="body2" color="text.secondary" mb={2}>or click to browse</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" justifyContent="center">
              {['PDF', 'Image', 'Excel', 'CSV'].map((t) => (
                <Chip key={t} label={t} size="small" variant="outlined" />
              ))}
            </Stack>
          </>
        )}
      </Box>
      {isLoading && <LinearProgress sx={{ mt: 2, borderRadius: 1 }} />}

      {/* Replace confirmation dialog */}
      <Dialog open={confirmReplace} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ color: 'error.main', fontWeight: 700 }}>
          Confirm: Replace Entire Inventory
        </DialogTitle>
        <DialogContent>
          <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
            This will permanently archive <strong>all existing inventory items</strong> and replace them with the contents of your file. This cannot be undone without restoring from the backup snapshot.
          </Alert>
          <Typography variant="body2">
            A backup snapshot of the current inventory will be saved to the import record for reference. Continue?
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            variant="outlined"
            onClick={() => { setConfirmReplace(false); setPendingFile(null); }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={() => {
              if (pendingFile) onUpload(pendingFile, 'REPLACE');
              setConfirmReplace(false);
              setPendingFile(null);
            }}
          >
            Replace inventory
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// ─── Step 2: Column Preview ───────────────────────────────────────────────────

function ColumnPreviewStep({ importRecord }: { importRecord: InventoryImport }) {
  const rows = importRecord.importRows ?? [];
  const sample = rows.slice(0, 5);

  const columns = ['description', 'brand', 'model', 'sku', 'quantity', 'costPrice', 'salePrice', 'supplier', 'dateAdded', 'notes'];

  return (
    <Box>
      <Alert severity="info" sx={{ mb: 2, borderRadius: 2 }}>
        {rows.length} rows detected. Showing column mapping — columns with data are highlighted.
      </Alert>
      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              {columns.map((col) => {
                const hasData = sample.some((r) => getField(r, col));
                return (
                  <TableCell
                    key={col}
                    sx={{ fontWeight: 600, color: hasData ? 'text.primary' : 'text.disabled' }}
                  >
                    {col}
                    {!hasData && (
                      <Chip label="empty" size="small" sx={{ ml: 0.5, height: 16, fontSize: 10 }} />
                    )}
                  </TableCell>
                );
              })}
            </TableRow>
          </TableHead>
          <TableBody>
            {sample.map((row, idx) => (
              <TableRow key={row.id}>
                <TableCell>{idx + 1}</TableCell>
                {columns.map((col) => {
                  const val = getField(row, col);
                  return (
                    <TableCell key={col} sx={{ color: val ? 'text.primary' : 'text.disabled', fontSize: 12 }}>
                      {val || '—'}
                    </TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      {rows.length > 5 && (
        <Typography variant="caption" color="text.secondary" mt={1} display="block">
          Showing 5 of {rows.length} rows
        </Typography>
      )}
    </Box>
  );
}

// ─── Step 3: Conflict Detection ───────────────────────────────────────────────

function ConflictDetectionStep({ importRecord }: { importRecord: InventoryImport }) {
  const conflictRows = (importRecord.importRows ?? []).filter((r) => r.conflictData);
  const cleanRows = (importRecord.importRows ?? []).filter((r) => !r.conflictData);

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} color="success.main">{cleanRows.length}</Typography>
          <Typography variant="body2" color="text.secondary">Clean rows</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700} color="warning.main">{conflictRows.length}</Typography>
          <Typography variant="body2" color="text.secondary">Possible conflicts</Typography>
        </Paper>
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, minWidth: 140, textAlign: 'center' }}>
          <Typography variant="h4" fontWeight={700}>{importRecord.totalRows}</Typography>
          <Typography variant="body2" color="text.secondary">Total rows</Typography>
        </Paper>
      </Stack>

      {conflictRows.length === 0 ? (
        <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2 }}>
          No conflicts detected. All rows are new items.
        </Alert>
      ) : (
        <>
          <Alert severity="warning" sx={{ mb: 2, borderRadius: 2 }}>
            {conflictRows.length} rows may match existing inventory items. Review and resolve each conflict in the next step.
          </Alert>
          <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>#</TableCell>
                  <TableCell>Imported item</TableCell>
                  <TableCell>Possible match</TableCell>
                  <TableCell>Confidence</TableCell>
                  <TableCell>Reasons</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {conflictRows.map((row) => {
                  const cd = row.conflictData as ConflictData;
                  const color = conflictColor(cd.confidence);
                  return (
                    <TableRow key={row.id}>
                      <TableCell>{row.rowNumber}</TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{getField(row, 'description') || '—'}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {getField(row, 'brand')} {getField(row, 'model')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>{String(cd.existingItem?.description ?? '—')}</Typography>
                        <Typography variant="caption" color="text.secondary">
                          {String(cd.existingItem?.brand ?? '')} {String(cd.existingItem?.model ?? '')}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={`${cd.confidence}% — ${conflictLabel(cd.confidence)}`}
                          color={color}
                          size="small"
                          icon={color === 'error' ? <ErrorIcon /> : color === 'warning' ? <WarningIcon /> : <InfoIcon />}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="caption">{cd.reasons.join(', ')}</Typography>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        </>
      )}
    </Box>
  );
}

// ─── Step 4: Conflict Resolution ──────────────────────────────────────────────

interface ConflictResolutionStepProps {
  importRecord: InventoryImport;
  resolutions: Record<string, ConflictResolution>;
  onResolutionChange: (rowId: string, resolution: ConflictResolution) => void;
  onBulkResolve: (resolution: ConflictResolution) => void;
}

function ConflictResolutionStep({
  importRecord,
  resolutions,
  onResolutionChange,
  onBulkResolve,
}: ConflictResolutionStepProps) {
  const conflictRows = (importRecord.importRows ?? []).filter((r) => r.conflictData);
  const resolvedCount = conflictRows.filter((r) => resolutions[r.id]).length;

  if (conflictRows.length === 0) {
    return (
      <Alert severity="success" icon={<CheckCircleIcon />} sx={{ borderRadius: 2 }}>
        No conflicts to resolve.
      </Alert>
    );
  }

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} alignItems="center" flexWrap="wrap">
        <Typography variant="body1" fontWeight={600}>
          {resolvedCount} / {conflictRows.length} resolved
        </Typography>
        <Box flex={1} />
        <Typography variant="body2" color="text.secondary" mr={1}>Bulk resolve all:</Typography>
        <Button
          size="small"
          variant="outlined"
          onClick={() => onBulkResolve('KEEP_EXISTING')}
        >
          Keep existing
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="warning"
          onClick={() => onBulkResolve('USE_IMPORTED')}
        >
          Use imported
        </Button>
        <Button
          size="small"
          variant="outlined"
          color="info"
          onClick={() => onBulkResolve('SKIP')}
        >
          Skip all
        </Button>
      </Stack>

      <Stack spacing={3}>
        {conflictRows.map((row) => {
          const cd = row.conflictData as ConflictData;
          const resolution = resolutions[row.id];
          const color = resolution ? 'success' : conflictColor(cd.confidence);

          return (
            <Paper
              key={row.id}
              variant="outlined"
              sx={{
                borderRadius: 2,
                borderColor: `${color}.main`,
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  px: 2,
                  py: 1,
                  bgcolor: `${color}.light`,
                  borderBottom: 1,
                  borderColor: `${color}.main`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                {resolution
                  ? <CheckCircleIcon sx={{ fontSize: 16, color: `${color}.dark` }} />
                  : <WarningIcon sx={{ fontSize: 16, color: `${color}.dark` }} />
                }
                <Typography variant="caption" fontWeight={700} color={`${color}.dark`}>
                  Row {row.rowNumber} — {cd.confidence}% confidence — {cd.reasons.join(', ')}
                  {resolution && ` — ✓ ${resolution.replace(/_/g, ' ').toLowerCase()}`}
                </Typography>
              </Box>

              <Box sx={{ p: 2 }}>
                <Grid container spacing={2} mb={2}>
                  {/* Imported item card */}
                  <Grid item xs={12} sm={5}>
                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                      <CardContent sx={{ pb: '16px !important' }}>
                        <Typography variant="caption" fontWeight={700} color="primary.main" display="block" mb={1}>
                          IMPORTING
                        </Typography>
                        {[
                          ['Description', getField(row, 'description')],
                          ['Brand', getField(row, 'brand')],
                          ['Model', getField(row, 'model')],
                          ['SKU', getField(row, 'sku')],
                          ['Qty', getField(row, 'quantity') || '1'],
                          ['Cost', fmtBhd(getField(row, 'costPrice'))],
                          ['Sale', fmtBhd(getField(row, 'salePrice'))],
                        ].map(([label, val]) => (
                          <Box key={label} display="flex" gap={1} mb={0.5}>
                            <Typography variant="caption" color="text.secondary" minWidth={60}>{label}:</Typography>
                            <Typography variant="caption" fontWeight={600}>{val || '—'}</Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>

                  {/* VS icon */}
                  <Grid item xs={12} sm={2} display="flex" alignItems="center" justifyContent="center">
                    <SwapHorizIcon sx={{ color: 'text.disabled', fontSize: 32 }} />
                  </Grid>

                  {/* Existing item card */}
                  <Grid item xs={12} sm={5}>
                    <Card variant="outlined" sx={{ borderRadius: 2, height: '100%', borderColor: `${color}.main` }}>
                      <CardContent sx={{ pb: '16px !important' }}>
                        <Typography variant="caption" fontWeight={700} color={`${color}.dark`} display="block" mb={1}>
                          EXISTING IN INVENTORY
                        </Typography>
                        {[
                          ['Description', String(cd.existingItem?.description ?? '—')],
                          ['Brand', String(cd.existingItem?.brand ?? '—')],
                          ['Model', String(cd.existingItem?.model ?? '—')],
                          ['SKU', String(cd.existingItem?.sku ?? '—')],
                          ['Qty', String(cd.existingItem?.quantity ?? '—')],
                          ['Cost', fmtBhd(cd.existingItem?.costPrice as number)],
                          ['Sale', fmtBhd(cd.existingItem?.salePrice as number)],
                        ].map(([label, val]) => (
                          <Box key={label} display="flex" gap={1} mb={0.5}>
                            <Typography variant="caption" color="text.secondary" minWidth={60}>{label}:</Typography>
                            <Typography variant="caption" fontWeight={600}>{val}</Typography>
                          </Box>
                        ))}
                      </CardContent>
                    </Card>
                  </Grid>
                </Grid>

                {/* Resolution selector */}
                <FormControl fullWidth size="small">
                  <Select
                    value={resolution ?? ''}
                    displayEmpty
                    onChange={(e) => onResolutionChange(row.id, e.target.value as ConflictResolution)}
                    renderValue={(v) => {
                      if (!v) return <Typography color="text.disabled">Select resolution…</Typography>;
                      const labels: Record<ConflictResolution, string> = {
                        KEEP_EXISTING: 'Keep existing — skip this imported row',
                        USE_IMPORTED: 'Use imported — overwrite existing with imported data',
                        MERGE: 'Merge — update existing with imported fields',
                        CREATE_NEW: 'Create new — add as separate item (SKU cleared)',
                        SKIP: 'Skip — ignore this row',
                      };
                      return labels[v as ConflictResolution] ?? v;
                    }}
                  >
                    <MenuItem value="KEEP_EXISTING">Keep existing — skip this imported row</MenuItem>
                    <MenuItem value="USE_IMPORTED">Use imported — overwrite existing with imported data</MenuItem>
                    <MenuItem value="MERGE">Merge — update existing with imported fields</MenuItem>
                    <MenuItem value="CREATE_NEW">Create new — add as separate item (SKU cleared)</MenuItem>
                    <MenuItem value="SKIP">Skip — ignore this row</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}

// ─── Step 5: Import Preview ───────────────────────────────────────────────────

interface ImportPreviewStepProps {
  importRecord: InventoryImport;
  resolutions: Record<string, ConflictResolution>;
  onEditRow: (row: ImportRow) => void;
}

function ImportPreviewStep({ importRecord, resolutions, onEditRow }: ImportPreviewStepProps) {
  const rows = importRecord.importRows ?? [];

  function getRowAction(row: ImportRow): { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' } {
    if (!row.conflictData) return { label: 'Create new', color: 'success' };
    const res = resolutions[row.id];
    if (!res) return { label: 'Unresolved', color: 'error' };
    const map: Record<ConflictResolution, { label: string; color: 'success' | 'warning' | 'error' | 'info' | 'default' }> = {
      KEEP_EXISTING: { label: 'Keep existing', color: 'default' },
      USE_IMPORTED: { label: 'Overwrite', color: 'warning' },
      MERGE: { label: 'Merge', color: 'info' },
      CREATE_NEW: { label: 'Create new', color: 'success' },
      SKIP: { label: 'Skip', color: 'default' },
    };
    return map[res] ?? { label: res, color: 'default' };
  }

  const summary = {
    create: rows.filter((r) => !r.conflictData || resolutions[r.id] === 'CREATE_NEW' || resolutions[r.id] === 'USE_IMPORTED').length,
    merge: rows.filter((r) => resolutions[r.id] === 'MERGE').length,
    skip: rows.filter((r) => resolutions[r.id] === 'KEEP_EXISTING' || resolutions[r.id] === 'SKIP').length,
    unresolved: rows.filter((r) => r.conflictData && !resolutions[r.id]).length,
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} mb={3} flexWrap="wrap">
        <Chip label={`${summary.create} to create`} color="success" />
        <Chip label={`${summary.merge} to merge/update`} color="info" />
        <Chip label={`${summary.skip} to skip`} />
        {summary.unresolved > 0 && <Chip label={`${summary.unresolved} unresolved`} color="error" icon={<ErrorIcon />} />}
      </Stack>

      {summary.unresolved > 0 && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {summary.unresolved} conflict(s) still unresolved. Go back to resolve them.
        </Alert>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Description</TableCell>
              <TableCell>Brand / Model</TableCell>
              <TableCell>SKU</TableCell>
              <TableCell align="right">Qty</TableCell>
              <TableCell align="right">Cost</TableCell>
              <TableCell align="right">Sale</TableCell>
              <TableCell>Action</TableCell>
              <TableCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => {
              const action = getRowAction(row);
              return (
                <TableRow key={row.id} sx={{ opacity: action.color === 'default' ? 0.5 : 1 }}>
                  <TableCell>{row.rowNumber}</TableCell>
                  <TableCell>
                    <Typography variant="body2" noWrap sx={{ maxWidth: 200 }}>
                      {getField(row, 'description') || '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2">{getField(row, 'brand')} {getField(row, 'model')}</Typography>
                  </TableCell>
                  <TableCell>{getField(row, 'sku') || '—'}</TableCell>
                  <TableCell align="right">{getField(row, 'quantity') || 1}</TableCell>
                  <TableCell align="right">{fmtBhd(getField(row, 'costPrice'))}</TableCell>
                  <TableCell align="right">{fmtBhd(getField(row, 'salePrice'))}</TableCell>
                  <TableCell>
                    <Chip label={action.label} color={action.color} size="small" />
                  </TableCell>
                  <TableCell>
                    <Tooltip title="Edit row">
                      <IconButton size="small" onClick={() => onEditRow(row)}>
                        <EditIcon sx={{ fontSize: 16 }} />
                      </IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableContainer>
    </Box>
  );
}

// ─── Edit Row Dialog ──────────────────────────────────────────────────────────

interface EditRowDialogProps {
  row: ImportRow | null;
  onClose: () => void;
  onSave: (rowId: string, data: Record<string, unknown>) => void;
  isSaving: boolean;
}

function EditRowDialog({ row, onClose, onSave, isSaving }: EditRowDialogProps) {
  const [values, setValues] = useState<Record<string, string>>({});

  React.useEffect(() => {
    if (row) {
      const fields = ['description', 'brand', 'model', 'sku', 'serialNumber', 'quantity', 'costPrice', 'salePrice', 'supplier', 'dateAdded', 'notes'];
      const initial: Record<string, string> = {};
      fields.forEach((f) => { initial[f] = getField(row, f); });
      setValues(initial);
    }
  }, [row]);

  const set = (field: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setValues((prev) => ({ ...prev, [field]: e.target.value }));
  };

  if (!row) return null;

  return (
    <Dialog open={Boolean(row)} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle fontWeight={700}>Edit Row {row.rowNumber}</DialogTitle>
      <Divider />
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12}>
            <TextField label="Description" fullWidth value={values.description ?? ''} onChange={set('description')} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Brand" fullWidth value={values.brand ?? ''} onChange={set('brand')} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Model" fullWidth value={values.model ?? ''} onChange={set('model')} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="SKU" fullWidth value={values.sku ?? ''} onChange={set('sku')} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Serial Number" fullWidth value={values.serialNumber ?? ''} onChange={set('serialNumber')} />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Quantity" type="number" fullWidth value={values.quantity ?? '1'} onChange={set('quantity')} />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Cost Price" type="number" fullWidth value={values.costPrice ?? '0'} onChange={set('costPrice')} inputProps={{ step: '0.001' }} />
          </Grid>
          <Grid item xs={4}>
            <TextField label="Sale Price" type="number" fullWidth value={values.salePrice ?? '0'} onChange={set('salePrice')} inputProps={{ step: '0.001' }} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Supplier" fullWidth value={values.supplier ?? ''} onChange={set('supplier')} />
          </Grid>
          <Grid item xs={6}>
            <TextField label="Date Added" type="date" fullWidth value={values.dateAdded ?? ''} onChange={set('dateAdded')} InputLabelProps={{ shrink: true }} />
          </Grid>
          <Grid item xs={12}>
            <TextField label="Notes" fullWidth multiline rows={2} value={values.notes ?? ''} onChange={set('notes')} />
          </Grid>
        </Grid>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ px: 3, py: 2 }}>
        <Button variant="outlined" onClick={onClose} disabled={isSaving}>Cancel</Button>
        <Button
          variant="contained"
          disabled={isSaving}
          startIcon={isSaving ? <CircularProgress size={16} color="inherit" /> : undefined}
          onClick={() => onSave(row.id, {
            description: values.description,
            brand: values.brand,
            model: values.model,
            sku: values.sku || undefined,
            serialNumber: values.serialNumber || undefined,
            quantity: Number(values.quantity) || 1,
            costPrice: Number(values.costPrice) || 0,
            salePrice: Number(values.salePrice) || 0,
            supplier: values.supplier || undefined,
            dateAdded: values.dateAdded || undefined,
            notes: values.notes || undefined,
          })}
        >
          {isSaving ? 'Saving…' : 'Save'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Step 6: Confirm ──────────────────────────────────────────────────────────

interface ConfirmStepProps {
  importRecord: InventoryImport;
  resolutions: Record<string, ConflictResolution>;
}

function ConfirmStep({ importRecord, resolutions }: ConfirmStepProps) {
  const rows = importRecord.importRows ?? [];
  const conflicts = rows.filter((r) => r.conflictData);
  const unresolved = conflicts.filter((r) => !resolutions[r.id]);

  return (
    <Box maxWidth={560}>
      <Typography variant="h6" fontWeight={700} mb={2}>Ready to import?</Typography>

      {importRecord.importMode === 'REPLACE' && (
        <Alert severity="error" icon={<WarningIcon />} sx={{ mb: 2, borderRadius: 2 }}>
          <strong>Replace mode:</strong> All existing inventory will be archived. This import will become the new inventory.
        </Alert>
      )}

      {unresolved.length > 0 && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>
          {unresolved.length} unresolved conflict(s). Please go back and resolve them.
        </Alert>
      )}

      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2, mb: 2 }}>
        <Stack spacing={1}>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">File</Typography>
            <Typography variant="body2" fontWeight={600}>{importRecord.originalName}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Mode</Typography>
            <Chip label={importRecord.importMode} size="small" color={importRecord.importMode === 'REPLACE' ? 'error' : 'success'} />
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Total rows</Typography>
            <Typography variant="body2" fontWeight={600}>{rows.length}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Conflicts detected</Typography>
            <Typography variant="body2" fontWeight={600}>{conflicts.length}</Typography>
          </Box>
          <Box display="flex" justifyContent="space-between">
            <Typography variant="body2" color="text.secondary">Conflicts resolved</Typography>
            <Typography variant="body2" fontWeight={600} color={unresolved.length ? 'error.main' : 'success.main'}>
              {conflicts.length - unresolved.length} / {conflicts.length}
            </Typography>
          </Box>
        </Stack>
      </Paper>
    </Box>
  );
}

// ─── Step 7: Complete ─────────────────────────────────────────────────────────

function CompleteStep({ report, onNew }: { report: Record<string, unknown> | null; onNew: () => void }) {
  const errors = (report?.errors as string[] | undefined) ?? [];
  const hasFailed = (report?.failed as number) > 0;

  return (
    <Paper variant="outlined" sx={{ p: 5, textAlign: 'center', maxWidth: 560, mx: 'auto', borderRadius: 3 }}>
      <CheckCircleIcon sx={{ fontSize: 72, color: 'success.main', mb: 2 }} />
      <Typography variant="h5" fontWeight={700} mb={1}>Import Complete!</Typography>
      {report && (
        <Stack direction="row" spacing={2} justifyContent="center" mb={2} flexWrap="wrap">
          <Chip label={`${report.created as number} created`} color="success" />
          {(report.updated as number) > 0 && <Chip label={`${report.updated as number} updated`} color="info" />}
          {(report.skipped as number) > 0 && <Chip label={`${report.skipped as number} skipped`} />}
          {hasFailed && <Chip label={`${report.failed as number} failed`} color="error" />}
        </Stack>
      )}
      <Typography color="text.secondary" mb={3}>
        {hasFailed ? 'Import finished with some errors.' : 'Items have been added to inventory successfully.'}
      </Typography>
      {hasFailed && errors.length > 0 && (
        <Box textAlign="left" mb={3}>
          <Alert severity="error" sx={{ borderRadius: 2 }}>
            <Typography variant="caption" fontWeight={700} display="block" mb={1}>
              Failed rows:
            </Typography>
            {errors.map((e, i) => (
              <Typography key={i} variant="caption" display="block" sx={{ fontFamily: 'monospace' }}>
                {e}
              </Typography>
            ))}
          </Alert>
        </Box>
      )}
      <Button variant="contained" onClick={onNew}>Import Another File</Button>
    </Paper>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

const STEPS_COUNT = STEPS.length;

export default function Import() {
  const { enqueueSnackbar } = useSnackbar();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(0);
  const [importRecord, setImportRecord] = useState<InventoryImport | null>(null);
  const [resolutions, setResolutions] = useState<Record<string, ConflictResolution>>({});
  const [editingRow, setEditingRow] = useState<ImportRow | null>(null);
  const [importReport, setImportReport] = useState<Record<string, unknown> | null>(null);

  const { hasRole } = useAuth();
  const isAdmin = hasRole('ADMIN');

  const { data: imports, isLoading: importsLoading } = useQuery({
    queryKey: ['imports'],
    queryFn: getImports,
  });

  const uploadMutation = useMutation({
    mutationFn: ({ file, mode }: { file: File; mode: 'APPEND' | 'REPLACE' }) =>
      uploadFile(file, mode),
    onSuccess: (data) => {
      setImportRecord(data);
      setStep(1); // Processing → auto-advance
      enqueueSnackbar('File uploaded, analysing…', { variant: 'info' });
      // Short delay to show processing state, then advance to column preview
      setTimeout(() => setStep(2), 800);
    },
    onError: (err: { message?: string }) =>
      enqueueSnackbar(err?.message ?? 'Upload failed', { variant: 'error' }),
  });

  const resolveConflictsMutation = useMutation({
    mutationFn: (payload: RowResolutionPayload[]) =>
      resolveConflicts(importRecord!.id, payload),
    onSuccess: (updated) => {
      setImportRecord(updated);
      enqueueSnackbar('Resolutions saved', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Failed to save resolutions', { variant: 'error' }),
  });

  const updateRowMutation = useMutation({
    mutationFn: ({ rowId, data }: { rowId: string; data: Record<string, unknown> }) =>
      updateRow(importRecord!.id, rowId, { parsedData: data }),
    onSuccess: (updated) => {
      // Update the row in local importRecord
      setImportRecord((prev) =>
        prev
          ? {
              ...prev,
              importRows: prev.importRows?.map((r) => (r.id === updated.id ? updated : r)),
            }
          : prev,
      );
      setEditingRow(null);
      enqueueSnackbar('Row updated', { variant: 'success' });
    },
    onError: () => enqueueSnackbar('Update failed', { variant: 'error' }),
  });

  const approveMutation = useMutation({
    mutationFn: () => {
      const rows = (importRecord?.importRows ?? []).map((r) => ({ rowId: r.id }));
      return approveImport(importRecord!.id, rows);
    },
    onSuccess: (result) => {
      setImportReport(result as Record<string, unknown>);
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      queryClient.invalidateQueries({ queryKey: ['analytics'] });
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      setStep(7);
    },
    onError: (err: { message?: string }) =>
      enqueueSnackbar(err?.message ?? 'Import failed', { variant: 'error' }),
  });

  const cancelMutation = useMutation({
    mutationFn: () => cancelImport(importRecord!.id),
    onSuccess: () => {
      setImportRecord(null);
      setResolutions({});
      setStep(0);
      enqueueSnackbar('Import cancelled', { variant: 'warning' });
    },
  });

  // ─── Navigation ─────────────────────────────────────────────────────────────

  function goBack() {
    setStep((s) => Math.max(0, s - 1));
  }

  function goNext() {
    if (step === 4) {
      // Save resolutions before advancing
      const payload: RowResolutionPayload[] = Object.entries(resolutions).map(([rowId, resolution]) => ({ rowId, resolution }));
      if (payload.length > 0) {
        resolveConflictsMutation.mutate(payload, { onSuccess: () => setStep(5) });
        return;
      }
    }
    setStep((s) => Math.min(STEPS_COUNT - 1, s + 1));
  }

  function handleResolutionChange(rowId: string, resolution: ConflictResolution) {
    setResolutions((prev) => ({ ...prev, [rowId]: resolution }));
  }

  function handleBulkResolve(resolution: ConflictResolution) {
    const conflictRows = (importRecord?.importRows ?? []).filter((r) => r.conflictData);
    const bulk: Record<string, ConflictResolution> = {};
    conflictRows.forEach((r) => { bulk[r.id] = resolution; });
    setResolutions((prev) => ({ ...prev, ...bulk }));
  }

  const conflictCount = (importRecord?.importRows ?? []).filter((r) => r.conflictData).length;
  const unresolvedCount = (importRecord?.importRows ?? []).filter(
    (r) => r.conflictData && !resolutions[r.id],
  ).length;

  // Skip conflict steps if no conflicts
  const effectiveSteps = conflictCount === 0 && step >= 2
    ? STEPS.filter((_, i) => i !== 3 && i !== 4)
    : STEPS;

  const canProceed = (() => {
    if (step === 4 && unresolvedCount > 0) return false;
    if (step === 6 && unresolvedCount > 0) return false;
    return true;
  })();

  const showNavButtons = step >= 2 && step <= 6;

  return (
    <Box>
      <PageHeader
        title="Import Inventory"
        subtitle="Upload PDF, images, spreadsheets, or CSV files to bulk-import inventory"
      />

      <Stepper activeStep={step} sx={{ mb: 4 }} alternativeLabel>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step content */}
      <Box mb={3}>
        {step === 0 && (
          <UploadStep
            isAdmin={isAdmin}
            onUpload={(file, mode) => uploadMutation.mutate({ file, mode })}
            isLoading={uploadMutation.isPending}
          />
        )}

        {step === 1 && (
          <Box display="flex" flexDirection="column" alignItems="center" gap={3} py={6}>
            <CircularProgress size={64} />
            <Typography variant="h6">Processing your file…</Typography>
            <LinearProgress sx={{ width: 300, borderRadius: 1 }} />
          </Box>
        )}

        {step === 2 && importRecord && (
          <ColumnPreviewStep importRecord={importRecord} />
        )}

        {step === 3 && importRecord && (
          <ConflictDetectionStep importRecord={importRecord} />
        )}

        {step === 4 && importRecord && (
          <ConflictResolutionStep
            importRecord={importRecord}
            resolutions={resolutions}
            onResolutionChange={handleResolutionChange}
            onBulkResolve={handleBulkResolve}
          />
        )}

        {step === 5 && importRecord && (
          <ImportPreviewStep
            importRecord={importRecord}
            resolutions={resolutions}
            onEditRow={setEditingRow}
          />
        )}

        {step === 6 && importRecord && (
          <ConfirmStep importRecord={importRecord} resolutions={resolutions} />
        )}

        {step === 7 && (
          <CompleteStep
            report={importReport}
            onNew={() => { setImportRecord(null); setResolutions({}); setStep(0); }}
          />
        )}
      </Box>

      {/* Navigation buttons */}
      {showNavButtons && (
        <Stack direction="row" spacing={2} mt={2}>
          <Button variant="outlined" onClick={goBack} disabled={resolveConflictsMutation.isPending}>
            Back
          </Button>

          {step < 6 ? (
            <>
              <Button
                variant="contained"
                onClick={() => {
                  // Skip conflict steps if none
                  if (step === 2 && conflictCount === 0) { setStep(5); return; }
                  if (step === 3 && conflictCount === 0) { setStep(5); return; }
                  goNext();
                }}
                disabled={!canProceed || resolveConflictsMutation.isPending}
                startIcon={resolveConflictsMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
              >
                {resolveConflictsMutation.isPending ? 'Saving…' : 'Continue'}
              </Button>
              <Button variant="text" color="error" onClick={() => cancelMutation.mutate()} disabled={cancelMutation.isPending}>
                Cancel import
              </Button>
            </>
          ) : (
            <Button
              variant="contained"
              color="success"
              onClick={() => approveMutation.mutate()}
              disabled={!canProceed || approveMutation.isPending || unresolvedCount > 0}
              startIcon={approveMutation.isPending ? <CircularProgress size={16} color="inherit" /> : <CheckCircleIcon />}
            >
              {approveMutation.isPending ? 'Importing…' : 'Confirm & Import'}
            </Button>
          )}
        </Stack>
      )}

      {/* Edit row dialog */}
      <EditRowDialog
        row={editingRow}
        onClose={() => setEditingRow(null)}
        onSave={(rowId, data) => updateRowMutation.mutate({ rowId, data })}
        isSaving={updateRowMutation.isPending}
      />

      {/* Import history */}
      {step === 0 && (
        <Box mt={5}>
          <Typography variant="h6" fontWeight={600} mb={2}>Import History</Typography>
          {importsLoading ? (
            <LinearProgress />
          ) : !imports?.length ? (
            <Typography color="text.secondary">No imports yet</Typography>
          ) : (
            <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Date</TableCell>
                    <TableCell>File</TableCell>
                    <TableCell>Uploaded by</TableCell>
                    <TableCell>Mode</TableCell>
                    <TableCell align="right">Rows</TableCell>
                    <TableCell align="right">Conflicts</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell />
                  </TableRow>
                </TableHead>
                <TableBody>
                  {imports.map((imp: InventoryImport) => {
                    const canContinue = imp.status !== 'APPROVED';
                    return (
                      <TableRow key={imp.id}>
                        <TableCell sx={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                          {new Date(imp.createdAt).toLocaleString()}
                        </TableCell>
                        <TableCell sx={{ maxWidth: 180 }}>
                          <Typography variant="body2" noWrap>{imp.originalName}</Typography>
                          <Typography variant="caption" color="text.secondary">{imp.fileType}</Typography>
                        </TableCell>
                        <TableCell>
                          {imp.createdBy ? (
                            <Box>
                              <Typography variant="body2" fontWeight={600}>
                                {imp.createdBy.firstName} {imp.createdBy.lastName}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {imp.createdBy.email}
                              </Typography>
                            </Box>
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={imp.importMode ?? 'APPEND'}
                            size="small"
                            color={(imp.importMode ?? 'APPEND') === 'REPLACE' ? 'error' : 'default'}
                          />
                        </TableCell>
                        <TableCell align="right">{imp.totalRows ?? 0}</TableCell>
                        <TableCell align="right">
                          {(imp.conflictsDetected ?? 0) > 0 ? (
                            <Chip
                              label={`${imp.conflictsDetected} / ${imp.conflictsResolved} resolved`}
                              size="small"
                              color={imp.conflictsDetected === imp.conflictsResolved ? 'success' : 'warning'}
                            />
                          ) : '—'}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={imp.status}
                            size="small"
                            color={
                              imp.status === 'APPROVED' ? 'success' :
                              imp.status === 'FAILED' ? 'error' : 'warning'
                            }
                          />
                        </TableCell>
                        <TableCell sx={{ whiteSpace: 'nowrap' }}>
                          {canContinue && (
                            <Button
                              size="small"
                              variant="outlined"
                              color="error"
                              onClick={async () => {
                                try {
                                  const full = await getImport(imp.id);
                                  setImportRecord(full);
                                  setResolutions({});
                                  // Resume at column preview (step 2)
                                  setStep(2);
                                } catch {
                                  enqueueSnackbar('Failed to load import', { variant: 'error' });
                                }
                              }}
                            >
                              Continue
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </TableContainer>
          )}
        </Box>
      )}
    </Box>
  );
}
