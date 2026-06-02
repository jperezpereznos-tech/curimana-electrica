# 📐 Arquitectura del Sistema — Curimana Eléctrica

Este documento detalla la arquitectura de software del **Sistema Eléctrico Municipal de Curimana**, un sistema de facturación y recaudación desarrollado para la Municipalidad Distrital de Curimana (Ucayali, Perú).

---

## 🏗️ Resumen Tecnológico

El sistema implementa una arquitectura moderna basada en la nube con soporte crítico para operaciones sin conexión a internet (offline-first) para el personal de lectura de medidores.

```
┌─────────────────────────────────────────────────────────────────┐
│                           FRONTEND                              │
│                    Next.js 16 (App Router)                      │
│                                                                 │
│   ┌──────────────────┐  ┌──────────────────┐  ┌─────────────┐   │
│   │  /admin (Admin)  │  │/cashier (Cajero) │  │/reader (Lec)│   │
│   └────────┬─────────┘  └────────┬─────────┘  └──────┬──────┘   │
│            │                     │                   │          │
│            ▼                     ▼                   ▼          │
│    Services Layer (15 servicios de lógica de negocio)          │
│            │                     │                   │          │
│            ▼                     ▼                   ▼          │
│    Repositories Layer (12 repositorios para base de datos)       │
└────────────┬─────────────────────┬───────────────────┬──────────┘
             │                     │                   │
             │ (Online)            │ (Online)          │ (Offline / Dexie.js)
             ▼                     ▼                   ▼
┌──────────────────────────────────────────────────────┬──────────┐
│                           BACKEND                    │ OFFLINE  │
│                   Supabase (BaaS)                    │          │
│                                                      │          │
│  ┌───────────────────────┐ ┌───────────────────────┐ │ ┌──────┐ │
│  │   PostgreSQL + RLS    │ │    Supabase Auth      │ │ │Indexed│ │
│  │ (15 Tablas + 17 RPCs) │ │ (Manejado por proxy)  │ │ │  DB  │ │
│  └───────────────────────┘ └───────────────────────┘ │ └──────┘ │
└──────────────────────────────────────────────────────┴──────────┘
```

---

## 📁 Estructura del Proyecto

El código fuente sigue las convenciones del **App Router de Next.js** y separa rigurosamente la lógica de acceso a datos de la interfaz de usuario.

```
curimana-electrica/
├── .cursor/rules/             # Reglas para agentes de IA por módulo
├── public/                    # Archivos estáticos y manifiesto PWA
├── supabase/                  # Migraciones, esquema de BD y datos semilla
│   ├── migrations/            # Script de migraciones ordenados por fecha
│   ├── schema.sql             # Esquema completo de la base de datos
│   └── seed.sql               # Datos iniciales para configuración
└── src/
    ├── app/                   # Capa de Presentación (Rutas de Next.js)
    │   ├── admin/             # Módulo administrativo (gestión completa)
    │   ├── cashier/           # Módulo para ventanilla de cobros y caja
    │   ├── reader/            # Módulo mobile-first para toma de lecturas
    │   ├── login/             # Interfaz de inicio de sesión
    │   └── page.tsx           # Redirección inteligente inicial
    ├── components/            # Componentes compartidos de la UI
    │   ├── ui/                # Componentes atómicos (shadcn/ui)
    │   ├── layouts/           # Estructuras de navegación por rol
    │   ├── status-badge.tsx   # Visualizador de estados estandarizado
    │   └── empty-state.tsx    # Plantilla para listas vacías
    ├── hooks/                 # React Hooks personalizados (auth, sync, etc.)
    ├── lib/                   # Librerías auxiliares e integraciones
    │   ├── db/dexie.ts        # Configuración e instanciación de IndexedDB
    │   ├── supabase/          # Clientes Supabase (cliente, servidor, middleware)
    │   └── billing-utils.ts   # Algoritmo de cálculo de consumo y tarifas
    ├── repositories/          # Capa de Datos (Acceso directo a Supabase)
    ├── services/              # Capa de Negocio (Casos de uso y reglas)
    ├── styles/                # Estilos globales (Tailwind v4 CSS)
    ├── types/                 # Definiciones de TypeScript
    └── proxy.ts               # Middleware de enrutamiento y protección de rutas
```

---

## 🔄 Flujo de Datos

### 1. Flujo Online (Admin / Cajero)
Para los roles de **Administrador** y **Cajero**, el sistema opera en tiempo real directamente con la base de datos Supabase:
1. **Componente de React (Cliente o Servidor)** invoca un método de un **Servicio**.
2. El **Servicio** valida la lógica de negocio, reglas financieras e interactúa con un **Repositorio**.
3. El **Repositorio** realiza la consulta HTTP/Websocket a través del cliente de Supabase respectivo.
4. Las políticas de **RLS (Row Level Security)** en PostgreSQL verifican la sesión y el rol del usuario antes de permitir cualquier operación de lectura o escritura.

### 2. Flujo Offline (Lector de Medidores)
Dado que Curimana cuenta con zonas sin cobertura de red móvil, el módulo del **Lector** implementa un flujo offline-first completo:
1. **Sincronización Inicial**: El lector descarga y almacena la lista de suministros (`customers_cache`) asignados a su sector en la base de datos local `IndexedDB` (gestionada mediante `Dexie.js`).
2. **Toma de Lecturas**: El lector busca un suministro, registra la lectura actual y la guarda localmente en la tabla `pending_readings` con estado `pending`.
3. **Sincronización en Segundo Plano**: El hook `useOfflineSync` detecta la disponibilidad de internet y, de forma automática cada 30 segundos, envía las lecturas pendientes al servidor a través de Server Actions de Next.js.
4. **Validación y Limpieza**: Si la lectura se registra correctamente en Supabase, el registro local se elimina para liberar almacenamiento y mantener consistencia.

---

## 🏛️ Patrón Service-Repository

La separación de responsabilidades asegura la mantenibilidad del código al desacoplar la interfaz de usuario de las consultas y llamadas a la API de Supabase.

### Repositorios (`src/repositories/`)
Son clases encargadas de interactuar directamente con Supabase PostgreSQL. Todos heredan de `BaseRepository` (`src/repositories/base.ts`), la cual provee métodos básicos de CRUD.
- No contienen lógica de negocio ni validaciones de flujo.
- Encapsulan las consultas, joins de tablas y llamadas RPC.
- *Ejemplo*: `CustomerRepository` interactúa con la tabla `customers`.

### Servicios (`src/services/`)
Clases que encapsulan las reglas y procesos de negocio del sistema eléctrico. Se instancian pasando el cliente de Supabase adecuado.
- Coordinan llamadas a múltiples repositorios.
- Implementan flujos transaccionales (por ejemplo, registrar cobros y actualizar la deuda del cliente simultáneamente).
- Manejan el registro de auditoría (`AuditService`).
- *Ejemplo*: `ReceiptService` calcula la facturación total y actualiza los saldos pendientes utilizando `calculateBreakdown()` y `recalculate_customer_debt`.

---

## 🎨 Convenciones de Frontend y UI

El sistema está diseñado con una UI premium que sigue las directrices municipales:
- **Estilos**: Tailwind CSS v4 con importaciones directas en `src/styles/globals.css`. No se utiliza `tailwind.config.ts`.
- **Componentes Base**: Basados en la especificación **shadcn/ui (base-nova)** instalados en `src/components/ui/`.
- **Iconografía**: Utilización exclusiva de `lucide-react`. Cada botón con icono incluye `aria-label` para accesibilidad.
- **Rendimiento**: 
  - Los listados administrativos pesados implementan `React.memo` para evitar renders innecesarios.
  - Componentes de alta interacción interactiva como `ConfirmDialog` se cargan de forma diferida mediante `next/dynamic`.
  - Rutas dinámicas usan boundaries de `error.tsx` a nivel de carpeta para un manejo robusto de excepciones de carga.
