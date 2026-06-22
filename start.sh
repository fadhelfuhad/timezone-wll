#!/usr/bin/env bash
set -e

PROJ="/home/muhammedfadhel/projects/sandbox/timezone-wll"

echo "=== Timezone W.L.L — Starting Dev Stack ==="

# ── 1. Migrate & seed ─────────────────────────────────────────────────────────
cd "$PROJ/backend"
echo ""
echo "→ Running database migrations..."
npx prisma migrate deploy 2>/dev/null || npx prisma migrate dev --name init --skip-seed
echo "→ Seeding database (600+ watch records)..."
npx tsx prisma/seed.ts

# ── 2. Backend ─────────────────────────────────────────────────────────────────
echo ""
echo "→ Starting backend on http://localhost:3001 ..."
pnpm start:dev &
BACKEND_PID=$!

# ── 3. Frontend ────────────────────────────────────────────────────────────────
cd "$PROJ/frontend"
echo "→ Starting frontend on http://localhost:5173 ..."
pnpm dev &
FRONTEND_PID=$!

echo ""
echo "╔══════════════════════════════════════╗"
echo "║   App:  http://localhost:5173         ║"
echo "║   API:  http://localhost:3001         ║"
echo "║   Docs: http://localhost:3001/docs    ║"
echo "╠══════════════════════════════════════╣"
echo "║   Admin:  admin@timezone.bh / Admin@123 ║"
echo "║   Staff:  staff@timezone.bh / Staff@123 ║"
echo "╚══════════════════════════════════════╝"
echo ""
echo "Press Ctrl+C to stop all services"

wait $BACKEND_PID $FRONTEND_PID
