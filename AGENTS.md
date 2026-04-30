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
npm run dev          # Dev server (Turbopack)
npm run build        # Production build
npm run lint         # ESLint 9 flat config (core-web-vitals + typescript)
npx tsc --noEmit     # TypeScript strict check
npm run test         # Vitest unit tests (jsdom, @ alias, globals: true)
npx playwright test  # E2E (auto-starts `npm run start`, not dev)
```

### Verification order

`lint` → `tsc --noEmit` → `test` → `build`

### Test specifics

- **Vitest**: `globals: true` (no need to import `describe`/`it`/`expect`). Env vars auto-set in `vitest.config.ts`. Excludes `tests/e2e/**`.
- **Playwright**: `tests/e2e/`. Uses `npm run start` (production build), NOT `npm run dev`. 3 projects: chromium, mobile-chrome (Pixel 5), mobile-safari (iPhone 12). CI: 2 retries, 1 worker; local: 0 retries, auto workers.

## Architecture

### Data flow

- **Online**: App Router page/component → `src/services/` (business logic, 12 services) → `src/repositories/` (Supabase queries, 10 repos extending `base.ts`) → Supabase PostgreSQL + RLS
- **Offline (reader role)**: Dexie.js (`src/lib/db/dexie.ts`) ↔ `use-offline-sync.ts` (background sync every 30s, exponential backoff on failure)

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

- `pending_readings`: `++id, customer_id, supply_number, status` — statuses: `pending | syncing | failed`. Fields `needs_review`, `retry_count`, `last_attempt_time` track sync failures.
- `customers_cache`: `id, supply_number, sector`

**Critical**: Reader workflows must work without network. Always check online status before Supabase calls. Meter resets (decreasing readings) are handled with zero consumption + `needs_review: true`.

## Environment

Required in `.env.local` (see `.env.local.example`):

```
NEXT_PUBLIC_SUPABASE_URL=<project_url>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon_key>
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

Vitest auto-sets dummy values — no `.env.local` needed for unit tests.

## Database

- **Schema**: `supabase/schema.sql` — 13 tables, 3 functions, 1 trigger, full RLS
- **Seed**: `supabase/seed.sql` — roles, municipal config, BTSB tariff (3 tiers), 4 billing concepts, 5 test customers, 1 period
- **Key SQL functions**:
  - `get_user_role()` — SECURITY DEFINER, returns role for authenticated user (used by proxy.ts)
  - `calculate_energy_amount(consumption, tariff_id)` — progressive tier calculation
  - `handle_new_user()` — trigger: auto-creates profile on auth user creation
- **Admin user setup**: After creating auth user, manually run `UPDATE profiles SET role = 'admin' WHERE email = '...'`

## Deployment

Vercel auto-deploys from `master` branch. Same env vars as `.env.local` configured in Vercel project settings.
