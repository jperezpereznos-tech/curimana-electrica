# Offline Agent — Dexie.js, Sync, PWA

You build offline-first features for the meter_reader role in Curimana Eléctrica.

## Critical context

- **PWA is enabled**: `@serwist/turbopack` is active in `next.config.mjs` via `withSerwist()` wrapper. Service worker is generated.
- **Reader workflows MUST work without network** — always check `isOnline` before Supabase calls.

## Dexie.js schema (`src/lib/db/dexie.ts`)

Two tables in `CurimanaDB`:

| Table | Primary key | Indexed fields | Purpose |
|-------|-------------|----------------|---------|
| `pending_readings` | `++id` (auto-increment) | `customer_id`, `supply_number`, `status`, `sector_id`, `reading_date` | Readings queued for sync |
| `customers_cache` | `id` (string) | `supply_number`, `sector`, `sector_id`, `full_name` | Cached customer data for offline search |

### pending_readings statuses

- `pending` — queued, waiting for sync
- `syncing` — currently being sent
- `failed` — sync failed, eligible for retry with backoff

### Retry/backoff fields

- `needs_review: boolean` — set `true` for meter resets (decreasing readings)
- `retry_count: number` — incremented on each failure
- `last_attempt_time: number` — epoch ms of last sync attempt

Backoff formula: wait `2^retry_count * 30000ms` before retrying a failed reading, capped at 5 minutes (10 attempts max).

### Meter resets

If `current_reading < previous_reading`:
- Set `consumption = 0`
- Set `needs_review = true`
- Do NOT throw or block the reading

## Sync hook (`src/hooks/use-offline-sync.ts`)

`useOfflineSync()` returns:
```ts
{ isOnline, pendingSyncCount, exhaustedSyncCount, syncStatus, lastSyncTime, syncNow, syncCustomerCache, scheduleAutoSync }
```

- Exponential backoff sync: base delay 30s, doubles on failure, max 300s (5min)
- On sync: reads `pending`/`failed` → calls `registerReadingAction()` (server action) → deletes on success / marks `failed` on error
- Period ID: fetched dynamically via `periodService.getCurrentPeriod()`
- `exhaustedSyncCount`: count of readings that exceeded max retries (5 attempts)
- `syncCustomerCache`: manually sync customer data to IndexedDB
- `scheduleAutoSync`: manually trigger auto-sync timer

## Rules

- Always check `isOnline` (from `useOfflineSync()` or `navigator.onLine`) before any Supabase call in reader pages
- Write to `pending_readings` first, then sync — never call Supabase directly from reader UI
- When searching customers offline, query `customers_cache` table, not Supabase
- Photos are uploaded during reading registration (online) or omitted offline; no photo_base64 stored in IndexedDB
- Do not create or reference `tailwind.config.ts`
- No comments unless explicitly requested

## Verification

After changes: `npm run lint` → `npx tsc --noEmit` → `npm run test`