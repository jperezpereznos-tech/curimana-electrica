# 🗄️ Diseño de Base de Datos — Curimana Eléctrica

El sistema utiliza **Supabase PostgreSQL** como motor de base de datos. Se implementa un esquema robusto que incluye integridad referencial estricta, restricciones a nivel de base de datos (`CHECK constraints`), índices de alto rendimiento y políticas de seguridad RLS.

---

## 📊 Modelo de Datos (15 Tablas)

El esquema consta de 15 tablas organizadas para gestionar usuarios, tarifas, clientes, lecturas, facturación y auditoría.

| Tabla | Clave Primaria | Relaciones (FK) | Descripción |
|-------|----------------|-----------------|-------------|
| **`roles`** | `id` (TEXT) | — | Contiene los roles del sistema: `admin`, `cashier`, `meter_reader`. |
| **`sectors`** | `id` (UUID) | — | Sectores o zonas geográficas de distribución eléctrica del distrito. |
| **`profiles`** | `id` (UUID) | `id` ➔ `auth.users(id)`<br>`role` ➔ `roles(id)`<br>`assigned_sector_id` ➔ `sectors(id)` | Información de perfil de los empleados conectada con la autenticación. |
| **`municipality_config`** | `id` (UUID) | — | Configuración de la Municipalidad (RUC, dirección, día de corte, etc.). |
| **`tariffs`** | `id` (UUID) | — | Catálogo de tarifas eléctricas (ej. BT5B Monofásico, BT5B Trifásico). |
| **`tariff_tiers`** | `id` (UUID) | `tariff_id` ➔ `tariffs(id)` | Tramos de consumo (min_kwh, max_kwh) y precio por kWh para cada tarifa. |
| **`tariff_tier_history`** | `id` (UUID) | — | Historial de auditoría y respaldo de precios históricos de tramos tarifarios. |
| **`billing_concepts`** | `id` (UUID) | `applies_to_tariff_id` ➔ `tariffs(id)` | Conceptos de facturación fijos, porcentuales o por kWh (ej. Cargo Fijo, AP). |
| **`customers`** | `id` (UUID) | `sector_id` ➔ `sectors(id)`<br>`tariff_id` ➔ `tariffs(id)` | Suministros eléctricos de los abonados (contiene número de suministro y deuda). |
| **`billing_periods`** | `id` (UUID) | — | Periodos de facturación mensuales (ej. Mayo 2026). Únicos por año-mes. |
| **`readings`** | `id` (UUID) | `customer_id` ➔ `customers(id)`<br>`billing_period_id` ➔ `billing_periods(id)`<br>`meter_reader_id` ➔ `profiles(id)` | Lectura mensual de medidores ingresada por el lecturista. |
| **`receipts`** | `id` (UUID) | `customer_id` ➔ `customers(id)`<br>`reading_id` ➔ `readings(id)`<br>`billing_period_id` ➔ `billing_periods(id)` | Recibos mensuales generados. Incluyen número correlativo y desglose de cobro. |
| **`cash_closures`** | `id` (UUID) | `cashier_id` ➔ `profiles(id)` | Cierres de caja diarios por cajero para control de recaudación. |
| **`payments`** | `id` (UUID) | `receipt_id` ➔ `receipts(id)`<br>`customer_id` ➔ `customers(id)`<br>`cashier_id` ➔ `profiles(id)`<br>`cash_closure_id` ➔ `cash_closures(id)` | Transacciones de pago realizadas contra recibos pendientes. |
| **`audit_logs`** | `id` (UUID) | — | Registro inmutable de auditoría para operaciones críticas. |

---

## 🔒 Reglas de Integridad (CHECK Constraints)

Se definen más de 20 restricciones `CHECK` para garantizar que la base de datos no acepte importes negativos o inconsistentes bajo ninguna circunstancia:

1. **Tarifas y Tramos**:
   - `tariff_tiers.price_per_kwh >= 0` — El precio por kWh no puede ser negativo.
   - `tariff_tiers.min_kwh < tariff_tiers.max_kwh OR tariff_tiers.max_kwh IS NULL` — El límite inferior de un tramo debe ser menor al superior.
2. **Conceptos de Facturación**:
   - `billing_concepts.amount >= 0` — El costo unitario o porcentaje del concepto no puede ser negativo.
   - `billing_concepts.type IN ('fixed', 'percentage', 'per_kwh')` — Tipos permitidos para la fórmula de desglose.
3. **Clientes**:
   - `customers.current_debt >= 0` — La deuda del cliente no puede ser negativa (evita saldos acreedores erróneos).
   - `customers.connection_type IN ('monofásico', 'trifásico')` — Modos de conexión eléctrica válidos.
4. **Periodos**:
   - `billing_periods.month >= 1 AND billing_periods.month <= 12` — Rango de meses válido.
   - `billing_periods.start_date < billing_periods.end_date` — Consistencia de fechas del periodo.
5. **Lecturas**:
   - `readings.previous_reading >= 0` y `readings.current_reading >= 0` — Las lecturas del medidor deben ser positivas.
   - `readings.consumption >= 0` — El consumo eléctrico neto no puede ser negativo (se fuerza a cero en reinicios de medidor).
6. **Recibos**:
   - `receipts.previous_reading >= 0` y `receipts.current_reading >= 0` — Lecturas históricas coherentes.
   - `receipts.consumption_kwh >= 0` — Consumo en el recibo no negativo.
   - `receipts.energy_amount >= 0` y `receipts.fixed_charges >= 0` — Desglose de importes mayor o igual a cero.
   - `receipts.subtotal >= 0` y `receipts.total_amount >= 0` — Importes totales mayores o iguales a cero.
   - `receipts.paid_amount >= 0` — Monto cobrado no negativo.
7. **Pagos y Caja**:
   - `payments.amount > 0` — El monto pagado en una transacción debe ser estrictamente positivo.
   - `payments.received_amount >= 0` y `payments.change_amount >= 0` — Dinero recibido e vuelto no negativos.
   - `cash_closures.opening_amount >= 0` y `cash_closures.total_collected >= 0` — Importes de control de caja positivos.

---

## ⚙️ Funciones Almacenadas y RPC (17 Funciones)

La lógica transaccional sensible corre directamente dentro del motor PostgreSQL mediante funciones PL/pgSQL marcadas con `SECURITY DEFINER` (para ejecutarse con privilegios elevados de manera controlada) y `search_path = public` fijado por seguridad:

### 🌟 Funciones Críticas de Transacción e Integridad

#### 1. `process_payment`
Registra un pago de forma atómica, actualiza el estado del recibo y descuenta la deuda del cliente.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.process_payment(
    p_receipt_id UUID, p_customer_id UUID, p_cash_closure_id UUID,
    p_amount NUMERIC, p_received_amount NUMERIC, p_change_amount NUMERIC,
    p_cashier_id UUID
  ) RETURNS UUID
  ```
- **Lógica**: Bloquea el recibo (`FOR UPDATE`) y el cierre de caja, valida que el saldo no exceda la deuda, inserta el registro en `payments`, actualiza el estado del recibo (`paid` o `partial`), y reduce la deuda en `customers`.

#### 2. `void_payment`
Anula un pago previamente registrado de forma segura.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.void_payment(p_payment_id UUID, p_user_id UUID DEFAULT NULL) RETURNS VOID
  ```
- **Lógica**: Cambia el estado del pago a `voided`, descuenta el cobro en el recibo asociado (pudiendo devolverlo a `pending` o `partial`), y reestablece la deuda en el cliente.

#### 3. `generate_period_receipts`
Inserta en lote y de forma atómica todos los recibos de un periodo de facturación.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.generate_period_receipts(p_period_id UUID, p_receipts JSONB) RETURNS VOID
  ```
- **Lógica**: Recibe un array JSONB y realiza una inserción masiva a la tabla `receipts`, evitando round-trips HTTP.

### 📈 Funciones de Cálculo y Consultas

#### 4. `calculate_energy_amount`
Calcula el costo base de energía eléctrica aplicando el algoritmo de tramos tarifarios progresivos.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.calculate_energy_amount(p_consumption NUMERIC, p_tariff_id UUID) RETURNS NUMERIC STABLE
  ```
- **Lógica**: Marcada como `STABLE` para optimización de caché en consultas de múltiples filas. Suma los consumos correspondientes a cada tramo vigente de la tarifa.

#### 5. `get_dashboard_kpis`
Retorna en una sola llamada de red todos los datos analíticos para el panel de administración.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_dashboard_kpis() RETURNS JSONB STABLE
  ```
- **Lógica**: Retorna un objeto JSON con recaudación mensual, deuda activa, clientes activos, recibos pendientes, historial de facturación de 6 meses y distribución de consumo por sector. Reemplaza 5 consultas consecutivas.

#### 6. `get_session_total`
Calcula el acumulado de recaudación en la sesión abierta del cajero.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_session_total(p_cashier_id UUID, p_from TIMESTAMPTZ, p_cash_closure_id UUID DEFAULT NULL) RETURNS TABLE(total NUMERIC, count BIGINT) STABLE
  ```

#### 7. `adjust_customer_debt`
Ajusta la deuda acumulada del cliente de forma relativa.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.adjust_customer_debt(p_customer_id UUID, p_amount NUMERIC) RETURNS VOID
  ```

#### 8. `recalculate_customer_debt`
Recalcula la deuda total del cliente barriendo todos sus recibos no pagados.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.recalculate_customer_debt(p_customer_id UUID) RETURNS NUMERIC
  ```

#### 9. `get_user_role`
Retorna el rol del usuario autenticado actual.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_user_role() RETURNS text STABLE
  ```
- **Lógica**: Utilizada por las políticas RLS y el middleware `proxy.ts`. PostgreSQL almacena en caché el resultado dentro de la misma transacción para evitar lecturas repetidas de la tabla `profiles`.

#### 10. `current_role`
Alias de compatibilidad para consultar el rol.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public."current_role"() RETURNS text STABLE
  ```

#### 11. `get_user_sector_id`
Retorna el sector asignado al lecturista actual.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.get_user_sector_id() RETURNS UUID STABLE
  ```

#### 12. `close_billing_period`
Cierra el periodo de facturación de forma atómica garantizando que no pueda reabrirse o duplicarse la acción.
- **Firma**:
  ```sql
  CREATE OR REPLACE FUNCTION public.close_billing_period(p_period_id UUID) RETURNS TABLE(success BOOLEAN, period_id UUID)
  ```

### 🔔 Triggers de Auditoría y Automatización

#### 13. `handle_new_user`
Trigger automático (`AFTER INSERT` en `auth.users`) que crea un registro en `profiles` con el rol por defecto `meter_reader`.

#### 14. `log_tariff_tier_change`
Trigger automático (`AFTER INSERT OR UPDATE OR DELETE` en `tariff_tiers`) que registra la vigencia temporal y guarda una copia del tramo anterior en `tariff_tier_history` para mantener un historial auditable de precios de facturación.

#### 15. `update_updated_at`
Trigger genérico que actualiza la columna `updated_at` al modificar registros en `profiles`, `customers`, `receipts`, `tariffs` y `municipality_config`.

#### 16. `rls_auto_enable`
Event trigger del sistema que activa automáticamente RLS en cualquier tabla nueva creada.

---

## ⚡ Diseño de Índices de Rendimiento

El sistema cuenta con un catálogo de índices específicos para maximizar la velocidad de lectura e integridad:

### 1. Índices de Búsqueda de Clientes (Fuzzy Search)
Para acelerar las búsquedas por aproximación (`ILIKE`) en la ventanilla del cajero y la app del lecturista, se activa la extensión `pg_trgm` y se crean índices GIN trinitarios:
- `idx_customers_full_name_trgm` ON `customers` USING gin (full_name gin_trgm_ops)
- `idx_customers_address_trgm` ON `customers` USING gin (address gin_trgm_ops)
- `idx_customers_supply_number_trgm` ON `customers` USING gin (supply_number gin_trgm_ops)

### 2. Índices Compuestos
Diseñados para consultas de agregación y filtros comunes:
- `idx_receipts_period_status` ON `receipts(billing_period_id, status)` — Optimiza el filtrado de recibos por mes de cobranza.
- `idx_customers_active_sector_name` ON `customers(is_active, sector_id, full_name)` — Búsqueda de clientes activos por sector.
- `idx_payments_closure_status` ON `payments(cash_closure_id, status)` — Suma rápida de cobros por caja.

### 3. Índices Parciales
Indexan únicamente las filas que cumplen un criterio frecuente para mantener un tamaño de índice reducido en disco:
- `idx_readings_needs_review` ON `readings(needs_review) WHERE needs_review = true` — Permite al administrador ubicar velozmente lecturas observadas.
- `idx_receipts_due_date_status` ON `receipts(due_date, status) WHERE status IN ('pending', 'partial')` — Monitoreo rápido de recibos vencidos o próximos a vencer.
- `idx_billing_periods_is_closed` ON `billing_periods(year DESC, month DESC) WHERE is_closed = false` — Filtra de inmediato el periodo actualmente abierto para la toma de lecturas.
- `idx_payments_cashier_session` ON `payments(cashier_id, created_at DESC) INCLUDE (amount, status) WHERE status != 'voided'` — Cubre eficientemente la consulta `getSessionTotal`.
