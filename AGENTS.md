# Curimana Eléctrica - Agent Guide

Sistema de facturación eléctrica municipal para el distrito de Curimana. Next.js 16 + Supabase + PWA con sincronización offline.

## Critical Framework Notes

- **Next.js 16**: `middleware.ts` fue renombrado a `proxy.ts`. La función exportada se llama `proxy()`, NO `middleware()`. Consultar `node_modules/next/dist/docs/` antes de escribir código.
- **React 19**: Usa el nuevo JSX transform (configurado en tsconfig).
- **Tailwind v4**: Usa sintaxis `@import "tailwindcss"` en globals.css con `@theme inline`, NO el archivo de configuración tradicional `tailwind.config.ts`.

## Architecture

### Role-Based Routing
- `/admin/*` — Admin: dashboard, tarifas, conceptos, clientes, periodos, recibos, auditoría, reportes
- `/cashier/*` — Cajero: búsqueda de clientes, cobros, cierre de caja, historial
- `/reader/*` — Lector: lecturas de medidores, búsqueda, sincronización offline
- `/login` — Autenticación

### Data Flow
1. **Online**: Next.js App Router → Service Layer → Repository → Supabase (PostgreSQL + RLS)
2. **Offline (readers)**: Dexie.js (IndexedDB) → Background sync via `use-offline-sync.ts`

### Key Directories
```
src/
  app/                    # Next.js App Router (pages by role)
    admin/                # Dashboard, customers, tariffs, concepts, periods, receipts, audit
    cashier/              # Payment processing, closure, history
    reader/               # New reading, search, pending, sync, list
    login/                # Auth entry point
  services/               # Business logic (12 services)
    dashboard-service.ts  # KPIs, charts, aggregated queries
    payment-service.ts    # Payment processing + debt management
    receipt-service.ts    # Receipt generation + calculations
    reading-service.ts    # Meter reading + sync
    tariff-service.ts     # Tariff CRUD + tier validation
    customer-service.ts   # Customer management
    period-service.ts     # Billing period management
    concept-service.ts    # Billing concepts CRUD
    cash-closure-service.ts # Daily cash closure
    audit-service.ts      # Audit log management
    pdf-service.ts        # PDF receipt generation (jsPDF)
    storage-service.ts    # File storage (photos)
  repositories/           # Supabase data access layer (10 repos)
    base.ts               # Generic CRUD operations
  hooks/
    use-auth.tsx          # Auth context + useAuth() hook
    use-offline-sync.ts   # Background sync for readings
  components/
    ui/                   # shadcn/ui components (13 components)
    layouts/              # AdminLayout, CashierLayout, ReaderLayout
  lib/
    supabase/
      client.ts           # Browser client (createBrowserClient<Database>)
      server.ts           # Server client (createServerClient with cookies)
      middleware.ts        # updateSession() for proxy.ts
    db/dexie.ts           # Offline IndexedDB schema
    billing-utils.ts      # Tariff calculation helpers
    utils.ts              # cn(), formatCurrency(), formatDate()
  types/
    database.ts           # Supabase-generated types
  proxy.ts                # Next.js 16 proxy (auth + route protection)
```

## Developer Commands

```bash
# Dev server
npm run dev

# Build for production
npm run build

# Unit tests (Vitest + jsdom)
npm run test

# E2E tests (Playwright, auto-starts dev server)
npx playwright test

# Lint (ESLint 9 flat config)
npm run lint

# TypeScript check
npx tsc --noEmit
```

### Test Specifics
- **Unit**: Vitest with `@` alias mapped to `./src`. Excludes `tests/e2e/**`.
- **E2E**: Tests in `tests/e2e/`. Runs against `http://localhost:3000`.
  - Projects: chromium, mobile-chrome (Pixel 5), mobile-safari (iPhone 12)
  - CI: 2 retries, 1 worker. Local: 0 retries, auto workers.

## Environment Setup

Required in `.env.local` (see `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=https://yxhzkbzmnvhesdefwgjc.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your_anon_key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database (Supabase)

- **Project ID**: `yxhzkbzmnvhesdefwgjc`
- **Schema**: `supabase/schema.sql` — 13 tablas, 3 funciones, 1 trigger, RLS completo
- **Seed**: `supabase/seed.sql` — roles, config municipal, tarifa BTSB, 3 tramos, 4 conceptos, 5 clientes, 1 periodo
- **Security**: Row Level Security (RLS) en todas las tablas
- **Functions**:
  - `get_user_role()` — SECURITY DEFINER, obtiene rol del usuario autenticado
  - `current_role()` — Alias para compatibilidad
  - `calculate_energy_amount(consumption, tariff_id)` — Cálculo por tramos progresivos
- **Trigger**: `on_auth_user_created` — Auto-crea perfil en `profiles` cuando se registra un usuario

### Tables
| Table | Purpose |
|-------|---------|
| `roles` | admin, cashier, meter_reader |
| `profiles` | User profiles linked to auth.users |
| `municipality_config` | Municipal data (RUC, name, address) |
| `tariffs` | Tariff definitions |
| `tariff_tiers` | Progressive consumption tiers |
| `billing_concepts` | Fixed charges (cargo fijo, alumbrado, etc.) |
| `customers` | Customer/supply records |
| `billing_periods` | Monthly billing periods |
| `readings` | Meter readings (with computed consumption) |
| `receipts` | Generated bills |
| `payments` | Payment records |
| `cash_closures` | Daily cash closure records |
| `audit_logs` | Action audit trail |

## Styling Conventions

- **shadcn/ui**: `base-nova` style. Import from `@/components/ui/*`
- **Icons**: Lucide React (`lucide-react`)
- **Colors**: Municipal brand colors in CSS vars:
  - `--muni-blue: #0066cc`
  - `--muni-silver: #c0c0c0`
- **CSS**: Tailwind v4 con `@theme inline` en `globals.css`

## Offline/PWA Notes

- **PWA**: Configured via `@serwist/next`. Service worker auto-generated.
- **Offline DB**: Dexie.js in `src/lib/db/dexie.ts`
  - `pending_readings`: id, customer_id, supply_number, full_name, previous_reading, current_reading, reading_date, photo_base64, notes, status, created_at, needs_review, retry_count, last_attempt_time
  - `customers_cache`: id, supply_number, full_name, address, sector, tariff_id, previous_reading
- **Sync Hook**: `use-offline-sync.ts` handles background sync every 30s with exponential backoff
- **Critical**: Reader workflows must work without network; always check online status before Supabase calls

## Code Patterns

### Supabase Client (per context)
- **Browser**: `src/lib/supabase/client.ts` — `createBrowserClient<Database>`
- **Server**: `src/lib/supabase/server.ts` — `createServerClient` with cookie handling
- **Proxy**: `src/lib/supabase/middleware.ts` — `updateSession()` for token refresh

### Auth Flow
1. User submits credentials on `/login`
2. `proxy.ts` intercepts all requests, refreshes session via `updateSession()`
3. Protected routes check role via profile query
4. `useAuth()` hook provides `user`, `role`, `isLoading`, `signOut()`

### Adding shadcn Components
```bash
npx shadcn add button
# Uses components.json aliases: @/components, @/lib/utils, etc.
```

## Deployment

- **Platform**: Vercel (auto-deploy from GitHub `master` branch)
- **Repository**: `jperezpereznos-tech/curimana-electrica`
- **Env vars**: Set in Vercel project settings (same as `.env.local`)

## Constraints

- **No** pages router — pure App Router
- **No** `middleware.ts` — Next.js 16 uses `proxy.ts` instead
- **TypeScript strict mode** enabled
- **ESM only** — implicit via Next.js

## Recent Improvements

- Fixed hardcoded period ID in use-offline-sync.ts (now dynamically determined)
- Improved error handling for photo uploads during sync
- Added backoff strategy for failed sync attempts with retry_count and last_attempt_time fields
- Improved data model consistency in IndexedDB with needs_review, retry_count, and last_attempt_time fields
- Complete PWA implementation with proper service worker configuration
- Reading service now properly handles decreasing meter readings (meter resets) with zero consumption and review flags
- Photo upload functionality replaced mock implementation with real Supabase storage calls
- Customer search in new reading page now properly searches IndexedDB cache
- Unit tests added for critical functionality