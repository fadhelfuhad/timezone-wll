-- Enable Row Level Security on every table.
--
-- Supabase exposes the `public` schema through its auto-generated REST API
-- (PostgREST), reachable with the project's anon key, which is not a secret.
-- With RLS off, anyone holding that key can read and write these tables
-- directly, bypassing the NestJS API entirely.
--
-- No policies are added on purpose: with RLS on and no policies, the anon and
-- authenticated roles get zero rows. The backend connects as the table owner
-- (`postgres`), which is not subject to RLS, so Prisma queries are unaffected.
ALTER TABLE "users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_items" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_imports" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "inventory_import_rows" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;
