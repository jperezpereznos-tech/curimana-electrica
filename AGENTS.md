# Curimana Eléctrica — Agent Guide

Municipal electric billing system for Curimana district. Next.js 16 + Supabase + PWA with offline sync.

## Role-Specific Agent Instructions

For focused work, load the relevant agent file from `.cursor/rules/`:

| File | When to use |
|------|-------------|
| `.cursor/rules/frontend.md` | Pages, components, UI, styling, forms |
| `.cursor/rules/backend.md` | Services, repositories, business logic, DB schema |
| `.cursor/rules/offline.md` | Dexie.js, offline sync, PWA, reader workflows |
| `.cursor/rules/auth.md` | Authentication, proxy.ts, RLS policies, Supabase auth |

## Critical Framework Quirks

- **Next.js 16**: The middleware file is `src/proxy.ts` (NOT `middleware.ts`). The exported function is `proxy()` (NOT `middleware()`). Consult `node_modules/next/dist/docs/` before writing proxy/middleware code.
- **Tailwind v4**: Uses `@import "tailwindcss"` + `@theme inline` in `globals.css`. NO `tailwind.config.ts` — do not create one.
- **PWA currently disabled**: `@serwist/next` is disabled in `next.config.mjs` due to Turbopack conflicts. Offline/Dexie logic still works, but service worker is not generated. See the TODO in `next.config.mjs`.
- **React 19**: New JSX transform (`react-jsx` in tsconfig). No `import React from 'react'` needed.

## Commands

```bash
npm run dev # Dev server (Turbopack)
npm run build # Production build
npm run lint # ESLint 9 flat config (core-web-vitals + typescript)
npx tsc --noEmit # TypeScript strict check
npm run test # Vitest unit tests (jsdom, @ alias, globals: true)
npx playwright test # E2E (auto-starts `npm run start`, not dev)
```

### Verification order

`lint` → `tsc --noEmit` → `test` → `build`

### Test specifics

- **Vitest**: `globals: true` (no need to import `describe`/`it`/`expect`). Env vars auto-set in `vitest.config.ts`. Excludes `tests/e2e/**`.
- **Playwright**: `tests/e2e/`. Uses `npm run start` (production build), NOT `npm run dev`. 3 projects: chromium, mobile-chrome (Pixel 5), mobile-safari (iPhone 12). CI: 2 retries, 1 worker; local: 0 retries, auto workers.

## Architecture

### Data flow

- **Online**: App Router page/component → `src/services/` (13 services) → `src/repositories/` (12 repos extending `base.ts`) → Supabase PostgreSQL + RLS
- **Offline (reader role)**: Dexie.js (`src/lib/db/dexie.ts`) ↔ `use-offline-sync.ts` (background sync every 30s, exponential backoff on failure)

### Services (13)

`audit-service`, `cash-closure-service`, `concept-service`, `customer-service`, `dashboard-service`, `municipality-config-service`, `payment-service`, `pdf-service`, `period-service`, `profile-service`, `reading-service`, `receipt-service`, `sector-service`, `storage-service`, `tariff-service`

### Repositories (12)

`audit-repository`, `base`, `cash-closure-repository`, `concept-repository`, `customer-repository`, `municipality-config-repository`, `payment-repository`, `period-repository`, `profile-repository`, `reading-repository`, `receipt-repository`, `sector-repository`, `tariff-repository`

### Role-based routing

| Role | Routes | Access |
|------|--------|--------|
| admin | `/admin/*` | Full access |
| cashier | `/cashier/*` | Admin + cashier routes |
| meter_reader | `/reader/*` | Admin + reader routes |

Route protection is in `src/proxy.ts` — it calls `get_user_role()` RPC, then redirects unauthorized access to `/`.

### Supabase client (use the right one!)

- **Browser components**: `import { createClient } from '@/lib/supabase/client'` — singleton browser client
- **Server Components / Route Handlers**: `import { createClient } from '@/lib/supabase/server'` — creates per-request client with cookie handling (async)
- **Proxy**: `import { updateSession } from '@/lib/supabase/middleware'` — session refresh for proxy.ts

## Key Conventions

- **Path alias**: `@/` → `./src/`
- **shadcn/ui**: `base-nova` style. Add components via `npx shadcn add <name>`. Import from `@/components/ui/*`.
- **Icons**: Lucide React only (`lucide-react`)
- **Municipal brand colors**: `--muni-blue: #0066cc`, `--muni-silver: #c0c0c0` (use Tailwind classes `text-muni-blue`, `bg-muni-silver`)
- **No comments** in code unless explicitly requested
- **App Router only** — no Pages Router
- **ESM only** — implicit via Next.js

## Offline/IndexedDB Schema

`src/lib/db/dexie.ts` — `CurimanaDB` with two tables:

- `pending_readings`: `++id, customer_id, supply_number, status, sector_id, reading_date` — statuses: `pending | syncing | failed`. Fields `needs_review`, `retry_count`, `last_attempt_time` track sync failures. Local duplicate detection blocks same `customer_id` + `reading_date === today`.
- `customers_cache`: `id, supply_number, sector, sector_id, full_name` — `sector` field stores sector name string for offline display (NOT the dropped DB column).

**Critical**: Reader workflows must work without network. Always check online status before Supabase calls. Meter resets (decreasing readings) are handled with zero consumption + `needs_review: true`. Auto-sync runs every 30s with exponential backoff (2x multiplier, 5min cap). `syncAndSignOut()` protects pending readings on logout.

## Environment

Required in `.env.local` (see `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=<project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Vitest auto-sets dummy values — no `.env.local` needed for unit tests.

## Database

### Tables (15)

`audit_logs`, `billing_concepts`, `billing_periods`, `cash_closures`, `customers`, `municipality_config`, `payments`, `profiles`, `readings`, `receipts`, `roles`, `sectors`, `tariff_tier_history`, `tariff_tiers`, `tariffs`

### SQL Functions (17)

| Function | Type | Purpose |
|----------|------|---------|
| `get_user_role()` | STABLE SECURITY DEFINER | Returns role for auth user (used by proxy.ts) |
| `get_dashboard_kpis()` | STABLE SECURITY DEFINER | Single-call dashboard data (replaces 5 round-trips) |
| `calculate_energy_amount(consumption, tariff_id)` | STABLE SECURITY DEFINER | Progressive tier energy calculation |
| `generate_period_receipts(period_id, receipts)` | SECURITY DEFINER | Atomic receipt batch insert |
| `close_billing_period(period_id)` | SECURITY DEFINER | Marks period as closed |
| `process_payment(receipt_id, ...)` | SECURITY DEFINER | Atomic payment processing |
| `void_payment(payment_id)` | SECURITY DEFINER | Void a payment |
| `adjust_customer_debt(customer_id, amount)` | SECURITY DEFINER | Adjusts customer.current_debt |
| `recalculate_customer_debt(customer_id)` | SECURITY DEFINER | Recalculates debt from open receipts |
| `get_user_sector_id(user_id)` | SECURITY DEFINER | Returns sector for reader role |
| `get_session_total(cashier_id)` | STABLE SECURITY DEFINER | Returns total for cashier's open session |
| `handle_new_user()` | SECURITY DEFINER trigger | Auto-creates profile on auth user creation |
| `log_tariff_tier_change()` | SECURITY DEFINER trigger | Logs tier changes to tariff_tier_history |
| `current_role()` | STABLE SECURITY DEFINER | Returns current user role text |
| `update_updated_at()` | trigger (NOT SECURITY DEFINER) | Auto-sets updated_at on row update |
| `rls_auto_enable()` | SECURITY DEFINER event trigger | Auto-enables RLS on new tables |

### Performance optimizations applied

- `get_user_role()` is `STABLE` — PostgreSQL caches result within a statement, eliminates per-row re-evaluation in RLS
- RLS policies split into separate INSERT/UPDATE/DELETE (no redundant `get_user_role()` on SELECT)
- 7 composite indexes: `idx_receipts_period_status`, `idx_readings_needs_review` (partial), `idx_customers_active_sector_name`, `idx_payments_closure_status`, `idx_receipts_due_date_status` (partial), `idx_payments_created_at`, `billing_periods_year_month_key` (UNIQUE)
- `get_dashboard_kpis()` RPC replaces 5 sequential HTTP round-trips with 1 DB call
- `pg_trgm` + 3 GIN indexes for customer name search (`idx_customers_full_name_trgm`, `idx_customers_address_trgm`, `idx_customers_supply_number_trgm`)
- `idx_billing_periods_is_closed` partial index for `getCurrentPeriod()` filter
- 20+ CHECK constraints (13 added in Phase 3): `tariff_tiers_price_positive`, `tariff_tiers_min_less_than_max`, `billing_periods_month_valid`, `billing_periods_date_order`, `billing_concepts_amount_non_negative`, `customers_current_debt_non_negative`, `customers_connection_type_check`, `receipts_*_non_negative` (5), `payments_*_non_negative` (2), `cash_closures_total_collected_non_negative`, plus pre-existing constraints on readings, payments, receipts, cash_closures
- Legacy `customers.sector` column and `idx_customers_sector` dropped — sector info via `sector_id` FK only
- Redundant `"Reader read payments"` RLS policy dropped — `"Users read payments"` covers all roles including sector-scoped readers
- `calculate_energy_amount` changed from VOLATILE to STABLE (pure function, no side effects)
- 6 SECURITY DEFINER functions with role checks: `process_payment`, `generate_period_receipts`, `adjust_customer_debt`, `recalculate_customer_debt`, `get_dashboard_kpis`, `get_session_total`
- `audit_logs` UPDATE and DELETE deny policies (immutable audit trail)
- `reading-photos` bucket: INSERT restricted to admin+meter_reader, DELETE/UPDATE restricted to admin
- `readings` UPDATE policy: WITH CHECK enforces `meter_reader_id = auth.uid()`
- `process_payment` EXECUTE revoked from public/anon

### Migrations (22)

Located in `supabase/migrations/`. Most recent: `20260525_security_hardening.sql`. Schema source of truth: `supabase/schema.sql`.

### UX/Performance optimizations (Phase 4)

- `router.replace()` instead of `router.push()` on login and reader/new (prevents back-button loops)
- `aria-label` on all icon-only buttons (12 buttons across 10 files)
- `StatusBadge` shared component (`src/components/status-badge.tsx`) — 4 status type maps (receipt/payment/active/period), replaces 11+ inline patterns
- `EmptyState` shared component (`src/components/empty-state.tsx`) — message/description/icon/action props, replaces 7 inline empty states
- Native `<select>` → shadcn Select in readings-list (period filter) and cashier/history (date filter)
- `ConfirmDialog` dynamically imported via `next/dynamic()` in 10 files (code-splitting)
- `React.memo` on 10 admin list components (audit, concepts, customers, payments, periods, readings, receipts, sectors, tariffs, users)
- `error.tsx` boundaries for 3 deep nested segments: `admin/customers/[id]`, `admin/payments/[id]`, `admin/receipts/[id]`
- `receipt-row-payment.tsx` and `customer-receipts-tab.tsx` converted from Client to Server Components (removed dead callbacks, eliminated `useMemo`)

### Admin user setup

After creating auth user, manually run: `UPDATE profiles SET role = 'admin' WHERE email = '...'`

## Billing Calculation

### Tariff tier algorithm (progressive/escalonado)

Each tier defines a kWh range. Only kWh consumed **within** that range are billed at that tier's rate. Tiers are sorted by `order_index` (or `min_kwh`).

**Algorithm** (`calculateEnergyAmount` in `src/lib/billing-utils.ts`):

```
for each tier (sorted by min_kwh ascending):
  if consumption <= tier.min_kwh → skip (no kWh in this tier)
  if tier.max_kwh is null → tierConsumption = consumption - tier.min_kwh
  else → tierConsumption = min(consumption, tier.max_kwh) - tier.min_kwh
  total += tierConsumption × tier.price_per_kwh
return round(total, 2)
```

**Critical**: `min_kwh` is an **exclusive lower bound** in the algorithm. Tier ranges must be **contiguous** (no gaps). Example correct setup: Tier 1 `(0, 30)`, Tier 2 `(30, 100)`, Tier 3 `(100, NULL)`. If Tier 2 starts at `31` instead of `30`, the kWh between 30-31 is never billed.

### Receipt formula

```
energy_amount = Σ(tierConsumption × price_per_kwh)     -- progressive
fixed_charges  = Σ(fixed concepts + per_kwh concepts)   -- pass 1
               + Σ(percentage concepts)                  -- pass 2 (base = energy + fixed from pass 1)
subtotal       = energy_amount + fixed_charges
total_amount   = subtotal + previous_debt
```

**Subtlety**: `closePeriod` (period-service.ts) calculates all percentage concepts against the **same** base (`energy + fixed from pass 1`). `ReceiptService.calculateBreakdown` uses **cascading** percentages (each builds on running total including previous percentage concepts). Currently identical because only 1 percentage concept exists (IGV, inactive). Will diverge if multiple percentage concepts are activated.

## Production DB — Data Issues (ALL RESOLVED)

All 10 data issues from the real receipt audit have been fixed on the live DB. Migration: `20260521_data_audit_fixes.sql`. Follow-up fixes (CF tariff link, CF3, EL PORVENIR sector) applied directly to live DB.

### Resolved CRITICAL issues (billing accuracy)

| # | Issue | Fix applied |
|---|-------|------------|
| 1 | Tier 2 `min_kwh` gap (31→30) | `UPDATE tariff_tiers SET min_kwh = 30` |
| 2 | Missing tier 3 | `INSERT (100, NULL, 0.64)` for monofásico |
| 3 | Tier 2 price (0.63→0.62) | `UPDATE tariff_tiers SET price_per_kwh = 0.62` |
| 4 | Alumbrado Público (3.00→1.68) | `UPDATE billing_concepts SET amount = 1.68 WHERE code = 'AP'` |
| 5 | Missing Cargo Fijo | `INSERT 'CF' S/4.37 fixed` (applies_to_tariff_id = monofásico) + `INSERT 'CF3' S/5.20 fixed` (applies_to_tariff_id = trifásico) |

### Resolved IMPORTANT issues (configuration)

| # | Issue | Fix applied |
|---|-------|------------|
| 6 | Missing billing concepts | RRS, SE, BC, PJ all inserted at S/0 |
| 7 | Missing trifásica tariff | `BT5B-RESIDENCIAL - TRIFÁSICO` with 3 tiers (0.39/0.70/0.76) |
| 8 | Tariff name wrong | Renamed to `BT5B-RESIDENCIAL - MONOFÁSICO` |
| 9 | Missing sectors | 9 sectors: LAS LOMAS, PLAZA MAYOR, CENTRO, SAN JUAN, NUEVO CURIMANA, SAN MIGUEL, SANTA ROSA, LA FLORIDA, EL PORVENIR, BUENOS AIRES |
| 10 | Municipality name "2026" | Removed → `Municipalidad Distrital de Curimana` |

### OPERATIONAL — Data status

| Table | Records |
|-------|---------|
| customers | 1 (608132425 - jack jois perez noa) |
| billing_periods | 0 |
| readings | 0 |
| receipts | 0 |
| payments | 0 |

### Verified calculations (live RPC — all correct)

| Consumption | Energy amount | Status |
|-------------|---------------|--------|
| 30 kWh | S/ 9.30 | Match |
| 31 kWh | S/ 9.92 | Match |
| 50 kWh | S/ 21.70 | Match |
| 100 kWh | S/ 52.70 | Match |
| 150 kWh | S/ 84.70 | Match |

## Deployment

Vercel auto-deploys from `master` branch. Same env vars as `.env.local` configured in Vercel project settings.
