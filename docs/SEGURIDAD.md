# 🔐 Modelo de Seguridad y Acceso — Curimana Eléctrica

El sistema implementa un modelo de seguridad multi-capa para proteger la información financiera y operativa de la municipalidad, asegurando que cada rol acceda exclusivamente a las funciones autorizadas.

---

## 🚦 Roles del Sistema y Matriz de Acceso

El sistema clasifica a los usuarios en tres roles distintos mapeados en la tabla `profiles`. La protección de las interfaces se realiza a través de rutas protegidas:

| Rol | Ruta Base | Permisos Operativos |
|-----|-----------|---------------------|
| **Administrador** (`admin`) | `/admin/*` | Acceso completo. Configuración de tarifas, conceptos de cobro, creación de periodos de facturación, emisión de recibos, revisión de bitácoras de auditoría e inactivación de clientes. |
| **Cajero** (`cashier`) | `/cashier/*` | Ventanilla de cobro. Apertura y cierre de caja, búsqueda de clientes, registro de cobros parciales y totales de recibos, y emisión de constancias de pago. |
| **Lector** (`meter_reader`) | `/reader/*` | Toma de lecturas. Acceso a la lista de clientes únicamente de su sector asignado, registro de lecturas mensuales (online/offline) y carga de fotografías del medidor. |

---

## 🛡️ Middleware Proxy (`src/proxy.ts`)

Para proteger las rutas a nivel de servidor (Edge Middleware) antes de cargar cualquier página o componente de Next.js, se implementa el archivo `src/proxy.ts` (Next.js 16):

1. **Verificación de Sesión**: Valida si el usuario está autenticado con Supabase Auth. Si no lo está, lo redirige inmediatamente a `/login` limpiando cualquier cookie residual.
2. **Obtención y Caché del Rol**:
   - Para no saturar el servidor de base de datos con una consulta RPC en cada recurso solicitado (CSS, imágenes, navegación), el rol se cachea en una cookie encriptada (`ROLE_COOKIE`).
   - La cookie se firma digitalmente utilizando un hash vinculado al `user.id`. Al ingresar a una ruta, el middleware desencripta la cookie y verifica que coincida con el ID del usuario en sesión.
   - Si la cookie expira o no existe, se realiza una llamada a la función SQL `get_user_role()` y se vuelve a almacenar en caché por 1 hora (`3600s`).
3. **Escudo de Rutas (Route Guard)**:
   - Rutas `/admin/*` rebotan a `/` si el rol desencriptado no es `admin`.
   - Rutas `/cashier/*` rebotan a `/` si el rol no es `admin` o `cashier`.
   - Rutas `/reader/*` rebotan a `/` si el rol no es `admin` o `meter_reader`.

---

## 🗄️ Row Level Security (RLS) en PostgreSQL

Todas las tablas de la base de datos tienen habilitado **Row Level Security (RLS)** de manera obligatoria. Las políticas se dividen minuciosamente por tipo de operación para evitar sobrecarga y recursión:

### Optimización de Consultas de Políticas
- La función `get_user_role()` está marcada como `STABLE SECURITY DEFINER`. Al ser `STABLE`, PostgreSQL evalúa la función una sola vez por sentencia y almacena el resultado en caché, lo cual acelera drásticamente las consultas en lotes sobre tablas grandes como `receipts` y `payments`.
- Se evitan las políticas genéricas `ALL`. En su lugar, se crean políticas individuales para `SELECT`, `INSERT`, `UPDATE` y `DELETE` para afinar los permisos de escritura.

### Políticas Críticas Aplicadas
- **`profiles`**: Un usuario solo puede modificar su propio perfil, y no puede alterar su campo `role` ni su sector asignado.
- **`customers`**: Los cajeros leen todos los clientes. Los lectores solo pueden leer los clientes cuyo campo `sector_id` coincida con el sector que tienen asignado en su perfil (`get_user_sector_id()`).
- **`readings`**: Los lectores solo pueden insertar lecturas cuyos suministros correspondan a su sector asignado, y solo pueden modificar registros creados por su propio ID (`meter_reader_id = auth.uid()`).
- **`audit_logs`**: Solo los administradores tienen permiso de lectura (`SELECT`). Las escrituras (`INSERT`) están permitidas para el sistema al auditar operaciones, pero las políticas de `UPDATE` y `DELETE` están configuradas en `USING (false)`, garantizando una bitácora inmutable que nadie puede adulterar ni eliminar.

---

## 🔒 Seguridad en Funciones de Transacción

Para evitar que usuarios maliciosos ejecuten comandos financieros de forma directa a través de la consola de la API de Supabase, se aplican estrictas medidas de seguridad a nivel de base de datos:

1. **Privilegios de Ejecución Revocados**:
   Las funciones críticas como `process_payment`, `void_payment` y `generate_period_receipts` revocan explícitamente los permisos para los roles públicos (`public`) y anónimos (`anon`):
   ```sql
   REVOKE EXECUTE ON FUNCTION public.process_payment(...) FROM anon, public;
   GRANT EXECUTE ON FUNCTION public.process_payment(...) TO authenticated;
   ```
2. **Validación de Roles Internos**:
   Dentro de la lógica de cada función PL/pgSQL, se consulta el rol del usuario que invoca la función mediante `auth.uid()` y se aborta la transacción si no cuenta con el nivel necesario, bloqueando suplantaciones:
   ```sql
   SELECT role INTO v_user_role FROM profiles WHERE id = auth.uid();
   IF v_user_role NOT IN ('admin', 'cashier') THEN
     RAISE EXCEPTION 'Permiso denegado';
   END IF;
   ```

---

## 📷 Seguridad del Almacenamiento (Storage Buckets)

Las fotografías de los medidores tomadas en campo se guardan en el bucket de Supabase Storage `reading-photos`:
- **Público**: El bucket está marcado como público para facilitar el renderizado de imágenes de auditoría mediante URLs firmadas.
- **Políticas de Carga**: Solo usuarios autenticados con rol `admin` o `meter_reader` pueden subir archivos al bucket (`INSERT`).
- **Políticas de Modificación y Borrado**: El borrado (`DELETE`) y la actualización (`UPDATE`) de imágenes existentes están restringidos exclusivamente al rol `admin`, evitando que un lecturista elimine o reemplace evidencias de lectura anteriores.
