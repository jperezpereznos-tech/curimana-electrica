# SKILL: Sistema Eléctrico Municipal — Curimana
## Versión: 2.0 | Stack: Next.js 16 + Supabase + Tailwind v4 + PWA

═══════════════════════════════════════════════════════════════════
MODO DE USO:
1. Copia la FASE que corresponda como prompt en tu agente de código
2. Espera a que termine y REVISA el código generado
3. Ejecuta los tests de esa fase antes de continuar
4. Solo cuando todo pase, copia la siguiente FASE
═══════════════════════════════════════════════════════════════════

## ESTADO ACTUAL DEL PROYECTO

### ✅ Completado
- [x] FASE 0: Setup inicial (Next.js 16, Supabase, PWA, Tailwind v4)
- [x] FASE 1: Schema SQL y Supabase (13 tablas, funciones, trigger, RLS)
- [x] FASE 2: Autenticación y roles (proxy.ts, useAuth, layouts)
- [x] FASE 3: Gestión de clientes y tarifas (CRUD completo)
- [x] FASE 4: Periodos y lecturas (mobile-first, offline)
- [x] FASE 5: Recibos y facturación (PDF con jsPDF)
- [x] FASE 6: Pagos en caja y control
- [x] FASE 7: Dashboard admin y reportes (KPIs, gráficos, CSV)

### ⚠️ Pendiente
- [ ] FASE 8: Testing E2E completo
- [ ] FASE 9: Hardening de seguridad + optimizaciones de producción

### Stack Real Implementado
| Componente | Versión |
|-----------|---------|
| Next.js | 16.2.4 |
| React | 19.2.4 |
| TypeScript | Estricto |
| Tailwind CSS | v4 (con @theme inline) |
| shadcn/ui | base-nova |
| Supabase | @supabase/ssr 0.10.2 |
| Dexie.js | 4.4.2 |
| Recharts | 3.8.1 |
| jsPDF | 4.2.1 |
| Vitest + Playwright | Configurados |

### Repositorio & Deploy
- **GitHub**: `jperezpereznos-tech/curimana-electrica` (branch `master`)
- **Producción**: Vercel (auto-deploy)
- **Supabase Project ID**: `yxhzkbzmnvhesdefwgjc`

---

## NOTAS CRÍTICAS PARA AGENTES

### ⚠️ Next.js 16 — Breaking Changes

1. **`middleware.ts` ya NO existe**. Fue renombrado a `proxy.ts`:
   ```typescript
   // src/proxy.ts — CORRECTO
   export function proxy(request: NextRequest) { ... }
   
   // src/middleware.ts — INCORRECTO, causa error de build
   ```

2. **No pueden coexistir** `middleware.ts` y `proxy.ts`. Solo uno.

3. **Tailwind v4** usa `@import "tailwindcss"` en `globals.css`, NO `tailwind.config.ts`.

4. **Consultar docs**: Antes de usar APIs de Next.js, verificar en:
   ```
   node_modules/next/dist/docs/
   ```

### Estructura Real del Proyecto

```
src/
├── proxy.ts                      # Auth + route protection (Next.js 16)
├── app/
│   ├── layout.tsx                # Root layout
│   ├── page.tsx                  # Landing/redirect
│   ├── globals.css               # Tailwind v4 + theme
│   ├── login/page.tsx            # Login form
│   ├── admin/
│   │   ├── page.tsx              # Dashboard (Server Component)
│   │   ├── dashboard-components.tsx  # KPIs, charts (Client)
│   │   ├── download-reports.tsx  # CSV exports
│   │   ├── top-debtors.tsx       # Top debtors table
│   │   ├── latest-readings.tsx   # Latest readings table
│   │   ├── customers/            # CRUD clientes
│   │   │   ├── page.tsx          # Lista + búsqueda
│   │   │   └── [id]/page.tsx     # Detalle cliente
│   │   ├── tariffs/page.tsx      # Gestión tarifas + tramos
│   │   ├── concepts/page.tsx     # Conceptos de cobro
│   │   ├── periods/page.tsx      # Periodos de facturación
│   │   ├── receipts/
│   │   │   ├── page.tsx          # Lista recibos
│   │   │   └── [id]/page.tsx     # Detalle recibo
│   │   └── audit/page.tsx        # Bitácora de auditoría
│   ├── cashier/
│   │   ├── page.tsx              # Búsqueda + cobros
│   │   ├── cashier-search.tsx    # Componente búsqueda
│   │   ├── payment-modal.tsx     # Modal de pago
│   │   ├── closure/page.tsx      # Cierre de caja
│   │   └── history/page.tsx      # Historial
│   └── reader/
│       ├── page.tsx              # Dashboard lector
│       ├── new/page.tsx          # Nueva lectura (mobile-first)
│       ├── search/page.tsx       # Buscar cliente
│       ├── pending/page.tsx      # Lecturas pendientes
│       ├── sync/page.tsx         # Sincronización
│       └── list/page.tsx         # Lista de lecturas
├── services/                     # 12 servicios
│   ├── dashboard-service.ts      # getSummaryKPIs, getRevenueHistory, etc.
│   ├── payment-service.ts        # processPayment, processPartialPayment
│   ├── receipt-service.ts        # generateReceipt, getReceiptDetail
│   ├── reading-service.ts        # submitReading, getReadingsByPeriod
│   ├── tariff-service.ts         # CRUD + tier validation
│   ├── customer-service.ts       # CRUD + debt tracking
│   ├── period-service.ts         # createPeriod, closePeriod
│   ├── concept-service.ts        # CRUD conceptos
│   ├── cash-closure-service.ts   # openCash, closeCash
│   ├── audit-service.ts          # logAction, getAuditLogs
│   ├── pdf-service.ts            # generateReceiptPDF
│   └── storage-service.ts        # uploadPhoto, getPhotoUrl
├── repositories/                 # 10 repositorios
│   ├── base.ts                   # BaseRepository<T> con CRUD genérico
│   ├── customer-repository.ts
│   ├── tariff-repository.ts
│   ├── reading-repository.ts
│   ├── receipt-repository.ts
│   ├── payment-repository.ts
│   ├── period-repository.ts
│   ├── concept-repository.ts
│   ├── cash-closure-repository.ts
│   └── audit-repository.ts
├── hooks/
│   ├── use-auth.tsx              # AuthProvider + useAuth()
│   └── use-offline-sync.ts       # Sync IndexedDB → Supabase
├── components/
│   ├── ui/                       # 13 shadcn components
│   │   ├── button, card, input, label, form
│   │   ├── dialog, select, table, tabs
│   │   ├── badge, alert, progress, dropdown-menu
│   └── layouts/
│       ├── admin-layout.tsx      # Sidebar + header
│       ├── cashier-layout.tsx    # Header simple
│       └── reader-layout.tsx     # Mobile-first UI
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # createBrowserClient<Database>
│   │   ├── server.ts             # createServerClient (cookies)
│   │   └── middleware.ts         # updateSession() for proxy.ts
│   ├── db/dexie.ts               # PendingReading, CustomerCache
│   ├── billing-utils.ts          # calculateEnergyAmount, etc.
│   └── utils.ts                  # cn(), formatCurrency(), formatDate()
└── types/
    └── database.ts               # Database types (Supabase generated)
```

### Base de Datos — Estado Actual

**13 tablas** con RLS habilitado en todas:

| # | Tabla | Registros | Estado |
|---|-------|-----------|--------|
| 1 | `roles` | 3 | ✅ OK |
| 2 | `profiles` | 1 | ✅ Admin creado |
| 3 | `municipality_config` | 0 | ⚠️ Ejecutar seed.sql |
| 4 | `tariffs` | 0 | ⚠️ Ejecutar seed.sql |
| 5 | `tariff_tiers` | 0 | ⚠️ Ejecutar seed.sql |
| 6 | `billing_concepts` | 0 | ⚠️ Ejecutar seed.sql |
| 7 | `customers` | 0 | ⚠️ Ejecutar seed.sql |
| 8 | `billing_periods` | 0 | ⚠️ Ejecutar seed.sql |
| 9 | `readings` | 0 | Normal (vacía) |
| 10 | `receipts` | 0 | Normal (vacía) |
| 11 | `payments` | 0 | Normal (vacía) |
| 12 | `cash_closures` | 0 | Normal (vacía) |
| 13 | `audit_logs` | 0 | Normal (vacía) |

**3 funciones PL/pgSQL**:
- `get_user_role()` — SECURITY DEFINER, retorna rol del usuario autenticado
- `current_role()` — Alias compatible
- `calculate_energy_amount(consumption, tariff_id)` — Cálculo escalonado

**1 trigger**:
- `on_auth_user_created` → `handle_new_user()` — Auto-crea perfil

---

## FASE 0: SETUP INICIAL Y BASE DE DATOS
### Prompt para el agente:

"Eres un arquitecto de software senior. Genera el setup completo de un proyecto
Next.js 16 con App Router, TypeScript, Tailwind CSS v4, shadcn/ui, y configuración
de Supabase.

REQUISITOS DE ESTA FASE:
1. Estructura de carpetas:
   src/
   ├── app/                    # Next.js App Router
   ├── components/ui/          # shadcn/ui components
   ├── lib/
   │   ├── supabase/          # Cliente y server clients
   │   ├── db/                # Schema types (auto-generated)
   │   └── utils.ts
   ├── services/              # Lógica de negocio
   ├── repositories/          # Acceso a datos
   ├── hooks/                 # Custom React hooks
   ├── types/                 # Tipos TypeScript globales
   └── styles/

2. Configurar:
   - next.config.js con PWA (@serwist/next)
   - proxy.ts para protección de rutas por rol (Next.js 16, NO middleware.ts)
   - .env.local.example con todas las variables necesarias
   - globals.css con Tailwind v4 (@import 'tailwindcss' + @theme inline)

3. Instalar dependencias:
   - @supabase/supabase-js, @supabase/ssr
   - dexie (IndexedDB para offline)
   - date-fns, zod, react-hook-form, @hookform/resolvers
   - jspdf + jspdf-autotable (para PDFs de recibo)
   - recharts (gráficos dashboard)
   - vitest, @testing-library/react, jsdom, playwright

4. Crear utilidades base:
   - cn() para Tailwind
   - formatCurrency() para soles peruanos (S/ X.XX)
   - formatDate() para fechas locales es-PE
   - generateReceiptNumber() helper

IMPORTANTE: En Next.js 16, middleware.ts fue renombrado a proxy.ts.
La función exportada debe llamarse proxy(), NO middleware().
NO generes UI todavía. Solo estructura, config y utilidades."

### Checklist de verificación:
□ Proyecto corre con `npm run dev`
□ Tests corren con `npm run test`
□ Playwright instalado y configurado
□ Variables de entorno documentadas
□ PWA manifest generado
□ proxy.ts (NO middleware.ts) funciona

---

## FASE 1: SCHEMA SQL Y SUPABASE
### Prompt para el agente:

"Genera el schema SQL completo para Supabase PostgreSQL del Sistema Eléctrico
Municipal de Curimana, basado en este diseño:

TABLAS REQUERIDAS:

1. roles (seed data: admin, cashier, meter_reader)
2. profiles (vinculada a auth.users via trigger)
   - id UUID PK REFERENCES auth.users, email, full_name, role FK→roles, created_at, updated_at
3. municipality_config (ruc, name, address, billing_cut_day, payment_grace_days)
4. tariffs (name, connection_type, is_active)
5. tariff_tiers (tariff_id FK, min_kwh, max_kwh, price_per_kwh, order_index)
6. billing_concepts (code UNIQUE, name, amount, type, applies_to_tariff_id)
7. customers (supply_number UNIQUE, full_name, address, sector, tariff_id FK, current_debt)
8. billing_periods (name, year, month, start_date, end_date, is_closed, UNIQUE year+month)
9. readings (customer_id FK, billing_period_id FK, previous/current_reading, consumption GENERATED)
10. receipts (receipt_number BIGINT UNIQUE, customer_id, reading_id, billing_period_id, amounts, status CHECK)
11. payments (receipt_id FK, customer_id FK, amount, method, cashier_id)
12. cash_closures (cashier_id, opening_amount, total_collected, status CHECK)
13. audit_logs (table_name, record_id, action, old_data JSONB, new_data JSONB)

FUNCIONES SQL:
- get_user_role() — SECURITY DEFINER, SET search_path = public
- current_role() — Alias compatible
- calculate_energy_amount(consumption, tariff_id) — Tramos progresivos
- handle_new_user() — Trigger para auto-crear perfil en profiles

TRIGGER:
- on_auth_user_created AFTER INSERT ON auth.users → handle_new_user()

SEGURIDAD:
- REVOKE EXECUTE ON get_user_role() y current_role() FROM anon
- RLS con (SELECT public.get_user_role()) optimizado
- Todas las políticas usan (SELECT auth.uid()) en vez de auth.uid() directo

SEED DATA: roles, 1 config municipal, 1 tarifa BTSB con 3 tramos, 4 conceptos, 5 clientes, 1 periodo

Genera:
1. supabase/schema.sql
2. supabase/seed.sql
3. src/types/database.ts"

### Checklist de verificación:
□ Schema ejecuta sin errores en Supabase SQL Editor
□ Seed data inserta correctamente
□ Trigger crea perfil al registrar usuario
□ RLS policies aplicadas y testeadas
□ calculate_energy_amount devuelve valores correctos:
   - 30 kWh → 9.30
   - 50 kWh → 21.70 (30×0.31 + 20×0.62)
   - 120 kWh → 74.30 (30×0.31 + 70×0.62 + 20×0.64)

---

## FASE 2: AUTENTICACIÓN Y ROLES
### Prompt para el agente:

"Implementa el sistema de autenticación completo con Supabase Auth y roles.

REQUISITOS:
1. Auth UI:
   - Login page (/login) con email/password
   - Formulario con validación Zod
   - Manejo de errores (credenciales inválidas, usuario no confirmado)

2. Proxy (src/proxy.ts — Next.js 16, NO middleware.ts):
   - Función exportada: export async function proxy(request)
   - Refrescar sesión con updateSession() de @supabase/ssr
   - Proteger rutas según rol:
     - /admin/* → solo admin
     - /cashier/* → admin + cashier
     - /reader/* → admin + meter_reader
   - Redirección automática al dashboard correspondiente

3. Contexto de Auth:
   - AuthProvider con React Context
   - Hook useAuth() que exponga: user, role, isLoading, signOut
   - Usar getUser() (NO getSession) para validación del lado del servidor

4. Layouts por rol:
   - AdminLayout: sidebar con navegación completa
   - CashierLayout: header simple, búsqueda prominente
   - ReaderLayout: UI mobile-first, botones grandes"

### Checklist de verificación:
□ Login funciona con 3 roles diferentes
□ Acceso a /admin bloqueado para cashier y reader
□ useAuth() retorna rol correcto
□ Sign out limpia sesión y redirige a login
□ proxy.ts (NO middleware.ts) se ejecuta correctamente

---

## FASE 3: GESTIÓN DE CLIENTES Y TARIFAS (Admin)
### Prompt para el agente:

"Implementa los módulos de gestión de clientes y tarifas para administradores.

MÓDULO TARIFAS (/admin/tariffs):
1. Lista de tarifas con sus tramos
2. Formulario CRUD de tarifa:
   - Nombre, tipo de conexión
   - Tramos dinámicos (agregar/eliminar filas)
   - Validación: tramos no deben solaparse, min_kwh < max_kwh
3. Activar/desactivar tarifa

MÓDULO CONCEPTOS (/admin/concepts):
1. Lista de conceptos de cobro
2. CRUD de conceptos: código, nombre, monto, tipo, tarifa opcional

MÓDULO CLIENTES (/admin/customers):
1. Lista con búsqueda por: nombre, supply_number, sector
2. CRUD completo con selector de tarifa
3. Vista detalle: historial de lecturas, recibos, pagos

Genera:
- Repositories: tariffRepository, customerRepository, conceptRepository
- Services: tariffService, customerService
- Tests unitarios para validación de tramos"

### Checklist de verificación:
□ CRUD tarifas funciona con tramos múltiples
□ No permite tramos solapados
□ Cliente se crea con deuda 0
□ Búsqueda por supply_number funciona

---

## FASE 4: PERIODOS Y LECTURAS (Mobile-First)
### Prompt para el agente:

"Implementa la gestión de periodos de facturación y lecturas de medidores.

MÓDULO PERIODOS (/admin/periods):
1. Lista de periodos con estado (abierto/cerrado)
2. Crear periodo: auto-calcula fechas (26 al 25)
3. Cerrar periodo: genera recibos para todos los clientes activos

MÓDULO LECTURAS (/reader — mobile-first):
1. Dashboard del lector: periodo actual, contador de lecturas
2. Formulario de lectura (UI mobile-first):
   - Input grande para supply_number
   - Muestra datos del cliente + lectura anterior
   - Input numérico grande para lectura actual
   - Validación: current < previous → alerta
   - Captura de foto
3. Offline con IndexedDB (Dexie):
   - pending_readings: id, customer_id, supply_number, readings, status, photo_base64
   - customers_cache: id, supply_number, full_name, address, sector, previous_reading
   - Sync automático cada 30 segundos cuando online
   - Botón 'Sincronizar ahora'

Genera:
- Service: readingService, periodService
- Repository: readingRepository, periodRepository
- Hook: useOfflineSync()
- Tests: cálculo de consumo, validación, sync"

### Checklist de verificación:
□ Periodo se crea con fechas correctas (26 al 25)
□ Cierre de periodo genera recibos
□ Lectura offline se guarda en IndexedDB
□ Sync envía datos al servidor

---

## FASE 5: RECIBOS Y FACTURACIÓN
### Prompt para el agente:

"Implementa el módulo de recibos y generación de PDF.

MÓDULO RECIBOS (/admin/receipts, /cashier):
1. Lista con filtros: periodo, estado, supply_number, nombre
2. Vista detalle: cliente, lecturas, desglose por tramos, conceptos, deuda
3. Generación de PDF (jsPDF + jspdf-autotable):
   - Logo municipal, RUC, nombre
   - N° Suministro, mes facturado
   - Tabla de conceptos e importes
   - Subtotal, deudas, total
   - Fechas de emisión y vencimiento
4. Acciones: Imprimir/PDF, cancelar recibo (admin)

Genera:
- Service: receiptService, pdfService
- Tests: cálculo con 50 kWh, 0 kWh, con deuda anterior"

### Checklist de verificación:
□ Recibo muestra desglose correcto de tramos
□ PDF se genera y descarga
□ Cancelación actualiza estado y audit log

---

## FASE 6: PAGOS EN CAJA Y CONTROL
### Prompt para el agente:

"Implementa el módulo de cobros en ventanilla y control de caja.

MÓDULO CAJERO (/cashier):
1. Búsqueda prominente por supply_number
2. Resultado: nombre, dirección, deuda total, recibos pendientes
3. Pago de recibo: seleccionar, monto, vuelto, botón registrar
4. Pago parcial: confirmar, actualizar recibo y deuda
5. Comprobante de pago (PDF simple)

MÓDULO CIERRE DE CAJA (/cashier/closure):
1. Apertura: monto inicial
2. Acumulación automática durante el día
3. Cierre: resumen + reporte PDF

Genera:
- Service: paymentService, cashClosureService
- Tests: pago total, pago parcial, cierre de caja"

### Checklist de verificación:
□ Pago total actualiza recibo y deuda
□ Pago parcial funciona correctamente
□ Cierre de caja genera reporte
□ Audit log registra todo pago

---

## FASE 7: DASHBOARD ADMIN Y REPORTES
### Prompt para el agente:

"Implementa el dashboard administrativo con KPIs y gráficos.

DASHBOARD (/admin):
1. KPIs: recaudación mensual, deuda pendiente, clientes activos, recibos pendientes
2. Gráficos (Recharts): recaudación por periodo, consumo por sector
3. Tablas: top 5 deudores, últimas lecturas
4. Reportes descargables (CSV): recaudación, morosos, lecturas

Genera:
- Service: dashboardService (queries agregadas)
- Componentes: KPICard, RevenueChart, SectorConsumptionChart"

### Checklist de verificación:
□ KPIs muestran datos reales
□ Gráficos renderizan correctamente
□ CSV se descarga con datos correctos
□ Dashboard carga en < 2 segundos

---

## FASE 8: TESTING E2E Y PWA
### Prompt para el agente:

"Implementa la suite completa de testing y finaliza PWA.

TESTS E2E (Playwright):
1. Login flow: admin→/admin, cashier→/cashier, reader→/reader, inválido→error
2. Flujo completo: crear cliente → lectura → cierre periodo → recibo → pago
3. Flujo mobile lecturista: lectura offline → sync

PWA:
1. Service Worker: cache-first assets, network-first API
2. Manifest: 'Curimana Eléctrica', theme #0066cc, standalone
3. Prompt de instalación en móviles

Genera:
- tests/e2e/ con los 3 escenarios
- Configuración PWA completa"

### Checklist de verificación:
□ Tests E2E pasan
□ PWA instala en móvil
□ App funciona offline

---

## FASE 9: SEGURIDAD, AUDITORÍA Y DEPLOYMENT
### Prompt para el agente:

"Finaliza seguridad, auditoría y prepara para producción.

SEGURIDAD:
1. RLS completo en todas las tablas (ya implementado)
2. Funciones con SET search_path = public (ya corregido)
3. REVOKE acceso anon a funciones sensibles (ya corregido)
4. Validación de inputs con Zod
5. Headers de seguridad en Next.js

AUDITORÍA:
1. Vista de audit logs para admin (/admin/audit) — ya implementado
2. Filtros por tabla, usuario, fecha

DEPLOYMENT:
1. README.md completo ✅
2. Verificar deploy en Vercel ✅
3. Variables de entorno en producción ✅"

### Checklist de verificación:
□ RLS funciona con cada rol
□ Audit logs registran cambios
□ README actualizado
□ App desplegada en Vercel sin errores

---

## PROMPT DE SISTEMA (para usar con agentes de código)

Copia esto como 'System Prompt' o contexto persistente:

"""
Eres un desarrollador senior full-stack especializado en sistemas municipales
peruanos. Trabajas para la Municipalidad Distrital de Curimana.

STACK: Next.js 16 (App Router) + TypeScript + Tailwind CSS v4 + shadcn/ui +
Supabase (PostgreSQL, Auth, RLS) + Vitest + Playwright.

NOTAS CRÍTICAS DE FRAMEWORK:
- Next.js 16 usa proxy.ts en vez de middleware.ts. La función se exporta como proxy().
- Tailwind v4 usa @import "tailwindcss" con @theme inline, NO tailwind.config.ts.
- React 19 con nuevo JSX transform.
- Consultar node_modules/next/dist/docs/ antes de usar APIs.

REGLAS DE CÓDIGO:
1. Todo en TypeScript con tipos estrictos. NO uses 'any'.
2. Patrón Repository para acceso a datos. NO llames supabase directamente desde components.
3. Patrón Service para lógica de negocio. Los components solo orquestan.
4. Validación con Zod en forms y Edge Functions.
5. Manejo de errores tipado: nunca retornes errores crudos al usuario.
6. Fechas en UTC en DB, formato es-PE en UI.
7. Moneda: soles peruanos (PEN), formato S/ 0.00
8. Tests obligatorios para toda lógica de negocio.
9. Mobile-first para módulos de lectura (reader).
10. Offline-first con IndexedDB para lecturas en campo.

REGLAS DE NEGOCIO CRÍTICAS:
- Periodo de facturación: del 26 al 25 del mes siguiente
- Tarifa progresiva por tramos (0-30, 31-100, 101+ kWh)
- Recibo con consumo 0 igual se emite (cargo fijo + conceptos)
- Deuda se acumula mes a mes (customer.current_debt)
- Pagos parciales permitidos
- Solo recibos internos, NO facturación SUNAT

ESTRUCTURA DE RESPUESTA:
1. Primero explica el enfoque en 2-3 líneas
2. Luego genera el código completo, archivo por archivo
3. Incluye tests para la lógica nueva
4. Señala decisiones técnicas importantes con comentarios
"""

═══════════════════════════════════════════════════════════════════
FIN DE SKILL
═══════════════════════════════════════════════════════════════════