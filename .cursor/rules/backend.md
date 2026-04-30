# Backend Agent — Services, Repositories, Database

You build business logic and data access for the Curimana Eléctrica billing system.

## Architecture layers

```
Page/Component → Service (business logic) → Repository (Supabase queries) → PostgreSQL + RLS
```

- **Services** (`src/services/`): 12 services. Contain validation, calculations, orchestration. Import repositories, never Supabase client directly.
- **Repositories** (`src/repositories/`): 10 repos extending `BaseRepository<T>` from `base.ts`. All Supabase queries live here.
- **Database types** (`src/types/database.ts`): Supabase-generated. Use `Database['public']['Tables'][T]['Row']` and `['Insert']` / `['Update']`.

## BaseRepository API

```ts
class BaseRepository<T> {
  getAll(): Promise<Row[]>
  getById(id: string): Promise<Row>
  create(payload: Insert): Promise<Row>
  update(id: string, payload: Update): Promise<Row>
  delete(id: string): Promise<boolean>
}
```

All repos use the **browser** Supabase client (`@/lib/supabase/client`). Server-side data access should use `@/lib/supabase/server` directly, not through repos.

## Key business rules

- **Progressive tariff tiers**: Energy amount calculated via `calculateEnergyAmount(consumption, tiers)` in `@/lib/billing-utils.ts`. Tiers are ordered by `min_kwh`.
- **Billing concepts** have 3 types: `fixed` (flat amount), `percentage` (% of energy amount), `per_kwh` (× consumption).
- **Receipt total** = energy amount + fixed charges + previous debt. See `receipt-service.ts:calculateBreakdown()`.
- **Meter resets**: If `current_reading < previous_reading`, consumption = 0, flag `needs_review: true`. Never throw.
- **Cash closure**: Aggregates all payments in a date range.
- **PDF receipts**: Generated via `pdf-service.ts` using jsPDF + jspdf-autotable.

## Creating a new repository

1. Extend `BaseRepository<TableName>` — pass the table name from `Database['public']['Tables']`
2. Add custom query methods as needed
3. Export a singleton: `export const fooRepository = new FooRepository()`

## Creating a new service

1. Import the relevant repository singleton(s)
2. Add business validation before repository calls
3. Export a singleton: `export const fooService = new FooService()`

## Database schema

- Full schema: `supabase/schema.sql` (13 tables, 3 functions, 1 trigger, RLS on all tables)
- Seed data: `supabase/seed.sql`
- Key SQL functions: `get_user_role()`, `current_role()`, `calculate_energy_amount(consumption, tariff_id)`
- Trigger: `on_auth_user_created` → auto-creates profile row

## Rules

- No raw SQL strings in services — use Supabase query builder in repositories
- Always handle Supabase errors (`if (error) throw error` or try/catch with meaningful messages)
- No comments unless explicitly requested
- TypeScript strict mode — no `any` unless unavoidable (base.ts uses `as any` for generic table column access)

## Verification

After changes: `npx tsc --noEmit` → `npm run test`
