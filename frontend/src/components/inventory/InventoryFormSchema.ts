import { z } from 'zod';

export const inventorySchema = z
  .object({
    description: z.string().min(1, 'Description is required').max(500),
    brand: z.string().min(1, 'Brand is required').max(100),
    model: z.string().min(1, 'Model is required').max(100),
    sku: z.string().optional(),
    serialNumber: z.string().optional(),
    quantity: z.number().int().min(1, 'Quantity must be at least 1').default(1),
    costPrice: z.number().min(0, 'Cost price must be 0 or greater'),
    salePrice: z.number().min(0, 'Sale price must be 0 or greater'),
    dateAdded: z.string().optional(),
    supplier: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.salePrice >= data.costPrice, {
    message: 'Sale price must be >= cost price',
    path: ['salePrice'],
  });

export type InventoryFormValues = z.infer<typeof inventorySchema>;

export const WATCH_BRANDS = [
  'Rolex',
  'Omega',
  'Tag Heuer',
  'Tissot',
  'Casio',
  'Seiko',
  'Citizen',
  'Longines',
  'Other',
] as const;
