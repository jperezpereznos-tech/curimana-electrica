# Curimana Eléctrica - Agent Guide

Municipal electric billing system for Curimana district. Next.js 16 + Supabase + PWA with offline sync.

## Critical Framework Notes

- **Next.js 16 breaking changes**: APIs differ from training data. Check `node_modules/next/dist/docs/` before writing code.
- **React 19**: Uses new JSX transform (configured in tsconfig).
- **Tailwind v4**: Uses `@import "tailwindcss"` syntax in globals.css, not traditional config file.

## Architecture

### Role-Based Routing
- `/admin/*` - Admin: dashboard, tariffs, concepts, customers, audit log, reports
- `/cashier/*` - Cashier (Cajero): payment processing, daily closure
- `/reader/*` - Reader (Lector): meter readings, offline-first mobile workflow
- `/login` - Authentication entry

### Data Flow
1. **Online**: Next.js App Router → Service Layer → Supabase (PostgreSQL + RLS)
2. **Offline (readers)**: Dexie.js (IndexedDB) → Background sync when online

### Key Directories
```
src/
  app/           # Next.js App Router (pages by role)
  services/      # Business logic (tariff, payment, reading, etc.)
  repositories/  # Supabase access layer
  hooks/         # Auth, offline sync
  components/ui/ # shadcn/ui components
  lib/
    db/dexie.ts  # Offline database
    supabase/    # Client/server/middleware clients
    billing-utils.ts  # Tariff calculations
```

## Developer Commands

```bash
# Dev server
npm run dev

# Unit tests (Vitest + jsdom)
npm run test

# E2E tests (Playwright, auto-starts dev server)
npx playwright test

# Lint (ESLint 9 flat config)
npm run lint

# Build for production
npm run build
```

### Test Specifics
- **Unit**: Vitest with `@` alias mapped to `./src`. Excludes `tests/e2e/**`.
- **E2E**: Tests in `tests/e2e/`. Runs against `http://localhost:3000`.
  - Projects: chromium, mobile-chrome (Pixel 5), mobile-safari (iPhone 12)
  - CI: 2 retries, 1 worker. Local: 0 retries, auto workers.

## Environment Setup

Required in `.env.local` (see `.env.local.example`):
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=  # Edge functions only
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

## Database

- **Location**: `supabase/schema.sql` (run in Supabase SQL Editor)
- **Seed**: `supabase/seed.sql` (initial tariffs, customers, users)
- **Security**: Row Level Security (RLS) enforced per role
- **Edge Functions**: `supabase/functions/` (e.g., receipt generation)

## Styling Conventions

- **shadcn/ui**: `base-nova` style. Import from `@/components/ui/*`
- **Icons**: Lucide (`lucide-react`)
- **Colors**: Municipal brand colors in CSS vars:
  - `--muni-blue: #0066cc`
  - `--muni-silver: #c0c0c0`
- **CSS**: Tailwind v4 with `@theme inline` in `globals.css`

## Offline/PWA Notes

- **PWA**: Configured via `@serwist/next`. Service worker auto-generated.
- **Offline DB**: Dexie.js in `src/lib/db/dexie.ts`
- **Sync Hook**: `use-offline-sync.ts` handles background sync
- **Critical**: Reader workflows must work without network; always check online status before Supabase calls

## Code Patterns

### Supabase Client (per context)
- **Browser**: `src/lib/supabase/client.ts` - `createBrowserClient<Database>`
- **Server**: `src/lib/supabase/server.ts` - `createServerClient` with cookie handling
- **Middleware**: `src/lib/supabase/middleware.ts` - Auth session refresh

### Adding shadcn Components
```bash
npx shadcn add button
# Uses components.json aliases: @/components, @/lib/utils, etc.
```

## Constraints

- **No** pages router - pure App Router
- **TypeScript strict mode** enabled
- **ESM only** - `"type": "module"` implicit via Next.js
