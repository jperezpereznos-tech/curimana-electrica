# SKILL: Sistema Eléctrico Municipal - Curimana
## Versión: 1.0 | Stack: Next.js 15 + Supabase + Tailwind + PWA

═══════════════════════════════════════════════════════════════════
MODO DE USO:
1. Copia la FASE que corresponda como prompt en tu agente de código
2. Espera a que termine y REVISA el código generado
3. Ejecuta los tests de esa fase antes de continuar
4. Solo cuando todo pase, copia la siguiente FASE
═══════════════════════════════════════════════════════════════════

---

## FASE 0: SETUP INICIAL Y BASE DE DATOS
### Prompt para el agente:

"Eres un arquitecto de software senior. Genera el setup completo de un proyecto 
Next.js 15 con App Router, TypeScript, Tailwind CSS, shadcn/ui, y configuración 
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
   - next.config.js con PWA (next-pwa o serwist)
   - middleware.ts para protección de rutas por rol
   - .env.local.example con todas las variables necesarias
   - supabase/config.toml si aplica CLI
   - tailwind.config.ts con tema extendido (colores municipales)

3. Instalar dependencias:
   - supabase-js, @supabase/ssr
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

NO generes UI todavía. Solo estructura, config y utilidades."

### Checklist de verificación:
□ Proyecto corre con `npm run dev`
□ Tests corren con `npm run test`
□ Playwright instalado y configurado
□ Variables de entorno documentadas
□ PWA manifest generado

---

## FASE 1: SCHEMA SQL Y SUPABASE
### Prompt para el agente:

"Genera el schema SQL completo para Supabase PostgreSQL del Sistema Eléctrico 
Municipal de Curimana, basado en este diseño:

TABLAS REQUERIDAS:

1. municipality_config
   - id, ruc, name, address, logo_url, billing_cut_day (default 26), 
     payment_grace_days (default 20), created_at

2. roles (seed data)
   - admin, cashier, meter_reader

3. tariffs
   - id, name, connection_type ['monofásico','trifásico'], is_active, created_at

4. tariff_tiers
   - id, tariff_id, min_kwh, max_kwh, price_per_kwh, order_index

5. billing_concepts
   - id, code, name, description, amount, type ['fixed','percentage','per_kwh'],
     applies_to_tariff_id (nullable), is_active

6. customers
   - id, full_name, supply_number (UNIQUE), address, sector, tariff_id, 
     connection_type, phone, document_number, current_debt (default 0), 
     is_active, created_at, updated_at

7. billing_periods
   - id, name, year, month, start_date, end_date, is_closed, closed_at, created_at

8. readings
   - id, customer_id, billing_period_id, meter_reader_id, previous_reading, 
     current_reading, consumption, reading_date, photo_url, is_synced, sync_id, 
     notes, is_estimated (default false), created_at

9. receipts
   - id, receipt_number (BIGINT), customer_id, reading_id, billing_period_id,
     previous_reading, current_reading, consumption_kwh,
     energy_amount, fixed_charges, subtotal, previous_debt, total_amount,
     issue_date, due_date, period_start, period_end,
     status ['pending','paid','expired','cancelled'],
     paid_amount (default 0), paid_at, payment_id,
     created_at, updated_at

10. payments
    - id, receipt_id, customer_id, amount, method ['cash'], reference,
      cashier_id, payment_date, created_at

11. cash_closures
    - id, cashier_id, closure_date, opening_amount, total_collected,
      total_receipts, status ['open','closed'], closed_at, created_at

12. audit_logs
    - id, table_name, record_id, action, old_data (jsonb), new_data (jsonb),
      user_id, user_role, ip_address, created_at

REGLAS SQL:
- Todas las tablas deben tener created_at con default now()
- Foreign keys con ON DELETE RESTRICT donde aplique
- Índices para: supply_number, customer_id+status, billing_period_id, 
  meter_reader_id+reading_date, cashier_id+payment_date
- RLS policies básicas (admin = all, meter_reader = solo sus readings, 
  cashier = lectura clientes y escritura payments)
- Function SQL: calculate_energy_amount(consumption, tariff_id) que aplique 
  tramos progresivos
- Trigger: auto-generate billing_period dates basado en billing_cut_day
- Seed data: 1 municipalidad, 1 tarifa BTSB con 3 tramos reales, 6 conceptos 
  de cobro, 10 clientes de prueba, 1 periodo JUNIO 2025

Genera:
1. Archivo SQL único: `supabase/schema.sql`
2. Archivo seed: `supabase/seed.sql`
3. Types TypeScript generados: `src/types/database.ts` (manual o auto)
4. Repositorio base: `src/repositories/base.ts` con funciones CRUD genéricas"

### Checklist de verificación:
□ Schema ejecuta sin errores en Supabase
□ Seed data inserta correctamente
□ RLS policies aplicadas y testeadas
□ Function calculate_energy_amount devuelve valores correctos:
   - 30 kWh → 9.30
   - 50 kWh → 21.70 (30*0.31 + 20*0.62)
   - 120 kWh → 74.30 (30*0.31 + 70*0.62 + 20*0.64)

---

## FASE 2: AUTENTICACIÓN Y ROLES
### Prompt para el agente:

"Implementa el sistema de autenticación completo con Supabase Auth y roles.

REQUISITOS:
1. Auth UI:
   - Login page (/login) con email/password
   - Formulario con validación Zod
   - Manejo de errores (credenciales inválidas, usuario no confirmado)

2. Middleware:
   - Proteger rutas según rol:
     - /admin/* → solo admin
     - /cashier/* → admin + cashier
     - /reader/* → admin + meter_reader
   - Redirección automática al dashboard correspondiente según rol

3. Contexto de Auth:
   - AuthProvider con React Context
   - Hook useAuth() que exponga: user, role, isLoading, signOut
   - Datos de perfil extendido desde tabla users (vinculada a auth.users)

4. Layouts por rol:
   - AdminLayout: sidebar con navegación completa
   - CashierLayout: header simple, búsqueda prominente
   - ReaderLayout: UI mobile-first, botones grandes

5. Seed de usuarios de prueba:
   - admin@curimana.gob.pe / password
   - cashier@curimana.gob.pe / password  
   - reader@curimana.gob.pe / password

Genera tests unitarios para:
- Determinación de rutas permitidas por rol
- Formato de email institucional
- Redirecciones post-login"

### Checklist de verificación:
□ Login funciona con 3 roles diferentes
□ Acceso a /admin bloqueado para cashier y reader
□ useAuth() retorna rol correcto
□ Sign out limpia sesión y redirige a login
□ Tests unitarios pasan

---

## FASE 3: GESTIÓN DE CLIENTES Y TARIFAS (Admin)
### Prompt para el agente:

"Implementa los módulos de gestión de clientes y tarifas para administradores.

MÓDULO TARIFAS (/admin/tariffs):
1. Lista de tarifas con sus tramos
2. Formulario CRUD de tarifa:
   - Nombre, tipo de conexión
   - Tramos dinámicos (agregar/eliminar filas)
   - Validación: tramos no deben solaparse, min_kwh &lt; max_kwh
3. Activar/desactivar tarifa

MÓDULO CONCEPTOS (/admin/concepts):
1. Lista de conceptos de cobro
2. CRUD de conceptos:
   - Código, nombre, monto, tipo
   - Asignación opcional a tarifa específica

MÓDULO CLIENTES (/admin/customers):
1. Lista con búsqueda por: nombre, supply_number, sector
2. CRUD completo:
   - Datos personales + dirección + sector
   - Selector de tarifa (dropdown con tarifas activas)
   - Supply number: validación única, formato 9 dígitos
   - Indicador visual de deuda actual
3. Vista detalle del cliente:
   - Historial de lecturas
   - Historial de recibos
   - Historial de pagos

Genera:
- Repositories: tariffRepository, customerRepository, conceptRepository
- Services: tariffService (con validación de tramos), customerService
- Tests unitarios para validación de tramos solapados
- Tests de integración: crear cliente → asignar tarifa → verificar en DB"

### Checklist de verificación:
□ CRUD tarifas funciona con tramos múltiples
□ No permite tramos solapados
□ Cliente se crea con deuda 0
□ Búsqueda por supply_number funciona
□ Tests pasan

---

## FASE 4: PERIODOS Y LECTURAS (Mobile-First)
### Prompt para el agente:

"Implementa la gestión de periodos de facturación y lecturas de medidores.

MÓDULO PERIODOS (/admin/periods):
1. Lista de periodos con estado (abierto/cerrado)
2. Crear nuevo periodo:
   - Auto-calcula fechas basado en billing_cut_day (26)
   - Ej: si corte es 26, periodo = 26/mes_anterior a 25/mes_actual
   - Nombre auto: 'JUNIO 2025'
3. Cerrar periodo:
   - Botón 'Cerrar y generar recibos'
   - Llama a Edge Function que:
     a. Genera recibo para cada cliente activo
     b. Calcula consumo, energía por tramos, conceptos fijos
     c. Acumula deuda anterior
     d. Asigna número de recibo secuencial
   - Marca periodo como cerrado

MÓDULO LECTURAS - MOBILE (/reader):
1. Dashboard del lector:
   - Periodo actual abierto
   - Contador: lecturas realizadas / total asignadas
   - Lista de clientes pendientes (sector o ruta)

2. Formulario de lectura (UI mobile-first):
   - Input grande para supply_number (con scan simulado o teclado numérico)
   - Al buscar: muestra datos del cliente + lectura anterior
   - Input de lectura actual (numérico grande)
   - Cálculo automático de consumo
   - Validación: si current &lt; previous → modal de alerta con opciones
   - Botón de foto (simulado con file input, guardar en Storage)
   - Botón GUARDAR prominente
   - Indicador de sync (verde/amarillo/rojo)

3. Offline con IndexedDB (Dexie):
   - Schema local:
     pending_readings: id, customer_id, supply_number, previous_reading, 
       current_reading, consumption, reading_date, photo_base64, notes, 
       status ['pending','syncing','failed'], created_at, retries
     customers_cache: id, supply_number, full_name, address, sector, 
       tariff_id, previous_reading
   - Sync automático: cuando online, intenta enviar cola cada 30 segundos
   - Sync manual: botón 'Sincronizar ahora'
   - Resolución de conflictos: si servidor ya tiene lectura, mantener 
     la más reciente, marcar ambas para revisión

Genera:
- Edge Function: `generate-receipts` (Deno/TypeScript)
- Service: readingService con validaciones de negocio
- Repository: readingRepository, periodRepository
- Hook: useOfflineSync()
- Tests: cálculo de consumo, validación current&lt;previous, sync offline"

### Checklist de verificación:
□ Periodo se crea con fechas correctas (26 al 25)
□ Cierre de periodo genera recibos para todos los clientes
□ Recibo con consumo 0 tiene cargo fijo + alumbrado &gt; 0
□ Lectura offline se guarda en IndexedDB
□ Sync envía datos al servidor
□ Conflicto de lectura duplicada se maneja correctamente
□ Tests de Edge Function pasan

---

## FASE 5: RECIBOS Y FACTURACIÓN
### Prompt para el agente:

"Implementa el módulo de recibos y generación de PDF.

MÓDULO RECIBOS (/admin/receipts, /cashier/receipts):
1. Lista de recibos con filtros:
   - Por periodo
   - Por estado (pending, paid, expired, cancelled)
   - Por supply_number o nombre de cliente
2. Vista detalle de recibo:
   - Datos del cliente
   - Periodo facturado
   - Lecturas (anterior/actual/consumo)
   - Desglose: energía por tramos, conceptos fijos, subtotal
   - Deuda anterior, total a pagar
   - Fecha de emisión, fecha de vencimiento
   - Estado actual

3. Generación de PDF:
   - Diseño similar al recibo físico de Curimana:
     - Logo municipal (placeholder)
     - RUC, nombre municipalidad
     - N° Suministro destacado
     - Mes facturado
     - Tabla de conceptos e importes
     - Subtotal, deudas anteriores, total
     - Fecha emisión, último día de pago
     - Mensaje: 'Si usted ya pagó, omita este recibo'
   - Librería: jspdf + jspdf-autotable
   - Descarga directa desde navegador

4. Acciones:
   - Imprimir/PDF
   - Cancelar recibo (admin only, con motivo)
   - Ver historial de pagos del recibo

Genera:
- Service: receiptService (cálculo completo de recibo)
- Service: pdfService (generación de PDF)
- Componente: ReceiptPDFViewer
- Tests unitarios:
  - Cálculo de recibo con 50 kWh (verificar tramos)
  - Cálculo de recibo con 0 kWh (solo conceptos fijos)
  - Cálculo con deuda anterior
  - Formato de PDF generado correctamente"

### Checklist de verificación:
□ Recibo muestra desglose correcto de tramos
□ PDF se genera y descarga
□ Diseño se asemeja a recibo real de Curimana
□ Cancelación de recibo actualiza estado y audit log
□ Tests de cálculo pasan con precisión de decimales

---

## FASE 6: PAGOS EN CAJA Y CONTROL
### Prompt para el agente:

"Implementa el módulo de cobros en ventanilla y control de caja.

MÓDULO CAJERO (/cashier):
1. Dashboard cajero:
   - Búsqueda prominente: input grande para supply_number
   - Resultado rápido: nombre, dirección, deuda total
   - Lista de recibos pendientes del cliente

2. Pago de recibo:
   - Seleccionar recibo(s) a pagar
   - Mostrar: subtotal, deuda, total
   - Input de monto recibido
   - Cálculo automático de vuelto
   - Método: efectivo (default)
   - Referencia: opcional (número de operación)
   - Botón 'Registrar pago'

3. Pago parcial:
   - Si monto &lt; total: confirmar pago parcial
   - Actualizar recibo: status sigue 'pending', paid_amount aumenta
   - Actualizar cliente: current_debt se reduce
   - Generar comprobante de pago (PDF simple)

4. Comprobante de pago:
   - Número de operación
   - Fecha/hora
   - Cajero
   - Recibo(s) pagados
   - Montos
   - Firma/sello placeholder

MÓDULO CIERRE DE CAJA (/cashier/closure):
1. Apertura: registrar monto inicial
2. Durante el día: acumulación automática de cobros
3. Cierre:
   - Resumen: total recaudado, cantidad recibos, cantidad pagos parciales
   - Detalle por concepto
   - Confirmar cierre
   - Generar reporte PDF del cierre

Genera:
- Service: paymentService (con manejo de deuda)
- Service: cashClosureService
- Repository: paymentRepository
- Tests:
  - Pago total cambia estado a 'paid'
  - Pago parcial reduce deuda pero mantiene 'pending'
  - Cierre de caja cuadra correctamente
  - No permitir pago sobre recibo cancelado"

### Checklist de verificación:
□ Búsqueda por supply_number funciona en &lt; 500ms
□ Pago total actualiza recibo y deuda del cliente
□ Pago parcial funciona correctamente
□ Cierre de caja genera reporte
□ Audit log registra todo pago
□ Tests de integración pasan

---

## FASE 7: DASHBOARD ADMIN Y REPORTES
### Prompt para el agente:

"Implementa el dashboard administrativo con KPIs y gráficos.

DASHBOARD (/admin):
1. KPIs en cards:
   - Recaudación mes actual (S/ X.XX)
   - Deuda total pendiente (S/ X.XX)
   - Total clientes activos
   - Recibos pendientes del periodo actual
   - Recibos vencidos
   - Lecturas pendientes

2. Gráficos (Recharts):
   - Barras: recaudación por periodo (últimos 12 meses)
   - Líneas: consumo promedio por sector
   - Torta: distribución de estados de recibos (pending/paid/expired)
   - Área: evolución de deuda total

3. Tablas:
   - Top 10 deudores (clientes con mayor current_debt)
   - Últimos pagos registrados
   - Lecturas del día

4. Reportes descargables:
   - Recaudación por periodo (CSV)
   - Clientes morosos (CSV)
   - Resumen de lecturas por lector (CSV)

Genera:
- Service: dashboardService (queries agregadas)
- Componentes reutilizables: KPICard, ChartContainer, DataTable
- Tests: verificar cálculos de agregación"

### Checklist de verificación:
□ KPIs muestran datos reales de la base
□ Gráficos renderizan correctamente
□ CSV se descarga con datos correctos
□ Performance: dashboard carga en &lt; 2 segundos

---

## FASE 8: TESTING E2E Y PWA
### Prompt para el agente:

"Implementa la suite completa de testing y finaliza PWA.

TESTS E2E (Playwright):
1. Login flow:
   - Login admin → redirección a /admin
   - Login cashier → redirección a /cashier
   - Login reader → redirección a /reader
   - Login inválido → mensaje de error

2. Flujo completo de negocio:
   - Admin crea cliente con tarifa BTSB
   - Reader registra lectura de 50 kWh
   - Admin cierra periodo → genera recibo
   - Cashier busca recibo y paga total
   - Verificar: recibo status='paid', cliente debt=0

3. Flujo mobile lecturista:
   - Emular viewport móvil (375x812)
   - Reader registra lectura offline
   - Verificar IndexedDB tiene registro
   - Simular conexión → sync automático
   - Verificar en base de datos

PWA:
1. Service Worker con estrategia:
   - Cache-first para assets estáticos
   - Network-first para API calls
   - Offline page cuando no hay conexión
2. Manifest.json:
   - Nombre: 'Curimana Eléctrica'
   - Íconos (placeholder)
   - Theme color #0066cc
   - Display: standalone
3. Instalación:
   - Prompt de instalación en dispositivos móviles

Genera:
- playwright.config.ts
- tests/e2e/ con los 3 escenarios
- public/sw.js o workbox config
- public/manifest.json"

### Checklist de verificación:
□ Tests E2E pasan en CI/local
□ PWA instala en móvil
□ App funciona offline (muestra página de cache)
□ Lecturas offline funcionan en móvil real

---

## FASE 9: SEGURIDAD, AUDITORÍA Y DEPLOYMENT
### Prompt para el agente:

"Finaliza seguridad, auditoría y prepara para producción.

SEGURIDAD:
1. Revisar y completar RLS en todas las tablas
2. Validación de inputs en Edge Functions (Zod)
3. Sanitización de datos (prevenir XSS)
4. Rate limiting en endpoints críticos (Supabase Edge Function level)
5. Headers de seguridad en Next.js

AUDITORÍA:
1. Trigger/Edge Function para audit_logs en:
   - INSERT/UPDATE/DELETE de payments
   - UPDATE de receipts (cambio de estado)
   - DELETE de readings (no debería permitirse, solo soft delete)
2. Vista de audit logs para admin (/admin/audit)
   - Filtros por tabla, usuario, fecha
   - Diff visual de cambios

DEPLOYMENT:
1. README.md completo:
   - Requisitos previos
   - Instalación local paso a paso
   - Configuración de Supabase
   - Variables de entorno
   - Comandos de desarrollo
   - Comandos de test
   - Guía de deployment en Vercel

2. Scripts útiles:
   - npm run db:reset (resetear schema local)
   - npm run db:seed (cargar datos de prueba)
   - npm run test:unit
   - npm run test:e2e

Genera:
- Documentación completa
- Config de producción
- Checklist de seguridad"

### Checklist de verificación:
□ RLS funciona (probar con usuario de cada rol)
□ Audit logs registran pagos y cambios de estado
□ README permite a un dev nuevo levantar el proyecto en &lt; 15 min
□ App deploya en Vercel sin errores

---

## PROMPT DE SISTEMA (para usar con agentes de código)

Copia esto como 'System Prompt' o contexto persistente:

"""
Eres un desarrollador senior full-stack especializado en sistemas municipales 
peruanos. Trabajas para la Municipalidad Distrital de Curimana.

STACK: Next.js 15 (App Router) + TypeScript + Tailwind CSS + shadcn/ui + 
Supabase (PostgreSQL, Auth, Edge Functions) + Vitest + Playwright.

REGLAS DE CÓDIGO:
1. Todo en TypeScript con tipos estrictos. NO uses 'any'.
2. Patrón Repository para acceso a datos. NO llames supabase directamente desde components.
3. Patrón Service para lógica de negocio. Los components solo orquestan.
4. Validación con Zod en forms y Edge Functions.
5. Manejo de errores tipado: nunca retornes errores crudos al usuario.
6. Fechas en UTC en DB, formato es-PE en UI.
7. Moneda: soles peruanos (PEN), formato S/ 0.00
8. Tests obligatorios para toda lógica de negocio (cálculos, validaciones).
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