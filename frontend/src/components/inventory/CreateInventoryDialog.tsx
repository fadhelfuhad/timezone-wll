import { zodResolver } from '@hookform/resolvers/zod';
import Autocomplete from '@mui/material/Autocomplete';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useSnackbar } from 'notistack';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { createInventoryItem, getInventoryItemBySku, updateInventoryItem } from '../../api/inventory.api';
import type { InventoryItem } from '../../types';
import { inventorySchema, type InventoryFormValues, WATCH_BRANDS } from './InventoryFormSchema';

interface Props {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

function formatBhd(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 'BHD 0.000';
  return `BHD ${value.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

export default function CreateInventoryDialog({ open, onClose, onSuccess }: Props) {
  const queryClient = useQueryClient();
  const { enqueueSnackbar } = useSnackbar();

  const {
    control,
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<InventoryFormValues>({
    resolver: zodResolver(inventorySchema),
    defaultValues: {
      description: '',
      brand: '',
      model: '',
      sku: '',
      serialNumber: '',
      quantity: 1,
      costPrice: 0,
      salePrice: 0,
      dateAdded: new Date().toISOString().split('T')[0],
      supplier: '',
      notes: '',
    },
  });

  const watchedQuantity = useWatch({ control, name: 'quantity' });
  const watchedCostPrice = useWatch({ control, name: 'costPrice' });
  const watchedSalePrice = useWatch({ control, name: 'salePrice' });

  const qty = Number(watchedQuantity) || 0;
  const cost = Number(watchedCostPrice) || 0;
  const sale = Number(watchedSalePrice) || 0;
  const totalCost = qty * cost;
  const totalSale = qty * sale;
  const profit = totalSale - totalCost;
  const margin = totalCost > 0 ? (profit / totalCost) * 100 : 0;

  const [conflictItem, setConflictItem] = useState<InventoryItem | null>(null);
  const [pendingData, setPendingData] = useState<InventoryFormValues | null>(null);

  function invalidateAll() {
    queryClient.invalidateQueries({ queryKey: ['inventory'] });
    queryClient.invalidateQueries({ queryKey: ['inventory-summary'] });
    queryClient.invalidateQueries({ queryKey: ['summary'] });
    queryClient.invalidateQueries({ queryKey: ['analytics'] });
  }

  const createMutation = useMutation({
    mutationFn: (data: InventoryFormValues) =>
      createInventoryItem({
        description: data.description,
        brand: data.brand,
        model: data.model,
        sku: data.sku || undefined,
        serialNumber: data.serialNumber || undefined,
        quantity: data.quantity,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        dateAdded: data.dateAdded || new Date().toISOString().split('T')[0],
        supplier: data.supplier || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      enqueueSnackbar('Inventory item created successfully', { variant: 'success' });
      invalidateAll();
      reset();
      setConflictItem(null);
      setPendingData(null);
      onSuccess();
    },
    onError: async (err: unknown) => {
      const status = (err as { statusCode?: number })?.statusCode;
      const msg = (err as { message?: string })?.message ?? '';
      if (status === 409 && msg.toLowerCase().includes('sku') && pendingData?.sku) {
        try {
          const existing = await getInventoryItemBySku(pendingData.sku);
          setConflictItem(existing);
        } catch {
          enqueueSnackbar(msg, { variant: 'error' });
        }
      } else {
        enqueueSnackbar(msg || 'Failed to create inventory item', { variant: 'error' });
      }
    },
  });

  const incrementMutation = useMutation({
    mutationFn: ({ id, quantity }: { id: string; quantity: number }) =>
      updateInventoryItem(id, { quantity }),
    onSuccess: () => {
      enqueueSnackbar('Quantity updated successfully', { variant: 'success' });
      invalidateAll();
      reset();
      setConflictItem(null);
      setPendingData(null);
      onSuccess();
    },
    onError: () => {
      enqueueSnackbar('Failed to update quantity', { variant: 'error' });
    },
  });

  const duplicateMutation = useMutation({
    mutationFn: (data: InventoryFormValues) =>
      createInventoryItem({
        description: data.description,
        brand: data.brand,
        model: data.model,
        sku: undefined,
        serialNumber: data.serialNumber || undefined,
        quantity: data.quantity,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        dateAdded: data.dateAdded || new Date().toISOString().split('T')[0],
        supplier: data.supplier || undefined,
        notes: data.notes || undefined,
      }),
    onSuccess: () => {
      enqueueSnackbar('Duplicate item created (SKU cleared)', { variant: 'success' });
      invalidateAll();
      reset();
      setConflictItem(null);
      setPendingData(null);
      onSuccess();
    },
    onError: () => {
      enqueueSnackbar('Failed to create duplicate item', { variant: 'error' });
    },
  });

  const isBusy = createMutation.isPending || incrementMutation.isPending || duplicateMutation.isPending;

  function handleClose() {
    if (isBusy) return;
    reset();
    setConflictItem(null);
    setPendingData(null);
    onClose();
  }

  function onSubmit(data: InventoryFormValues) {
    setPendingData(data);
    createMutation.mutate(data);
  }

  function handleIncrementExisting() {
    if (!conflictItem || !pendingData) return;
    incrementMutation.mutate({
      id: conflictItem.id,
      quantity: conflictItem.quantity + pendingData.quantity,
    });
  }

  function handleDuplicateNew() {
    if (!pendingData) return;
    duplicateMutation.mutate(pendingData);
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Add Inventory Item</DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
        {/* ── Conflict banner ── */}
        {conflictItem && (
          <Alert
            severity="error"
            sx={{ mb: 2.5, borderRadius: 2, '& .MuiAlert-message': { width: '100%' } }}
          >
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              SKU "{conflictItem.sku}" already exists — existing item details:
            </Typography>
            <Box component="ul" sx={{ m: 0, pl: 2, '& li': { mb: 0.25 } }}>
              {[
                ['Description', conflictItem.description],
                ['Brand', conflictItem.brand],
                ['Model', conflictItem.model],
                ['SKU', conflictItem.sku],
                ['Quantity', String(conflictItem.quantity)],
                ['Cost Price', `BHD ${Number(conflictItem.costPrice).toLocaleString('en-BH', { minimumFractionDigits: 3 })}`],
                ['Sale Price', `BHD ${Number(conflictItem.salePrice).toLocaleString('en-BH', { minimumFractionDigits: 3 })}`],
                ['Supplier', conflictItem.supplier ?? '—'],
                ['Date Added', conflictItem.dateAdded ? new Date(conflictItem.dateAdded).toLocaleDateString() : '—'],
              ].map(([label, val]) => (
                <li key={label}>
                  <Typography component="span" variant="body2" fontWeight={600}>{label}: </Typography>
                  <Typography component="span" variant="body2">{val}</Typography>
                </li>
              ))}
            </Box>
            <Box display="flex" gap={1.5} mt={2} flexWrap="wrap">
              <Button
                size="small"
                variant="contained"
                color="error"
                disabled={isBusy}
                startIcon={incrementMutation.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
                onClick={handleIncrementExisting}
              >
                Add to existing (qty {conflictItem.quantity} → {conflictItem.quantity + (pendingData?.quantity ?? 1)})
              </Button>
              <Button
                size="small"
                variant="outlined"
                color="error"
                disabled={isBusy}
                startIcon={duplicateMutation.isPending ? <CircularProgress size={14} color="inherit" /> : undefined}
                onClick={handleDuplicateNew}
              >
                Duplicate as new item (SKU cleared)
              </Button>
              <Button size="small" variant="text" color="inherit" onClick={() => setConflictItem(null)} disabled={isBusy}>
                Edit form
              </Button>
            </Box>
          </Alert>
        )}

        <Box component="form" noValidate onSubmit={handleSubmit(onSubmit)}>
          <Grid container spacing={2.5}>
            {/* Row 1: Description (full width) */}
            <Grid item xs={12}>
              <TextField
                {...register('description')}
                label="Description"
                fullWidth
                required
                error={Boolean(errors.description)}
                helperText={errors.description?.message}
                placeholder="e.g. Rolex Submariner Date 41mm Black Dial"
              />
            </Grid>

            {/* Row 2: Brand | Model */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="brand"
                control={control}
                render={({ field }) => (
                  <Autocomplete
                    options={[...WATCH_BRANDS]}
                    freeSolo
                    value={field.value}
                    onChange={(_, value) => field.onChange(value ?? '')}
                    onInputChange={(_, value) => field.onChange(value)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Brand"
                        required
                        error={Boolean(errors.brand)}
                        helperText={errors.brand?.message}
                      />
                    )}
                  />
                )}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('model')}
                label="Model"
                fullWidth
                required
                error={Boolean(errors.model)}
                helperText={errors.model?.message}
                placeholder="e.g. Submariner 126610LN"
              />
            </Grid>

            {/* Row 3: SKU | Serial Number */}
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('sku')}
                label="SKU"
                fullWidth
                error={Boolean(errors.sku)}
                helperText={errors.sku?.message}
                placeholder="e.g. RLX-SUB-001"
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('serialNumber')}
                label="Serial Number"
                fullWidth
                error={Boolean(errors.serialNumber)}
                helperText={errors.serialNumber?.message}
                placeholder="e.g. 2A89CD12"
              />
            </Grid>

            {/* Row 4: Quantity | Date Added */}
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('quantity', { valueAsNumber: true })}
                label="Quantity"
                type="number"
                fullWidth
                required
                inputProps={{ min: 1, step: 1 }}
                error={Boolean(errors.quantity)}
                helperText={errors.quantity?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('dateAdded')}
                label="Date Added"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                error={Boolean(errors.dateAdded)}
                helperText={errors.dateAdded?.message}
              />
            </Grid>

            {/* Row 5: Cost Price | Sale Price */}
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('costPrice', { valueAsNumber: true })}
                label="Cost Price (BHD)"
                type="number"
                fullWidth
                required
                inputProps={{ min: 0, step: 0.001 }}
                error={Boolean(errors.costPrice)}
                helperText={errors.costPrice?.message}
              />
            </Grid>
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('salePrice', { valueAsNumber: true })}
                label="Sale Price (BHD)"
                type="number"
                fullWidth
                required
                inputProps={{ min: 0, step: 0.001 }}
                error={Boolean(errors.salePrice)}
                helperText={errors.salePrice?.message}
              />
            </Grid>

            {/* Row 6: Supplier */}
            <Grid item xs={12} sm={6}>
              <TextField
                {...register('supplier')}
                label="Supplier"
                fullWidth
                error={Boolean(errors.supplier)}
                helperText={errors.supplier?.message}
                placeholder="e.g. Gulf Watches Trading"
              />
            </Grid>
            <Grid item xs={12} sm={6} />

            {/* Row 7: Notes (full width) */}
            <Grid item xs={12}>
              <TextField
                {...register('notes')}
                label="Notes"
                fullWidth
                multiline
                rows={2}
                error={Boolean(errors.notes)}
                helperText={errors.notes?.message}
                placeholder="Any additional notes..."
              />
            </Grid>
          </Grid>

          {/* Computed Values Section */}
          <Paper
            variant="outlined"
            sx={{
              mt: 3,
              p: 2,
              bgcolor: 'action.hover',
              borderRadius: 2,
            }}
          >
            <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 0.6, display: 'block', mb: 1.5 }}>
              Computed Values
            </Typography>
            <Box display="flex" gap={1.5} flexWrap="wrap">
              <Chip
                label={`Total Cost: ${formatBhd(totalCost)}`}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`Total Sale: ${formatBhd(totalSale)}`}
                variant="outlined"
                size="small"
                sx={{ fontWeight: 600 }}
              />
              <Chip
                label={`Profit: ${formatBhd(profit)}`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: profit >= 0 ? 'success.light' : 'error.light',
                  color: profit >= 0 ? 'success.dark' : 'error.dark',
                  border: 'none',
                }}
              />
              <Chip
                label={`Margin: ${margin.toFixed(2)}%`}
                size="small"
                sx={{
                  fontWeight: 700,
                  bgcolor: margin >= 0 ? '#e8f5e9' : '#ffebee',
                  color: margin >= 0 ? '#2e7d32' : '#c62828',
                  border: 'none',
                }}
              />
            </Box>
          </Paper>
        </Box>
      </DialogContent>

      <Divider />
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={isBusy}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={isBusy || Boolean(conflictItem)}
          startIcon={createMutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {createMutation.isPending ? 'Saving...' : 'Save Item'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
