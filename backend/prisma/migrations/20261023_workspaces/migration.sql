-- Split the data into two workspaces.
--
-- COMPANY: the real business data, for admin and staff accounts. Starts empty.
-- GUEST:   a public demo opened by "Continue as guest". Everything that exists
--          today (items, imports, import rows and their audit trail) moves here,
--          owned by a dedicated guest account, so the demo keeps today's data.
--
-- The backend scopes every query on these tables to the caller's workspace
-- (see src/prisma/prisma.service.ts), so guests can never read COMPANY rows.

CREATE TYPE "Workspace" AS ENUM ('COMPANY', 'GUEST');

-- Existing rows take the GUEST default while the column is added; the defaults
-- are then dropped so every new row must say which workspace it belongs to.
ALTER TABLE "users"                 ADD COLUMN "workspace" "Workspace" NOT NULL DEFAULT 'COMPANY';
ALTER TABLE "inventory_items"       ADD COLUMN "workspace" "Workspace" NOT NULL DEFAULT 'GUEST';
ALTER TABLE "inventory_imports"     ADD COLUMN "workspace" "Workspace" NOT NULL DEFAULT 'GUEST';
ALTER TABLE "inventory_import_rows" ADD COLUMN "workspace" "Workspace" NOT NULL DEFAULT 'GUEST';
ALTER TABLE "audit_logs"            ADD COLUMN "workspace" "Workspace" NOT NULL DEFAULT 'GUEST';

-- The guest account. Its password is not a valid bcrypt hash, so it can never
-- sign in with a password; the API issues its tokens through /auth/guest only.
INSERT INTO "users" ("id", "email", "password", "firstName", "lastName", "role", "isActive", "workspace", "createdAt", "updatedAt")
VALUES ('00000000-0000-4000-8000-000000000001', 'guest@demo.timezone.local', '!guest-no-password', 'Guest', 'Visitor', 'ADMIN', true, 'GUEST', now(), now())
ON CONFLICT ("id") DO NOTHING;

-- Demo data is now owned by the guest account, so the demo never shows real staff names.
UPDATE "inventory_items"
SET "createdById" = '00000000-0000-4000-8000-000000000001',
    "updatedById" = CASE WHEN "updatedById" IS NULL THEN NULL ELSE '00000000-0000-4000-8000-000000000001' END;
UPDATE "inventory_imports" SET "createdById" = '00000000-0000-4000-8000-000000000001';

-- Sign-ins and account changes belong to the real accounts and stay in COMPANY;
-- everything else in the audit trail is about the demo data.
UPDATE "audit_logs" SET "workspace" = 'COMPANY'
WHERE "action" IN ('LOGIN', 'LOGOUT') OR "entityType" = 'User';
UPDATE "audit_logs" SET "userId" = '00000000-0000-4000-8000-000000000001'
WHERE "workspace" = 'GUEST';

ALTER TABLE "inventory_items"       ALTER COLUMN "workspace" DROP DEFAULT;
ALTER TABLE "inventory_imports"     ALTER COLUMN "workspace" DROP DEFAULT;
ALTER TABLE "inventory_import_rows" ALTER COLUMN "workspace" DROP DEFAULT;
ALTER TABLE "audit_logs"            ALTER COLUMN "workspace" DROP DEFAULT;

-- SKUs only need to be unique within a workspace (still ignoring soft-deleted rows).
DROP INDEX IF EXISTS "inventory_items_sku_key";
CREATE UNIQUE INDEX "inventory_items_sku_key"
  ON "inventory_items"("workspace", "sku")
  WHERE "isDeleted" = false AND "sku" IS NOT NULL;

CREATE INDEX "users_workspace_idx"                     ON "users"("workspace");
CREATE INDEX "inventory_items_workspace_idx"           ON "inventory_items"("workspace");
CREATE INDEX "inventory_items_workspace_isDeleted_idx" ON "inventory_items"("workspace", "isDeleted");
CREATE INDEX "inventory_imports_workspace_idx"         ON "inventory_imports"("workspace");
CREATE INDEX "inventory_import_rows_workspace_idx"     ON "inventory_import_rows"("workspace");
CREATE INDEX "audit_logs_workspace_idx"                ON "audit_logs"("workspace");
