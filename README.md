# PROSPEKTA — Inteligencia Comercial B2B

> **Encuentra · Conecta · Crece** | By Fiumi & Levitze

Aplicación web estática (React 19 + Vite + Tailwind CSS v4) conectada a los webhooks de producción en **n8n** mediante `POST` con `Content-Type: application/json`.

## Rutas

| Ruta | Acceso | Descripción |
| --- | --- | --- |
| `/` | Público (sin sesión) | Landing comercial: Hero, Cómo funciona, Paquetes y formulario de contacto (`contacto-leads`). |
| `/login` | Público (sin sesión) | Inicio de sesión real contra `auth-login`. Redirige según `rol` (`admin` → `/admin`, `cliente` → `/dashboard`). |
| `/dashboard` | Privado (`rol === "cliente"`) | Saldo real y tablas de resultados desde `mis-datos`, Búsqueda Exploratoria, Búsqueda Específica, soft delete y exportación CSV/Excel. |
| `/admin` | Privado (`rol === "admin"`) | Panel de administración conectado a `admin-gestion`: usuarios, creación de cuentas, actualización de créditos, activar/suspender y leads de contacto. |

## Endpoints de producción (`src/config/webhooks.js`)

La URL base por defecto es `https://b2b-n8n.c4adol.easypanel.host/webhook` (sobrescribible con `VITE_N8N_BASE_URL`):

1. `POST /auth-login` — `{ email, password }`
2. `POST /mis-datos` — `{ id_cliente }`
3. `POST /exploratoria` — `{ id_cliente, perfil, industrias, paises, tamanos, areas, niveles, cantidad, idioma }`
4. `POST /especifica` — `{ id_cliente, empresas: [{ nombre, sitio_web }], archivos, perfil, areas, niveles, cantidad, idioma }`
5. `POST /ocultar-resultados` — `{ id_cliente, tabla: "historial_exploratorio" | "resultados_lista", ids }`
6. `POST /admin-gestion` — `{ accion: "listar_todo" | "crear_usuario" | "actualizar_creditos" | "cambiar_estado", id_admin, ... }`
7. `POST /contacto-leads` — `{ nombre, empresa, email, telefono, paquete_interes, mensaje }`

## Desarrollo y compilación

```bash
npm install
npm run dev
npm run build
```

El proyecto incluye reglas de fallback SPA para hosting estático en `public/_redirects` (Netlify / Cloudflare Pages), `vercel.json` (Vercel) y `public/.htaccess` (Apache).
