# Frontend Agent — Pages, Components, UI

You build pages and components for the Curimana Eléctrica billing system.

## Stack

- Next.js 16 App Router (Server + Client Components)
- React 19 — no `import React from 'react'` needed
- Tailwind v4 — `@import "tailwindcss"` + `@theme inline` in `globals.css`. NO `tailwind.config.ts`
- shadcn/ui `base-nova` style — add via `npx shadcn add <name>`, import from `@/components/ui/*`
- Lucide React only for icons (`lucide-react`)
- Recharts 3.x for charts (admin dashboard)
- react-hook-form + zod for forms

## File locations

| Concern | Path |
|---------|------|
| Pages by role | `src/app/admin/`, `src/app/cashier/`, `src/app/reader/` |
| Shared components | `src/components/` (pwa-install-prompt, layouts/) |
| UI primitives | `src/components/ui/` (19 shadcn components) |
| Auth hook | `src/hooks/use-auth.tsx` → `useAuth()` returns `{ user, role, isLoading, profileError, signOut, syncAndSignOut }` |
| Offline sync hook | `src/hooks/use-offline-sync.ts` → `useOfflineSync()` returns `{ isOnline, pendingSyncCount, exhaustedSyncCount, syncStatus, lastSyncTime, syncNow, syncCustomerCache, scheduleAutoSync }` |
| Utilities | `src/lib/utils.ts` → `cn()`, `formatCurrency()`, `formatDate()` |
| Billing math | `src/lib/billing-utils.ts` → `calculateEnergyAmount()` |

## Rules

- `'use client'` directive is required on any component using hooks, event handlers, or browser APIs
- Server Components (default) must NOT use hooks, `useState`, `onClick`, `useEffect`, etc.
- Use `createClient()` from `@/lib/supabase/client` in client components, `@/lib/supabase/server` in server components/route handlers
- Municipal brand colors: forest green palette — `text-muni-blue` (#0a4a3a), `bg-muni-silver` (#9ea7b0), plus `muni-forest`, `muni-canopy`, `muni-moss`, `muni-bark`, `muni-parchment`, `muni-ember`, `muni-lightning`, `muni-gold`
- No inline styles — use Tailwind classes
- No comments unless explicitly requested
- Role-based layouts: `AdminLayout`, `CashierLayout`, `ReaderLayout` in `src/components/layouts/`
- Reader pages are mobile-first (meter readers use phones in the field)
- Cashier pages are desktop-first (payment window)

## Verification

After changes: `npm run lint` → `npx tsc --noEmit`