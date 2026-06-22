-- CreateEnum
CREATE TYPE "ImportMode" AS ENUM ('APPEND', 'REPLACE');

-- CreateEnum
CREATE TYPE "ConflictResolution" AS ENUM ('KEEP_EXISTING', 'USE_IMPORTED', 'MERGE', 'CREATE_NEW', 'SKIP');

-- AlterTable
ALTER TABLE "inventory_import_rows" ADD COLUMN     "conflictData" JSONB,
ADD COLUMN     "resolution" "ConflictResolution",
ADD COLUMN     "resolvedData" JSONB;

-- AlterTable
ALTER TABLE "inventory_imports" ADD COLUMN     "backupSnapshot" JSONB,
ADD COLUMN     "conflictsDetected" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "conflictsResolved" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "importMode" "ImportMode" NOT NULL DEFAULT 'APPEND',
ADD COLUMN     "importReport" JSONB,
ADD COLUMN     "skippedRows" INTEGER NOT NULL DEFAULT 0;
