# 🛠️ Guía de Desarrollo — Curimana Eléctrica

Esta guía contiene la información necesaria para configurar el entorno de desarrollo local, ejecutar las pruebas de software y mantener la consistencia del código del proyecto.

---

## 🚀 Requisitos del Sistema

Para levantar el proyecto en tu máquina local necesitarás:
- **Node.js**: Versión 18 o superior (recomendado LTS).
- **npm**: Versión 9 o superior.
- **Supabase CLI** (opcional, para desarrollo local avanzado) o una cuenta activa en la nube de Supabase.

---

## 🛠️ Configuración del Entorno Local

1. **Clonar e instalar dependencias**:
   ```bash
   git clone https://github.com/jperezpereznos-tech/curimana-electrica.git
   cd curimana-electrica
   npm install
   ```

2. **Configurar variables de entorno**:
   Crea un archivo `.env.local` copiándolo del ejemplo:
   ```bash
   cp .env.local.example .env.local
   ```
   Edítalo con las credenciales de tu proyecto de Supabase:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_clave_anon_publica
   NEXT_PUBLIC_APP_URL=http://localhost:3000
   ```

3. **Inicializar la Base de Datos**:
   - Ingresa al panel de Supabase de tu proyecto ➔ **SQL Editor**.
   - Copia y ejecuta el contenido de `supabase/schema.sql` (crea tablas, funciones, índices y políticas RLS).
   - Copia y ejecuta el contenido de `supabase/seed.sql` (carga roles del sistema, sectores por defecto y la configuración municipal inicial).

4. **Crear el primer Usuario Administrador**:
   - Ve a **Authentication** ➔ **Users** ➔ **Add User** en Supabase.
   - Crea un usuario con el email que desees (ej: `admin@curimana.gob.pe`). El trigger `on_auth_user_created` insertará automáticamente el perfil del usuario en la tabla `profiles`.
   - Ejecuta en el SQL Editor la siguiente consulta para otorgar privilegios de administrador:
     ```sql
     UPDATE profiles SET role = 'admin' WHERE email = 'admin@curimana.gob.pe';
     ```

5. **Iniciar el servidor de desarrollo**:
   ```bash
   npm run dev
   ```
   El servidor se levantará en [http://localhost:3000](http://localhost:3000) utilizando el compilador Turbopack de Next.js.

---

## 🔄 Flujo de Verificación y Comandos

Antes de realizar un Commit o enviar un Pull Request al repositorio, se debe ejecutar la canalización de verificación completa en el siguiente orden estricto:

```
┌──────────────┐      ┌──────────────────┐      ┌──────────────┐      ┌───────────────┐
│ npm run lint │ ➔  │ npx tsc --noEmit │ ➔  │ npm run test │ ➔  │ npm run build │
└──────────────┘      └──────────────────┘      └──────────────┘      └───────────────┘
```

### Comandos Disponibles

- **Desarrollo**:
  ```bash
  npm run dev
  ```
  Levanta el servidor local con soporte rápido de recarga (HMR).
- **Control de Calidad (Linter)**:
  ```bash
  npm run lint
  ```
  Corre ESLint 9 con configuración plana de código para validar TypeScript y convenciones del framework.
- **Chequeo de Tipos (TypeScript)**:
  ```bash
  npx tsc --noEmit
  ```
  Valida la correcta tipificación estricta del proyecto.
- **Compilación de Producción**:
  ```bash
  npm run build
  ```
  Compila el bundle de producción de Next.js optimizando recursos.

---

## 🧪 Pruebas (Testing Framework)

El proyecto cuenta con una amplia cobertura de pruebas unitarias y de extremo a extremo (E2E).

### 1. Pruebas Unitarias (Vitest)
Se utiliza **Vitest** en combinación con `jsdom` para pruebas de componentes y servicios rápidos.
- **Ejecución**:
  ```bash
  npm run test
  ```
- **Detalles**:
  - Cuenta con variables de entorno ficticias autodeclaradas en `vitest.config.ts`. No requiere archivo `.env.local` configurado para correr.
  - Implementa `globals: true` por lo que no es necesario importar palabras clave como `describe`, `it`, `expect` o `beforeEach` en los archivos de prueba.
  - Excluye automáticamente la carpeta de pruebas E2E.

### 2. Pruebas de Integración y Flujo (Playwright E2E)
Las pruebas E2E simulan la interacción real del navegador con la aplicación.
- **Ejecución**:
  ```bash
  npx playwright test
  ```
- **Detalles**:
  - Levanta automáticamente el servidor de producción (`npm run start` sobre el compilado previo de `npm run build`), no usa el de desarrollo.
  - Corre pruebas simultáneamente en 3 navegadores: Google Chrome (`chromium`), Mobile Chrome (emulando Pixel 5) y Mobile Safari (emulando iPhone 12).
  - En local, se autogestionan múltiples hilos paralelos para acelerar las validaciones.

---

## 📝 Estándares de Codificación

- **Estilos**: No crees archivos de configuración de Tailwind. La versión 4 se define directamente mediante `@import "tailwindcss";` en `src/styles/globals.css`.
- **Componentes shadcn/ui**: Si necesitas agregar un componente UI de la librería shadcn, ejecuta:
  ```bash
  npx shadcn add <nombre_del_componente>
  ```
  E importalo desde `@/components/ui/`.
- **Comentarios en Código**: Se promueve el código autodocumentado. Evita añadir comentarios redundantes en el código a menos que el flujo de negocio sea sumamente complejo o inusual.
- **Importaciones**: Usa siempre alias de rutas absolutas `@/` en lugar de rutas relativas largas (ej. `import { db } from '@/lib/db/dexie'` en lugar de `../../lib/db/dexie`).
