import { zodResolver } from '@hookform/resolvers/zod';
import Autocomplete from '@mui/material/Autocomplete';
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
import { useEffect } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
import { updateInventoryItem } from '../../api/inventory.api';
import type { InventoryItem } from '../../types';
import { inventorySchema, type InventoryFormValues, WATCH_BRANDS } from './InventoryFormSchema';

interface Props {
  open: boolean;
  item: InventoryItem | null;
  onClose: () => void;
  onSuccess: () => void;
}

function formatBhd(value: number): string {
  if (Number.isNaN(value) || !Number.isFinite(value)) return 'BHD 0.000';
  return `BHD ${value.toLocaleString('en-BH', { minimumFractionDigits: 3, maximumFractionDigits: 3 })}`;
}

function toDateInputValue(iso?: string): string {
  if (!iso) return '';
  return iso.split('T')[0];
}

export default function EditInventoryDialog({ open, item, onClose, onSuccess }: Props) {
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
      dateAdded: '',
      supplier: '',
      notes: '',
    },
  });

  // Pre-fill form whenever item changes
  useEffect(() => {
    if (item) {
      reset({
        description: item.description,
        brand: item.brand,
        model: item.model,
        sku: item.sku ?? '',
        serialNumber: item.serialNumber ?? '',
        quantity: item.quantity,
        costPrice: item.costPrice,
        salePrice: item.salePrice,
        dateAdded: toDateInputValue(item.dateAdded),
        supplier: item.supplier ?? '',
        notes: item.notes ?? '',
      });
    }
  }, [item, reset]);

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

  const mutation = useMutation({
    mutationFn: (data: InventoryFormValues) => {
      if (!item) throw new Error('No item to update');
      return updateInventoryItem(item.id, {
        description: data.description,
        brand: data.brand,
        model: data.model,
        sku: data.sku || undefined,
        serialNumber: data.serialNumber || undefined,
        quantity: data.quantity,
        costPrice: data.costPrice,
        salePrice: data.salePrice,
        dateAdded: data.dateAdded || undefined,
        supplier: data.supplier || undefined,
        notes: data.notes || undefined,
      });
    },
    onSuccess: () => {
      enqueueSnackbar('Inventory item updated successfully', { variant: 'success' });
      queryClient.invalidateQueries({ queryKey: ['inventory'] });
      queryClient.invalidateQueries({ queryKey: ['summary'] });
      onSuccess();
    },
    onError: () => {
      enqueueSnackbar('Failed to update inventory item', { variant: 'error' });
    },
  });

  function handleClose() {
    if (mutation.isPending) return;
    onClose();
  }

  function onSubmit(data: InventoryFormValues) {
    mutation.mutate(data);
  }

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>Edit Inventory Item</DialogTitle>
      <Divider />

      <DialogContent sx={{ pt: 2.5 }}>
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
        <Button onClick={handleClose} variant="outlined" color="inherit" disabled={mutation.isPending}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit(onSubmit)}
          variant="contained"
          disabled={mutation.isPending}
          startIcon={mutation.isPending ? <CircularProgress size={16} color="inherit" /> : undefined}
        >
          {mutation.isPending ? 'Saving...' : 'Save Changes'}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
