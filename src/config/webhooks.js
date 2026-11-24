/**
 * ─────────────────────────────────────────────────────────────
 *  PROSPEKTA · Endpoints de producción (n8n + PostgreSQL)
 * ─────────────────────────────────────────────────────────────
 *  Todas las llamadas son POST con Content-Type: application/json.
 *  La URL base puede sobrescribirse con la variable de entorno
 *  VITE_N8N_BASE_URL (archivo .env) sin tocar la interfaz.
 */

export const N8N_BASE_URL = (import.meta.env.VITE_N8N_BASE_URL || 'https://b2b-n8n.c4adol.easypanel.host/webhook').replace(/\/+$/, '')

export const WEBHOOKS = {
  AUTH_WEBHOOK: 'https://b2b-n8n.c4adol.easypanel.host/webhook/auth-login',
  MIS_DATOS_WEBHOOK: `${N8N_BASE_URL}/mis-datos`,
  EXPLORATORIA_WEBHOOK: `${N8N_BASE_URL}/exploratoria`,
  ESPECIFICA_WEBHOOK: `${N8N_BASE_URL}/especifica`,
  EMPRESAS_CLIENTE_WEBHOOK: import.meta.env.VITE_EMPRESAS_CLIENTE_WEBHOOK || `${N8N_BASE_URL}/especifica`,
  OCULTAR_RESULTADOS_WEBHOOK: import.meta.env.VITE_OCULTAR_WEBHOOK || `${N8N_BASE_URL}/ocultar-resultados`,
  OCULTAR_REGISTRO_WEBHOOK: `${N8N_BASE_URL}/ocultar-registro`,
  ADMIN_WEBHOOK: `${N8N_BASE_URL}/admin-gestion`,
  CONTACTO_WEBHOOK: `${N8N_BASE_URL}/contacto-leads`,
}

/** Tiempo máximo de espera por petición (ms). */
export const WEBHOOK_TIMEOUT_MS = 30000

/** Las búsquedas con IA pueden tardar varios minutos. */
export const SEARCH_TIMEOUT_MS = 10 * 60 * 1000
