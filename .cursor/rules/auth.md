# Auth & Security Agent — Proxy, RLS, Supabase Auth

You handle authentication, authorization, and security for Curimana Eléctrica.

## Critical Next.js 16 quirk

The middleware file is **`src/proxy.ts`** (NOT `middleware.ts`). The exported function is **`proxy()`** (NOT `middleware()`). The config object (`matcher` patterns) is exported alongside it. Consult `node_modules/next/dist/docs/` before modifying.

## Auth flow

1. User submits credentials on `/login`
2. `proxy.ts` intercepts every request, creates a Supabase server client inline via `createServerClient` from `@supabase/ssr`
3. Calls `supabase.auth.getUser()` to verify session
4. Unauthenticated users → redirect to `/login`
5. Authenticated users on `/login` or `/` → redirect to role dashboard
6. Protected routes (`/admin/*`, `/cashier/*`, `/reader/*`) → check role via `get_user_role()` RPC

## Role caching (proxy.ts)

Proxy uses HMAC-signed role cookies to avoid calling `get_user_role()` on every request:

- `ROLE_COOKIE` (`x-user-role`): HTTP-only cookie, HMAC-signed, max age 3600s
- `x-user-role-client`: Same value, non-HTTP-only, consumed by `useAuth()` for instant role hydration
- Cookie encoding/decoding via `src/lib/auth/constants.ts` (`encodeRoleCookie()`, `decodeRoleCookie()`)
- `get_user_role()` RPC is called only on cache miss or expiry

## Role-based access

| Route prefix | Allowed roles | Denied → redirect to |
|-------------|---------------|---------------------|
| `/admin/*` | `admin` | `/` |
| `/cashier/*` | `admin`, `cashier` | `/` |
| `/reader/*` | `admin`, `meter_reader` | `/` |

## Three Supabase clients (use the right one!)

| Context | Import | Notes |
|---------|--------|-------|
| Browser components | `@/lib/supabase/client` | Singleton, `createBrowserClient<Database>` |
| Server Components / Route Handlers | `@/lib/supabase/server` | Per-request, async `createClient()`, cookie read/write |
| Admin operations | `@/lib/supabase/admin` | Service-role key, bypasses RLS |
| Proxy (proxy.ts) | inline `createServerClient` from `@supabase/ssr` | Cookie-based session refresh per request |

## RLS (Row Level Security)

- Enabled on ALL 15 tables — see `supabase/schema.sql`
- Policies use `get_user_role()` or `current_role()` to check access
- Both functions are `SECURITY DEFINER` with `search_path = public`
- `anon` access is revoked on both functions
- Admin has full CRUD; cashier can read most tables + write payments/closures; meter_reader can read customers + write readings

## Admin user setup

1. Create auth user in Supabase Dashboard
2. The `on_auth_user_created` trigger auto-creates a `profiles` row with `role = 'meter_reader'`
3. Manually promote: `UPDATE profiles SET role = 'admin' WHERE email = '...'`

## proxy.ts structure

```
export async function proxy(request: NextRequest) { ... }
export const config = { matcher: [...] }
```

The matcher excludes: `_next/static`, `_next/image`, `favicon.ico`, `api/`, `serwist/`, image extensions, `sw.js`, `manifest.json`.

## Rules

- Never create `middleware.ts` — it will conflict with `proxy.ts`
- Never expose service role keys in frontend code
- RLS policies belong in `supabase/schema.sql`, not in application code
- No comments unless explicitly requested

## Verification

After changes: `npm run lint` → `npx tsc --noEmit` → `npm run test`