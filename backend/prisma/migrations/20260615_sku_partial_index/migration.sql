-- Drop the global unique constraint on sku
DROP INDEX IF EXISTS "inventory_items_sku_key";

-- Partial unique index: only active (non-deleted), non-null SKUs must be unique.
-- Soft-deleted rows are excluded so REPLACE mode can insert new items with the
-- same SKUs without P2002 violations.
CREATE UNIQUE INDEX "inventory_items_sku_key"
  ON "inventory_items"("sku")
  WHERE "isDeleted" = false AND "sku" IS NOT NULL;
