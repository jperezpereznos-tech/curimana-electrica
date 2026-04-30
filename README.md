# ⚡ Sistema Eléctrico Municipal — Curimana

Sistema integral para la gestión de facturación, recaudación y lectura de medidores del servicio eléctrico del distrito de Curimana, Ucayali, Perú.

## 🚀 Tecnologías

| Capa | Tecnología | Versión |
|------|-----------|---------|
| **Framework** | Next.js (App Router) | 16.2.4 |
| **UI** | React | 19.2.4 |
| **Lenguaje** | TypeScript | Estricto |
| **Estilos** | Tailwind CSS v4 + shadcn/ui (base-nova) | v4 |
| **Backend** | Supabase (Auth, PostgreSQL, Storage, RLS) | — |
| **Offline** | Dexie.js (IndexedDB) | 4.x |
| **Reportes** | jsPDF + jspdf-autotable | — |
| **Gráficos** | Recharts | 3.x |
| **Testing** | Vitest + Playwright | — |
| **Deploy** | Vercel | Auto desde GitHub |

## 📐 Arquitectura

```
┌─────────────────────────────────────────────────┐
│                   FRONTEND                       │
│  Next.js 16 App Router (Server + Client)        │
│  ├── /admin    → Panel administrativo            │
│  ├── /cashier  → Ventanilla de cobros           │
│  ├── /reader   → Lecturas (mobile-first, PWA)   │
│  └── /login    → Autenticación                  │
├─────────────────────────────────────────────────┤
│  Services (12)  →  Repositories (10)            │
├─────────────────────────────────────────────────┤
│                   BACKEND                        │
│  Supabase: PostgreSQL + Auth + RLS + Storage    │
│  13 tablas, 3 funciones, 1 trigger              │
├─────────────────────────────────────────────────┤
│  OFFLINE: Dexie.js (IndexedDB) + Background Sync│
└─────────────────────────────────────────────────┘
```

### Roles del Sistema

| Rol | Acceso | Funciones principales |
|-----|--------|----------------------|
| **Admin** | `/admin/*` | Dashboard, gestión de clientes, tarifas, conceptos, periodos, recibos, auditoría, reportes |
| **Cajero** | `/cashier/*` | Búsqueda de clientes, cobros, pagos parciales, cierre de caja |
| **Lector** | `/reader/*` | Registro de lecturas, trabajo offline, sincronización |

## 🛠️ Configuración Local

### Prerrequisitos
- Node.js 18+ 
- npm 9+
- Cuenta en [Supabase](https://supabase.com)

### Instalación

```bash
# 1. Clonar el repositorio
git clone https://github.com/jperezpereznos-tech/curimana-electrica.git
cd curimana-electrica

# 2. Instalar dependencias
npm install

# 3. Variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus credenciales de Supabase
```

### Variables de Entorno

Crear `.env.local` con:
```env
NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_publica
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Base de Datos

1. Ve al [SQL Editor de Supabase](https://supabase.com/dashboard)
2. Ejecuta `supabase/schema.sql` — Crea tablas, funciones, trigger, índices y políticas RLS
3. Ejecuta `supabase/seed.sql` — Carga datos iniciales (roles, config municipal, tarifa, clientes de prueba)

### Crear usuario administrador

1. En Supabase Dashboard → **Authentication** → **Users** → **Add User**
2. Email: `admin@curimana.gob.pe` (o el que prefieras)
3. El trigger `on_auth_user_created` creará automáticamente el perfil
4. Ejecutar en SQL Editor:
   ```sql
   UPDATE profiles SET role = 'admin' WHERE email = 'admin@curimana.gob.pe';
   ```

### Ejecutar

```bash
# Servidor de desarrollo
npm run dev
# Abrir http://localhost:3000
```

## 📁 Estructura del Proyecto

```
src/
├── app/                        # Next.js App Router
│   ├── admin/                  # Panel administrativo
│   │   ├── page.tsx            # Dashboard con KPIs y gráficos
│   │   ├── customers/          # CRUD de clientes
│   │   ├── tariffs/            # Gestión de tarifas y tramos
│   │   ├── concepts/           # Conceptos de cobro
│   │   ├── periods/            # Periodos de facturación
│   │   ├── receipts/           # Recibos generados
│   │   └── audit/              # Bitácora de auditoría
│   ├── cashier/                # Módulo cajero
│   │   ├── page.tsx            # Búsqueda + cobros
│   │   ├── closure/            # Cierre de caja
│   │   └── history/            # Historial de pagos
│   ├── reader/                 # Módulo lecturista (mobile-first)
│   │   ├── page.tsx            # Dashboard del lector
│   │   ├── new/                # Nueva lectura
│   │   ├── search/             # Buscar cliente
│   │   ├── pending/            # Lecturas pendientes
│   │   ├── sync/               # Sincronización
│   │   └── list/               # Lista de lecturas
│   └── login/                  # Página de login
├── services/                   # 12 servicios de negocio
├── repositories/               # 10 repositorios (acceso a Supabase)
├── hooks/                      # useAuth, useOfflineSync
├── components/
│   ├── ui/                     # 13 componentes shadcn/ui
│   └── layouts/                # Layouts por rol
├── lib/
│   ├── supabase/               # Clientes Supabase (browser, server, middleware)
│   ├── db/dexie.ts             # Base de datos offline
│   ├── billing-utils.ts        # Cálculos tarifarios
│   └── utils.ts                # Utilidades generales
├── types/database.ts           # Tipos TypeScript generados
└── proxy.ts                    # Proxy de autenticación (Next.js 16)
```

## 🧪 Testing

```bash
# Tests unitarios (Vitest)
npm run test

# Tests E2E (Playwright)
npx playwright test

# Type checking
npx tsc --noEmit

# Linting
npm run lint

# Build de producción
npm run build
```

## 🗄️ Base de Datos

### Tablas principales (13)

| Tabla | Descripción |
|-------|-------------|
| `roles` | Roles del sistema (admin, cashier, meter_reader) |
| `profiles` | Perfiles vinculados a auth.users |
| `municipality_config` | Configuración municipal (RUC, nombre, etc.) |
| `tariffs` | Tarifas eléctricas |
| `tariff_tiers` | Tramos progresivos por tarifa |
| `billing_concepts` | Conceptos de cobro (cargo fijo, alumbrado, etc.) |
| `customers` | Clientes/suministros |
| `billing_periods` | Periodos de facturación mensual |
| `readings` | Lecturas de medidor (consumo calculado automáticamente) |
| `receipts` | Recibos de cobro |
| `payments` | Pagos registrados |
| `cash_closures` | Cierres de caja diarios |
| `audit_logs` | Registro de auditoría |

### Funciones SQL
- **`calculate_energy_amount(consumption, tariff_id)`** — Calcula el monto por tramos progresivos
- **`get_user_role()`** — Obtiene el rol del usuario autenticado (para RLS)
- **`handle_new_user()`** — Trigger que auto-crea perfil al registrar usuario

### Tarifa BTSB (ejemplo)
| Tramo | Rango | Precio/kWh |
|-------|-------|------------|
| 1 | 0 – 30 kWh | S/ 0.31 |
| 2 | 30 – 100 kWh | S/ 0.62 |
| 3 | 100+ kWh | S/ 0.64 |

## 🔐 Seguridad

- **RLS (Row Level Security)** habilitado en las 13 tablas
- **Proxy (proxy.ts)** protege rutas por rol en el servidor
- **Funciones SECURITY DEFINER** con `search_path` fijo
- **Acceso `anon` revocado** en funciones sensibles
- **Trigger automático** para creación de perfiles

## 📱 PWA / Offline

- PWA instalable en dispositivos móviles
- Lecturas funcionan sin conexión a internet (IndexedDB via Dexie.js)
- Sincronización automática al recuperar red (cada 30s)
- Cache de clientes para búsqueda offline

## 🚢 Deployment

- **Plataforma**: Vercel
- **Repositorio**: [jperezpereznos-tech/curimana-electrica](https://github.com/jperezpereznos-tech/curimana-electrica)
- **Branch**: `master` (auto-deploy en cada push)
- **Variables de entorno**: Configurar en Vercel → Project Settings → Environment Variables

---

© 2026 Municipalidad Distrital de Curimana
