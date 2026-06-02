# 📱 Funcionamiento Offline y PWA — Curimana Eléctrica

El módulo del Lector de Medidores está diseñado bajo un paradigma **Offline-First**. Dado que los lecturistas recorren zonas geográficas de Curimana con conectividad nula o inestable, el sistema permite registrar lecturas de forma 100% local, y sincronizarlas de manera automática una vez que se restablece la conexión.

---

## 🗄️ Base de Datos Local (IndexedDB via Dexie.js)

El almacenamiento en el navegador se gestiona con **Dexie.js** (un wrapper amigable sobre la API nativa de IndexedDB). La base de datos local se denomina `CurimanaDB` y cuenta con dos tablas principales definidas en `src/lib/db/dexie.ts`:

### 1. `customers_cache`
Almacena la lista de suministros asignados al sector del lecturista para permitir la búsqueda offline.
- **Índice de la Tabla**: `id, supply_number, sector, sector_id, full_name`
- **Campos**:
  - `id` (UUID): Identificador único del cliente.
  - `supply_number` (TEXT): Número de suministro (código del medidor).
  - `full_name` (TEXT): Nombre completo del abonado.
  - `address` (TEXT): Dirección del suministro.
  - `sector_id` (UUID) y `sector` (TEXT): Sector asignado.
  - `tariff_id` (UUID): Tarifa contratada.
  - `previous_reading` (NUMERIC): Última lectura registrada (base para calcular el nuevo consumo).
  - `last_updated` (TIMESTAMP): Registro de control para sincronización de caché.

### 2. `pending_readings`
Guarda las lecturas tomadas en campo que aún no se han enviado al servidor de Supabase.
- **Índice de la Tabla**: `++id, customer_id, supply_number, status, sector_id, reading_date`
- **Campos**:
  - `id` (Autoincremental): Clave primaria local.
  - `customer_id` (UUID): Referencia al cliente.
  - `previous_reading` y `current_reading` (NUMERIC): Lectura anterior y actual registrada.
  - `reading_date` (TEXT): Fecha del registro.
  - `notes` (TEXT): Observaciones ingresadas por el lector.
  - `status` (TEXT): Estado local (`pending` | `syncing` | `failed`).
  - `needs_review` (BOOLEAN): Bandera que indica anomalía (ej. lectura menor a la anterior).
  - `retry_count` (INTEGER): Número de intentos de envío fallidos.
  - `last_attempt_time` (TIMESTAMP): Hora del último intento de sincronización.

---

## 🔄 El Motor de Sincronización (`useOfflineSync`)

El hook `src/hooks/use-offline-sync.ts` coordina el flujo de sincronización en segundo plano y la monitorización de red.

### 1. Detección de Estado de Red
El hook escucha los eventos `online` y `offline` de la ventana del navegador. Al pasar al estado online, se gatilla inmediatamente una sincronización forzada (`syncNow()`).

### 2. Sincronización Automática e Intervalos (Backoff Exponencial)
El sistema corre un hilo de sincronización automática en segundo plano. Para evitar saturar el servidor o agotar la batería del dispositivo móvil en zonas de señal intermitente, implementa un algoritmo de **Backoff Exponencial**:
- **Frecuencia Base**: Si no hay errores, se intenta sincronizar cada **30 segundos** (`AUTO_SYNC_BASE_MS`).
- **Multiplicador**: Si ocurre un error de red o timeout, el intervalo se duplica (`BACKOFF_MULTIPLIER = 2`) en el siguiente intento.
- **Límite Máximo**: El intervalo de espera máximo se limita a **5 minutos** (`300,000ms`), evitando que la espera crezca indefinidamente.
- **Reinicio**: Cualquier intento exitoso limpia el contador de errores consecutivos y restablece la frecuencia base a 30s.

### 3. Control de Reintentos y Lecturas Observadas
- **Límite de Reintentos**: Cada lectura local cuenta con un atributo `retry_count`. Si falla más de **5 veces** (`MAX_RETRIES`), se clasifica como *exhausta* y se detienen los reintentos automáticos para no bloquear la cola de sincronización.
- **Detección de Duplicados**: Si el servidor responde que la lectura ya existe en su base de datos (`DUPLICATE_READING`), la sincronización la considera resuelta y elimina el registro de IndexedDB inmediatamente, evitando bucles de reintento redundantes.
- **Lectura Menor (Reinicio de Medidor)**: Si la lectura ingresada es menor que la anterior, se calcula un consumo neto de cero y se marca localmente con `needs_review: true`. Al sincronizar, PostgreSQL la recibe y la almacena con la bandera activada para revisión manual por parte del administrador.

---

## 🔒 Flujo de Cierre de Sesión Seguro (`syncAndSignOut`)

Para evitar que un lecturista pierda datos acumulados en su dispositivo al cerrar sesión, el sistema restringe el logout directo si existen lecturas pendientes de sincronizar:

1. Al presionar "Cerrar Sesión", el sistema invoca la función `syncAndSignOut()` en `src/hooks/use-auth.tsx`.
2. Se intenta realizar una sincronización de emergencia instantánea de todos los registros en `pending_readings`.
3. Si el envío es exitoso, la sesión se cierra de manera ordinaria y se limpia la base de datos Dexie.
4. Si la sincronización falla debido a la falta total de internet:
   - Se despliega una advertencia crítica al usuario informándole que tiene lecturas sin sincronizar localmente.
   - El sistema aborta el cierre de sesión, manteniendo las lecturas a salvo en IndexedDB hasta que se recupere la señal y puedan enviarse.
