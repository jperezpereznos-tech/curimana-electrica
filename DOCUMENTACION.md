# ⚡ Portal de Documentación — Curimana Eléctrica

Bienvenido a la documentación técnica oficial del **Sistema Eléctrico Municipal de Curimana**. Esta suite está diseñada para centralizar y detallar el funcionamiento técnico, arquitectónico, financiero y de seguridad del software que gestiona la facturación, recaudación y lecturas del servicio eléctrico del distrito de Curimana (Ucayali, Perú).

---

## 🗺️ Mapa de la Documentación

Haz clic en los enlaces de abajo para acceder a los módulos de documentación específicos:

### 1. [📐 Arquitectura del Sistema](file:///c:/curimana-electrica/docs/ARQUITECTURA.md)
Detalla la organización física de archivos en el proyecto Next.js 16 (App Router), el flujo de datos Online/Offline, y el patrón de diseño **Service-Repository** para separar responsabilidades.

### 2. [🗄️ Diseño de Base de Datos](file:///c:/curimana-electrica/docs/BASE_DE_DATOS.md)
Esquema completo de las 15 tablas en PostgreSQL (Supabase), integridad referencial, las 17 funciones SQL y RPCs (como `process_payment` y `get_dashboard_kpis`), triggers y el diseño de índices compuestos, GIN y parciales de rendimiento.

### 3. [⚡ Algoritmo de Cálculo y Facturación](file:///c:/curimana-electrica/docs/CALCULO_FACTURACION.md)
Explica detalladamente la matemática aplicada al algoritmo tarifario progresivo por tramos (Tarifa Monofásica BT5B). Incluye ejemplos paso a paso para consumos de 30, 31, 50, 100 y 150 kWh, y el desglose de conceptos del recibo.

### 4. [📱 Funcionamiento Offline y PWA](file:///c:/curimana-electrica/docs/OFFLINE_Y_PWA.md)
Explica cómo el lecturista realiza su trabajo en campo sin conexión a internet. Detalla el esquema local con Dexie.js (IndexedDB), el hook de sincronización con **Backoff Exponencial** ante fallos de red y el flujo de cierre de sesión seguro.

### 5. [🔐 Modelo de Seguridad y Acceso](file:///c:/curimana-electrica/docs/SEGURIDAD.md)
Muestra cómo se protege la información financiera de la municipalidad. Cubre la encriptación y caché de roles por cookies en el middleware `proxy.ts`, políticas de seguridad RLS en base de datos, funciones de ejecución restringida y la bitácora de auditoría inmutable.

### 6. [🛠️ Guía de Desarrollo y Pruebas](file:///c:/curimana-electrica/docs/GUIA_DESARROLLO.md)
Manual técnico para nuevos desarrolladores. Incluye la instalación local, configuración de base de datos en Supabase, variables de entorno, la pipeline de compilación y comandos para correr tests de Vitest y Playwright.

---

## 🎨 Diagrama General de Arquitectura

El siguiente diagrama Mermaid visualiza la relación entre los diferentes módulos, componentes de negocio y el sistema de sincronización offline:

```mermaid
graph TD
    %% Roles de usuario
    Admin[Administrador] -->|Accede online| AdminUI[Panel /admin]
    Cajero[Cajero] -->|Accede online| CashierUI[Ventanilla /cashier]
    Lector[Lector de Medidores] -->|Accede offline/online| ReaderUI[Lecturas /reader]

    %% Capa de frontend Next.js
    subgraph NextJS["Servidor y Cliente Next.js 16"]
        AdminUI --> Services[Capa de Servicios de Negocio]
        CashierUI --> Services
        ReaderUI -->|Modo Online| Services
        ReaderUI -->|Modo Offline| DexieDB[(IndexedDB - Dexie.js)]
        
        Services --> Repositories[Capa de Repositorios]
        Proxy[Edge Middleware proxy.ts] -->|Protege e inyecta rol en cookie| NextJS
    end

    %% Capa de persistencia local
    DexieDB -->|Sincroniza en background useOfflineSync| ServerActions[Server Actions /reader/actions]
    ServerActions --> Services

    %% Capa de Base de Datos y Backend
    subgraph Supabase["Backend Supabase"]
        Auth[Supabase Auth] -.-> Proxy
        Repositories -->|Acceso con RLS| PostgreSQL[(Base de Datos PostgreSQL)]
        PostgreSQL -->|RPC/Triggers| SQLFunctions[Funciones PL/pgSQL]
        PostgreSQL -->|Imágenes de medidor| StorageBucket[Bucket reading-photos]
    end

    classDef tech fill:#0066cc,stroke:#fff,stroke-width:2px,color:#fff;
    classDef client fill:#f5f5f5,stroke:#c0c0c0,stroke-width:2px;
    classDef db fill:#2eb67d,stroke:#fff,stroke-width:2px,color:#fff;
    
    class NextJS,Supabase tech;
    class Admin,Cajero,Lector client;
    class DexieDB,PostgreSQL db;
```

---

## 📜 Licencia e Información de Propiedad

Esta suite de software ha sido construida para uso exclusivo de la **Municipalidad Distrital de Curimana**. Todos los derechos de código y base de datos son propiedad del municipio de Curimana, Ucayali, Perú.
