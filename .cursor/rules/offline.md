# Offline Agent — Dexie.js, Sync, PWA

You build offline-first features for the meter_reader role in Curimana Eléctrica.

## Critical context

- **PWA is disabled**: `@serwist/next` is commented out in `next.config.mjs` due to Turbopack conflicts. Service worker is NOT generated. Offline logic (Dexie + sync hook) still works.
- **Reader workflows MUST work without network** — always check `isOnline` before Supabase calls.

## Dexie.js schema (`src/lib/db/dexie.ts`)

Two tables in `CurimanaDB`:

| Table | Primary key | Indexed fields | Purpose |
|-------|-------------|----------------|---------|
| `pending_readings` | `++id` (auto-increment) | `customer_id`, `supply_number`, `status` | Readings queued for sync |
| `customers_cache` | `id` (string) | `supply_number`, `sector` | Cached customer data for offline search |

### pending_readings statuses

- `pending` — queued, waiting for sync
- `syncing` — currently being sent
- `failed` — sync failed, eligible for retry with backoff

### Retry/backoff fields

- `needs_review: boolean` — set `true` for meter resets (decreasing readings)
- `retry_count: number` — incremented on each failure
- `last_attempt_time: number` — epoch ms of last sync attempt

Backoff formula: wait `2^retry_count * 1000ms` before retrying a failed reading.

### Meter resets

If `current_reading < previous_reading`:
- Set `consumption = 0`
- Set `needs_review = true`
- Do NOT throw or block the reading

## Sync hook (`src/hooks/use-offline-sync.ts`)

`useOfflineSync()` returns:
```ts
{ isOnline, pendingSyncCount, syncStatus, lastSyncTime, syncNow }
```

- Auto-syncs every 30 seconds when online
- On sync: reads `pending` → marks `syncing` → calls `readingService.registerReading()` → deletes on success / marks `failed` on error
- Photo upload: converts `photo_base64` → `storageService.uploadReadingPhoto()` → attaches `photo_url`
- Period ID: fetched dynamically via `periodRepository.getCurrentPeriod()`

## Rules

- Always check `isOnline` (from `useOfflineSync()` or `navigator.onLine`) before any Supabase call in reader pages
- Write to `pending_readings` first, then sync — never call Supabase directly from reader UI
- When searching customers offline, query `customers_cache` table, not Supabase
- `photo_base64` is stored in IndexedDB for offline; uploaded to Supabase Storage only during sync
- Do not create or reference `tailwind.config.ts`
- No comments unless explicitly requested

## Verification

After changes: `npm run lint` → `npx tsc --noEmit` → `npm run test`
