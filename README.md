# Timezone W.L.L — Inventory Management System

A full-stack inventory management system built for a premium watch retail company in Bahrain. Manages stock, tracks profit margins, processes scanned inventory sheets via OCR, and provides financial analytics — all with role-based access control and a full audit trail.

---

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Quick Start](#quick-start)
- [Environment Variables](#environment-variables)
- [Default Credentials](#default-credentials)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [RBAC](#rbac)
- [Development Scripts](#development-scripts)
- [Docker Deployment](#docker-deployment)
- [Production Checklist](#production-checklist)

---

## Features

### Dashboard
- Summary cards: total items, total cost, total sale, total profit, average margin, added today, added this month
- Full inventory data grid with search, column sorting, pagination, and brand filter tabs
- Brand tabs show only brands that have active inventory
- Export to CSV, Excel, or PDF

### Inventory Management
- Create, edit, and soft-delete inventory items
- Fields: description, brand, model, SKU, serial number, quantity, cost price, sale price, supplier, notes, date added
- Auto-computed fields: total cost, total sale, profit amount, margin %
- Bulk import via the Import or Camera pages

### Import Inventory Sheets
- Upload PDF, image (JPG/PNG), Excel, or CSV files
- OCR extracts inventory rows with per-field confidence scores
- Preview extracted rows before committing — inline edit any field
- Row-level approve/skip controls
- Save approved rows directly into inventory

### Camera Scanning
- Live camera feed with capture button
- Captured image is OCR-processed using the same pipeline as file upload
- Same preview/approval flow
- Works on mobile and desktop

### Analytics
- Summary cards: filtered total profit, cost, sale, margin, item count
- **Adaptive chart granularity**: week/short-custom ranges show daily bars; month/quarter/year show monthly bars
- Charts: profit vs cost vs sale over time (line), cost vs sale comparison (grouped bar), revenue by brand (pie), cumulative profit growth (area), profit by brand (horizontal bar)
- All charts filterable by preset (Week, Month, Quarter, Year, All) or custom date range
- Date filters apply correctly across all day boundaries (inclusive end-of-day)

### User Management _(Admin only)_
- Create, edit, and deactivate users
- Assign roles: Admin or Staff

### Audit Trail _(Admin only)_
- Every create, update, delete, and import action is logged
- Records user, IP address, user agent, entity type, and change description

### Theme
- Light and dark mode with toggle in the app bar
- Preference persisted in `localStorage` — survives page refresh
- Defaults to dark mode on first visit

### Guest demo and workspaces
- **Continue as guest** on the login page opens a demo anyone can use: add, edit, delete, import CSV/Excel/PDF sheets, camera scan, export and analytics, all on sample data
- Every row in the database belongs to a workspace:
  - `COMPANY`: the real business data. Admin and staff accounts see only this.
  - `GUEST`: the demo, owned by a built-in guest account.
- The backend enforces the split in one place. A Prisma middleware adds the caller's workspace to every query on items, imports, import rows and audit logs, and refuses any query that has no workspace. The raw SQL in analytics and REPLACE imports filters by workspace explicitly.
- Guests can't manage users or change passwords, and the guest account can't sign in with a password
- `pnpm prisma:seed` (or `npx tsx prisma/seed.ts`) resets the guest demo to its 600 sample items without touching company data or existing accounts

---

## Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | NestJS 10, TypeScript |
| **Database** | PostgreSQL 16 |
| **ORM** | Prisma 5 |
| **Authentication** | JWT (access 7d + refresh 30d), RBAC |
| **Frontend** | React 18, Vite 5, TypeScript |
| **UI** | Material UI v5, MUI DataGrid |
| **Server State** | TanStack Query v5 |
| **Forms** | React Hook Form + Zod |
| **Charts** | Recharts 2 |
| **OCR** | Tesseract.js (local) / Google Vision (cloud) |
| **Rate Limiting** | NestJS Throttler |

---

## Project Structure

```
timezone-wll/
├── backend/
│   ├── src/
│   │   ├── auth/           # JWT auth, guards, refresh token
│   │   ├── users/          # User CRUD + role management
│   │   ├── inventory/      # Inventory CRUD, summary, export, bulk import
│   │   ├── analytics/      # Aggregated profit/cost/sale reports
│   │   ├── imports/        # File upload, OCR processing, row approval
│   │   ├── ocr/            # Provider abstraction (Tesseract / Google Vision)
│   │   ├── audit/          # Audit log recording + retrieval
│   │   ├── prisma/         # PrismaService
│   │   └── common/         # Guards, filters, interceptors, decorators
│   └── prisma/
│       ├── schema.prisma   # Database schema
│       ├── migrations/     # Migration history
│       └── seed.ts         # 600+ inventory records across 8 brands, 3 years
├── frontend/
│   └── src/
│       ├── api/            # Typed API functions (axios client + per-feature modules)
│       ├── contexts/       # AuthContext, ColorModeContext (theme)
│       ├── pages/          # Dashboard, Inventory, Analytics, Import, Camera, Users
│       ├── components/     # Charts, dialogs, filters, data grids
│       ├── router.tsx      # React Router v6 with protected routes
│       ├── theme.ts        # MUI theme — light + dark, luxury watch aesthetic
│       └── types/          # Shared TypeScript interfaces
├── docker-compose.yml      # PostgreSQL + backend + frontend
└── start.sh                # One-command local dev start
```

---

## Quick Start

### Prerequisites

- **Node.js** 20+
- **pnpm** — `npm install -g pnpm`
- **Docker** (for PostgreSQL) — or a local PostgreSQL 16 instance

### 1. Clone the repository

```bash
git clone <repo-url>
cd timezone-wll
```

### 2. Start PostgreSQL

```bash
docker compose up postgres -d
```

Or with a local PostgreSQL instance:
```bash
createdb timezone_wll
```

### 3. Backend setup

```bash
cd backend

# Install dependencies
pnpm install

# Copy environment file (defaults work for local Docker setup)
cp .env.example .env

# Run database migrations
npx prisma migrate deploy

# Seed the database (creates users + 600 inventory records)
npx tsx prisma/seed.ts

# Start development server (hot reload)
pnpm start:dev
```

Backend runs at **http://localhost:3001**  
Swagger API docs at **http://localhost:3001/docs**

### 4. Frontend setup

```bash
cd ../frontend

# Install dependencies
pnpm install

# Copy environment file
cp .env.example .env

# Start development server
pnpm dev
```

Frontend runs at **http://localhost:5173**

### One-command start (after DB is up)

```bash
bash start.sh
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Description | Default |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://postgres:password@localhost:5432/timezone_wll` |
| `JWT_SECRET` | Access token signing secret | change in production |
| `JWT_EXPIRES_IN` | Access token lifetime | `7d` |
| `JWT_REFRESH_SECRET` | Refresh token signing secret | change in production |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token lifetime | `30d` |
| `PORT` | API server port | `3001` |
| `CORS_ORIGINS` | Allowed frontend origin(s) | `http://localhost:5173` |
| `UPLOAD_DIR` | Directory for uploaded files | `./uploads` |
| `MAX_FILE_SIZE` | Max upload size in bytes | `10485760` (10 MB) |
| `OCR_PROVIDER` | OCR backend: `tesseract` or `google-vision` | `tesseract` |
| `GOOGLE_VISION_API_KEY` | Required only when `OCR_PROVIDER=google-vision` | — |

### Frontend (`frontend/.env`)

| Variable | Description | Default |
|---|---|---|
| `VITE_API_URL` | Backend base URL — leave empty to use Vite proxy | _(empty)_ |
| `VITE_APP_NAME` | Application display name | `Timezone W.L.L Inventory` |

> **Note:** Leaving `VITE_API_URL` empty causes all `/api` requests to go through the Vite dev proxy to `localhost:3001`. Set it to the full backend URL only when deploying frontend and backend on separate origins.

---

## Default Credentials

Local development defaults (production uses `SEED_ADMIN_PASSWORD` / `SEED_STAFF_PASSWORD`). Both accounts use the `COMPANY` workspace; the guest demo needs no credentials.

| Role | Email | Password |
|---|---|---|
| Admin | `admin@timezone.bh` | `Admin@123456` |
| Staff | `staff@timezone.bh` | `Staff@123456` |

---

## API Reference

All routes except `/auth/login` and `/auth/guest` require a `Bearer` token in the `Authorization` header.

### Authentication

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Login — returns access + refresh tokens |
| `POST` | `/api/auth/guest` | Open the guest demo — tokens for the guest workspace |
| `POST` | `/api/auth/logout` | Logout — invalidates refresh token |
| `POST` | `/api/auth/refresh` | Exchange refresh token for new access token |
| `GET` | `/api/auth/profile` | Get current authenticated user |

### Inventory

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/inventory` | List with filters: `search`, `brand`, `dateFrom`, `dateTo`, `page`, `limit`, `sortBy`, `sortOrder` |
| `GET` | `/api/inventory/summary` | Summary card data (totals + counts) |
| `GET` | `/api/inventory/:id` | Get single item |
| `POST` | `/api/inventory` | Create item |
| `PATCH` | `/api/inventory/:id` | Update item |
| `DELETE` | `/api/inventory/:id` | Soft delete _(Admin only)_ |
| `POST` | `/api/inventory/bulk-import` | Import array of items |
| `GET` | `/api/inventory/export/csv` | Export filtered CSV |
| `GET` | `/api/inventory/export/excel` | Export filtered Excel |

### Analytics

All endpoints accept optional `?dateFrom=YYYY-MM-DD&dateTo=YYYY-MM-DD` query params.

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/analytics/profit-summary` | Aggregated totals: profit, cost, sale, margin, item count |
| `GET` | `/api/analytics/profit-by-day` | Daily profit/cost/sale — used for week-range charts |
| `GET` | `/api/analytics/profit-by-month` | Monthly profit/cost/sale |
| `GET` | `/api/analytics/profit-by-year` | Yearly profit/cost/sale |
| `GET` | `/api/analytics/profit-by-brand` | Top 10 brands by profit |
| `GET` | `/api/analytics/profit-by-product` | Top 20 brand+model combinations by profit |
| `GET` | `/api/analytics/cost-vs-sale` | Monthly cost vs sale comparison |
| `GET` | `/api/analytics/inventory-by-brand` | Sale value share per brand (pie chart) |
| `GET` | `/api/analytics/profit-growth` | Cumulative profit running total by month |
| `GET` | `/api/analytics/top-performers` | Top brand, top model, highest margin brand |

### Imports

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/imports/upload` | Upload file (multipart/form-data) — triggers OCR |
| `GET` | `/api/imports` | List all imports for current user |
| `GET` | `/api/imports/:id` | Get import with all extracted rows |
| `PATCH` | `/api/imports/:id/rows/:rowId` | Edit an extracted row before approval |
| `POST` | `/api/imports/:id/approve` | Save approved rows to inventory |
| `POST` | `/api/imports/:id/cancel` | Cancel and discard import |

### Users _(Admin only)_

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/users` | List all users |
| `POST` | `/api/users` | Create user |
| `PATCH` | `/api/users/:id` | Update user (name, role, active status) |

### Audit Logs _(Admin only)_

| Method | Path | Description |
|---|---|---|
| `GET` | `/api/audit` | List audit logs with filters |

---

## Database Schema

```
users
  id, email, password (hashed), name, role (ADMIN/STAFF), isActive, createdAt, updatedAt

inventory_items
  id, description, brand, model, sku, serialNumber, quantity
  costPrice, salePrice, totalCost, totalSale, profit, margin
  supplier, notes, dateAdded, isDeleted, createdById, createdAt, updatedAt

inventory_imports
  id, filename, originalName, status, importMode, totalRows, processedRows
  createdById, createdAt, updatedAt

inventory_import_rows
  id, importId, rowIndex, status, rawData, parsedData, confidence
  errorMessage, createdAt, updatedAt

audit_logs
  id, action, entityType, entityId, description, ipAddress, userAgent
  userId, createdAt
```

---

## RBAC

| Action | Admin | Staff |
|---|---|---|
| View inventory | ✅ | ✅ |
| Create inventory | ✅ | ✅ |
| Edit inventory | ✅ | ✅ |
| Delete inventory | ✅ | ❌ |
| Import sheets | ✅ | ✅ |
| Camera scan | ✅ | ✅ |
| View analytics | ✅ | ✅ |
| Manage users | ✅ | ❌ |
| View audit logs | ✅ | ❌ |

---

## Development Scripts

### Backend

```bash
pnpm start:dev       # Hot-reload dev server
pnpm build           # Production build
pnpm test            # Unit tests
pnpm prisma:migrate  # Create + apply a new migration
pnpm prisma:seed     # Re-seed the database
pnpm prisma:studio   # Open Prisma Studio (GUI)
```

### Frontend

```bash
pnpm dev             # Vite dev server with HMR
pnpm build           # Production build (tsc + vite build)
pnpm type-check      # TypeScript check only (no emit)
pnpm lint            # ESLint
pnpm preview         # Preview production build locally
```

---

## OCR Providers

The OCR module uses a provider interface (`IOcrProvider`). Switch providers by changing `OCR_PROVIDER` in `.env` — no code changes needed.

```bash
# Local OCR — no API key, slower, works offline
OCR_PROVIDER=tesseract

# Google Vision — faster, more accurate, requires billing
OCR_PROVIDER=google-vision
GOOGLE_VISION_API_KEY=your-key-here
```

To add a custom provider: implement `IOcrProvider` in `backend/src/ocr/providers/` and register it in `OcrModule`.

---

## Seed Data

`prisma/seed.ts` generates:

- **2 users**: admin + staff with hashed passwords
- **600 inventory records** spread across 3 years of history
- **8 watch brands**: Rolex, Omega, Tag Heuer, Tissot, Casio, Seiko, Citizen, Longines
- Realistic BHD pricing with correct profit margin calculations
- Randomised suppliers, serial numbers, quantities, and notes
- Audit log entries for seed actions

---

## Docker Deployment

```bash
# Start all services (PostgreSQL + backend + frontend)
docker compose up -d

# Run migrations inside the container
docker compose exec backend npx prisma migrate deploy

# Seed the database
docker compose exec backend npx tsx prisma/seed.ts
```

Services:
- **PostgreSQL**: `localhost:5432`
- **Backend API**: `localhost:3001`
- **Frontend**: `localhost:80`

---

## Production Checklist

- [ ] Replace all secret values in `.env` (`JWT_SECRET`, `JWT_REFRESH_SECRET`, `POSTGRES_PASSWORD`)
- [ ] Set `NODE_ENV=production`
- [ ] Set `CORS_ORIGINS` to the actual frontend domain
- [ ] Use a strong PostgreSQL password and restrict network access
- [ ] Put the app behind an SSL-terminating reverse proxy (nginx or load balancer)
- [ ] Set `UPLOAD_DIR` to a persistent volume (not inside the container)
- [ ] Configure automated PostgreSQL backups
- [ ] Set up log aggregation (Winston outputs JSON in production)
- [ ] Review rate limiting defaults (10 requests / 60 seconds per IP)

---

*Timezone W.L.L — Premium Watch Retail, Bahrain*
