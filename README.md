# Sistema Eléctrico Municipal - Curimana

Sistema integral para la gestión de facturación, recaudación y lectura de medidores del distrito de Curimana.

## 🚀 Tecnologías
- **Frontend:** Next.js 15 (App Router), TypeScript, Tailwind CSS, shadcn/ui.
- **Backend:** Supabase (Auth, PostgreSQL, Storage).
- **Offline:** Dexie.js (IndexedDB) para modo offline de lecturistas.
- **Reportes:** jsPDF (Recibos), Recharts (Dashboard Admin), CSV (Exportaciones).

## 🛠️ Configuración Local

1.  **Clonar el repositorio:**
    ```bash
    git clone https://github.com/tu-usuario/curimana-electrica.git
    cd curimana-electrica
    ```

2.  **Instalar dependencias:**
    ```bash
    npm install
    ```

3.  **Variables de Entorno:**
    Crea un archivo `.env.local` basado en `.env.local.example`:
    ```env
    NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
    NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon
    ```

4.  **Base de Datos:**
    - Ejecuta el contenido de `supabase/schema.sql` en el Editor SQL de Supabase.
    - Ejecuta `supabase/seed.sql` para cargar los datos iniciales (tarifas, clientes, usuarios).

5.  **Correr proyecto:**
    ```bash
    npm run dev
    ```

## 🧪 Testing

- **Tests Unitarios:** `npm run test`
- **Tests E2E:** `npx playwright test`

## 🔐 Seguridad y Auditoría
- El sistema utiliza **RLS (Row Level Security)** para asegurar que cada rol (Admin, Cajero, Lector) solo acceda a los datos permitidos.
- Todas las transacciones financieras se registran en la **Bitácora de Auditoría** accesible desde el panel de administración.

## 📱 PWA
La aplicación es instalable en dispositivos móviles y permite a los lecturistas trabajar sin conexión a internet. Los datos se sincronizarán automáticamente al recuperar la red.

---
© 2026 Municipalidad Distrital de Curimana
