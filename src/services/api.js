import { WEBHOOKS, WEBHOOK_TIMEOUT_MS } from '../config/webhooks'
import { normalizeCompanyRow } from '../features/search/utils/companyParser'

/* ── URLs fijas de producción en n8n ───────────────────────── */
export const LOGIN_URL = 'https://b2b-n8n.c4adol.easypanel.host/webhook/auth-login'
export const MIS_DATOS_URL = 'https://b2b-n8n.c4adol.easypanel.host/webhook/mis-datos'
export const EXPLORATORIA_URL = 'https://b2b-n8n.c4adol.easypanel.host/webhook/exploratoria'
export const ESPECIFICA_URL = 'https://b2b-n8n.c4adol.easypanel.host/webhook/especifica'
export const GESTION_EMPRESAS_URL = 'https://b2b-n8n.c4adol.easypanel.host/webhook/gestion-empresas'

/** Mensajes comerciales amigables y rotativos ante demoras o fallos en las búsquedas (sin tecnicismos). */
export const FRIENDLY_SEARCH_ERRORS = {
  es: [
    'Tuvimos un breve inconveniente al procesar tu solicitud. Espera unos segundos y vuelve a intentarlo.',
    'No pudimos validar los parámetros enviados. Revisa los datos e inténtalo nuevamente.',
  ],
  en: [
    'We had a brief hiccup while processing your request. Please wait a few seconds and try again.',
    'We could not validate the submitted parameters. Please review your inputs and try again.',
  ],
}

let lastErrorIdx = -1

/** Devuelve aleatoriamente (sin repetir el inmediatamente anterior) uno de los 3 mensajes comerciales amigables. */
export function getFriendlySearchError(lang = 'es') {
  const list = FRIENDLY_SEARCH_ERRORS[lang] || FRIENDLY_SEARCH_ERRORS.es
  let idx = Math.floor(Math.random() * list.length)
  if (list.length > 1 && idx === lastErrorIdx) {
    idx = (idx + 1) % list.length
  }
  lastErrorIdx = idx
  return list[idx]
}

const TECHNICAL_ERROR_RE =
  /(webhook|failed to fetch|networkerror|fetch|http|status\s*\d{3}|error\s*[45]\d{2}|\b[45]\d{2}\b|n8n|workflow|unexpected token|json|abort|timeout|econn|enotfound|sql|postgres|syntaxerror|typeerror|cors)/i

/** Filtra cualquier mensaje técnico para que jamás se muestre jerga de red/webhooks/HTTP al usuario. */
export function sanitizeErrorMessage(rawMessage, fallback = '') {
  const fallbackMsg = fallback || getFriendlySearchError('es')
  if (!rawMessage || typeof rawMessage !== 'string') return fallbackMsg
  const clean = rawMessage.trim()
  if (!clean || TECHNICAL_ERROR_RE.test(clean)) return fallbackMsg
  return clean
}

/** Normaliza siempre id_cliente como el correo electrónico en minúsculas del usuario. */
export const toClientEmailId = (val) =>
  String(val && typeof val === 'object' ? val.email || val.id_cliente || '' : val ?? '')
    .trim()
    .toLowerCase()

/** Error con mensaje comercial limpio para mostrar en pantalla. */
export class ApiError extends Error {
  constructor(message, { status, data, code } = {}) {
    super(sanitizeErrorMessage(message))
    this.name = 'ApiError'
    this.status = status
    this.data = data
    this.code = code
  }
}

/** n8n a veces responde [ {...} ]: devolvemos el primer elemento. */
const unwrap = (data) => (Array.isArray(data) && data.length === 1 && data[0] && typeof data[0] === 'object' ? data[0] : data)

const serverMessage = (d) => (d && typeof d === 'object' ? d.mensaje || d.message || d.error || d.msg : '') || ''

/** Notifica a la sesión activa para renovar automáticamente los 30 minutos tras cada acción exitosa. */
function touchActiveSession() {
  try {
    window.dispatchEvent(new CustomEvent('prospekta:session-touch'))
  } catch {
    // ignorar
  }
}

/** Obtiene la ruta puente same-origin `/api/n8n/<endpoint>` para respaldar peticiones cuando el navegador bloquea dominios cruzados en iframes. */
function toSameOriginBridgeUrl(directUrl) {
  const match = String(directUrl || '').match(/\/webhook\/([^/?#]+)/i)
  return match ? `/api/n8n/${match[1]}` : null
}

/**
 * Ejecuta POST JSON directo contra la URL de n8n; si el navegador bloquea la conexión cruzada
 * (ej. iframe sandboxed / adblocker / CORS en preview), reintenta automáticamente por el puente same-origin `/api/n8n/<endpoint>`.
 */
export async function postToN8n(directUrl, payload, { signal } = {}) {
  const body = JSON.stringify(payload ?? {})
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json' }
  try {
    return await fetch(directUrl, {
      method: 'POST',
      headers,
      body,
      ...(signal ? { signal } : {}),
    })
  } catch (directErr) {
    if (directErr?.name === 'AbortError') throw directErr
    const bridgeUrl = toSameOriginBridgeUrl(directUrl)
    if (!bridgeUrl) throw directErr
    const bridgeRes = await fetch(bridgeUrl, {
      method: 'POST',
      headers,
      body,
      ...(signal ? { signal } : {}),
    })
    const ct = bridgeRes.headers.get('content-type') || ''
    if (ct.includes('text/html')) throw directErr
    return bridgeRes
  }
}

/**
 * POST JSON sin AbortController ni timeout corto para búsquedas largas (Exploratoria / Específica).
 * - Si el proxy devuelve 502/504 o corta la conexión por espera, devuelve { ok: true, status: 'processing', background: true }
 *   sin mostrar falsos errores, para que el sondeo en segundo plano continúe hasta completar.
 * - Solo lanza ApiError ante HTTP 400 / 500 explícito (distinto de 502/504) o JSON con { ok: false }.
 */
async function callSearchEndpoint(directUrl, payload, lang = 'es') {
  const fallback = getFriendlySearchError(lang)
  try {
    const res = await postToN8n(directUrl, payload ?? {})
    if (res.status === 502 || res.status === 504) {
      return { ok: true, status: 'processing', background: true }
    }
    const text = await res.text()
    let data = {}
    if (text) {
      try {
        data = unwrap(JSON.parse(text))
      } catch {
        data = {}
      }
    }
    if ((res.status === 400 || (res.status >= 500 && res.status !== 502 && res.status !== 504) || !res.ok) || (data && data.ok === false)) {
      const exactServerMsg = (data && typeof data === 'object' ? data.error || data.mensaje || data.message : '') || ''
      throw new ApiError(exactServerMsg || fallback, { status: res.status, data })
    }
    touchActiveSession()
    return data
  } catch (err) {
    if (err instanceof ApiError) throw err
    // Cortes de red / proxy / AbortError mientras n8n sigue trabajando en segundo plano
    return { ok: true, status: 'processing', background: true }
  }
}

/**
 * POST JSON a un endpoint de producción.
 * - Nunca expone referencias técnicas como "Webhook", "Failed to fetch" o códigos HTTP.
 * - Renueva automáticamente el temporizador de 30 minutos de sesión en cada operación exitosa.
 */
export async function callWebhook(name, body, { timeout = WEBHOOK_TIMEOUT_MS, friendlyFallback } = {}) {
  const url = WEBHOOKS[name] || name
  const controller = new AbortController()
  const timer = timeout ? setTimeout(() => controller.abort(), timeout) : null
  const fallback = friendlyFallback || getFriendlySearchError('es')

  try {
    const res = await postToN8n(url, body ?? {}, { signal: timer ? controller.signal : undefined })
    const text = await res.text()
    let data = {}
    if (text) {
      try {
        data = unwrap(JSON.parse(text))
      } catch {
        data = {}
      }
    }
    if (!res.ok) {
      throw new ApiError(sanitizeErrorMessage(serverMessage(data), fallback), { status: res.status, data })
    }
    if (data && data.ok === false) {
      throw new ApiError(sanitizeErrorMessage(serverMessage(data), fallback), { status: res.status, data })
    }
    touchActiveSession()
    return data
  } catch (err) {
    if (err.name === 'AbortError') {
      throw new ApiError(getFriendlySearchError('es'), { code: 'timeout' })
    }
    if (err instanceof ApiError) throw err
    throw new ApiError(fallback, { code: 'network' })
  } finally {
    if (timer) clearTimeout(timer)
  }
}

/* ── Normalización ─────────────────────────────────────────── */

const toArray = (v) => (Array.isArray(v) ? v : v && typeof v === 'object' && Array.isArray(v.data) ? v.data : [])
const toNumber = (v) => {
  const n = Number(v)
  return Number.isFinite(n) ? n : 0
}
const isHidden = (row) => {
  if (!row || typeof row !== 'object') return false
  if ([row.oculto, row.eliminado].some((v) => v === true || v === 1 || v === 'true' || v === '1')) return true
  if ([row.visible, row.visible_en_dashboard, row.visible_dashboard].some((v) => v === false || v === 0 || v === 'false' || v === '0')) return true
  return false
}

/**
 * Usuario de sesión normalizado:
 * `id_cliente` es SIEMPRE el correo electrónico en minúsculas del usuario autenticado (`user.email.toLowerCase()`).
 */
export function normalizeUser(u = {}) {
  const email = String(u.email ?? u.correo ?? '').trim().toLowerCase()
  const fallbackId = String(u.id_cliente ?? u.id ?? '').trim().toLowerCase()
  const canonicalEmailId = email || fallbackId
  return {
    id_cliente: canonicalEmailId || null,
    email: canonicalEmailId,
    nombre: u.nombre ?? '',
    empresa: u.empresa ?? '',
    rol: String(u.rol ?? 'cliente').toLowerCase(),
    saldo_creditos: toNumber(u.saldo_creditos),
    estado: u.estado ?? 'activo',
  }
}

const hasValidId = (r) => r && typeof r === 'object' && r.id !== null && r.id !== undefined && String(r.id).trim() !== ''

/**
 * Respuesta de mis-datos →
 * { perfil, saldo_creditos, historial_exploratorio, resultados_lista, empresas_cliente }.
 */
export function normalizeClientData(d = {}) {
  const perfil = d.usuario || d.perfil || d.cliente || {}
  const saldo = d.saldo_creditos ?? perfil.saldo_creditos
  const rawEmpresas = toArray(
    d.empresas ?? d.empresas_cliente ?? d.prospekta_empresas_cliente ?? d.mis_empresas ?? d.empresas_cargadas,
  )
  return {
    perfil,
    saldo_creditos: saldo === undefined || saldo === null ? null : toNumber(saldo),
    estado_busqueda: d.estado_busqueda ?? perfil.estado_busqueda ?? null,
    historial_exploratorio: toArray(d.historial_exploratorio).filter((r) => !isHidden(r)),
    resultados_lista: toArray(d.resultados_lista).filter((r) => !isHidden(r)),
    empresas_cliente: rawEmpresas.filter((r) => hasValidId(r) && !isHidden(r)).map((r, i) => normalizeCompanyRow(r, i)),
  }
}

/** Normaliza la respuesta de GESTION_EMPRESAS_URL → lista de empresas desde data.empresas (ignorando elementos sin id). */
export function normalizeEmpresasResponse(d = {}) {
  const raw = Array.isArray(d)
    ? d
    : toArray(d.empresas ?? d.empresas_cliente ?? d.prospekta_empresas_cliente ?? d.data)
  return raw.filter((r) => hasValidId(r) && !isHidden(r)).map((r, i) => normalizeCompanyRow(r, i))
}

/**
 * Respuesta de admin-gestion (listar_todo) →
 * {
 *   usuarios,
 *   leads,
 *   boveda_exploratoria,
 *   boveda_especifica,
 *   total_prospekta_exploratoria,
 *   total_prospekta_especifica,
 *   acumulado_bodega_exploratoria,
 *   acumulado_bodega_especifica,
 *   total_exploratoria,
 *   total_especifica
 * }.
 */
export function normalizeAdminData(d = {}) {
  const boveda_exploratoria = toArray(
    d.boveda_exploratoria ?? d.historial_exploratorio ?? d.prospekta_historial_exploratorio ?? d.exploratoria,
  )
  const boveda_especifica = toArray(
    d.boveda_especifica ?? d.resultados_lista ?? d.prospekta_resultados_lista ?? d.especifica,
  )
  const metricas = d.metricas || d.stats || {}
  const rawUsers = toArray(d.usuarios ?? d.prospekta_usuarios)

  const isBodegaGeneralRow = (r) => {
    const cid = String(r?.id_cliente ?? r?.cliente_id ?? r?.email_cliente ?? '').trim().toLowerCase()
    return cid === 'boveda_general' || cid === 'bodega_general'
  }

  const expClientRows = boveda_exploratoria.filter((r) => {
    const cid = String(r?.id_cliente ?? r?.cliente_id ?? '').trim().toLowerCase()
    return Boolean(cid) && !isBodegaGeneralRow(r)
  })
  const expBodegaRows = boveda_exploratoria.filter(isBodegaGeneralRow)

  const espClientRows = boveda_especifica.filter((r) => {
    const cid = String(r?.id_cliente ?? r?.cliente_id ?? '').trim().toLowerCase()
    return Boolean(cid) && !isBodegaGeneralRow(r)
  })
  const espBodegaRows = boveda_especifica.filter(isBodegaGeneralRow)

  const total_prospekta_exploratoria =
    d.total_prospekta_exploratoria ??
    metricas.total_prospekta_exploratoria ??
    d.prospectos_clientes_exploratoria ??
    metricas.prospectos_clientes_exploratoria ??
    (expClientRows.length || (expBodegaRows.length ? 0 : (d.total_exploratoria ?? metricas.total_exploratoria ?? boveda_exploratoria.length)))

  const total_prospekta_especifica =
    d.total_prospekta_especifica ??
    metricas.total_prospekta_especifica ??
    d.prospectos_clientes_especifica ??
    metricas.prospectos_clientes_especifica ??
    (espClientRows.length || (espBodegaRows.length ? 0 : (d.total_especifica ?? metricas.total_especifica ?? boveda_especifica.length)))

  const acumulado_bodega_exploratoria =
    d.acumulado_bodega_exploratoria ??
    metricas.acumulado_bodega_exploratoria ??
    d.total_bodega_exploratoria ??
    metricas.total_bodega_exploratoria ??
    d.boveda_general_exploratoria ??
    metricas.boveda_general_exploratoria ??
    (expBodegaRows.length || boveda_exploratoria.length)

  const acumulado_bodega_especifica =
    d.acumulado_bodega_especifica ??
    metricas.acumulado_bodega_especifica ??
    d.total_bodega_especifica ??
    metricas.total_bodega_especifica ??
    d.boveda_general_especifica ??
    metricas.boveda_general_especifica ??
    (espBodegaRows.length || boveda_especifica.length)

  return {
    usuarios: rawUsers.map((u) => {
      const email = String(u.email ?? u.correo ?? u.id_cliente ?? '').trim().toLowerCase()
      return {
        ...u,
        email: email || u.email || '',
        id_cliente: email || String(u.id_cliente ?? u.id ?? '').trim().toLowerCase(),
      }
    }),
    leads: toArray(d.leads ?? d.prospekta_contacto_leads ?? d.contacto_leads),
    boveda_exploratoria,
    boveda_especifica,
    total_prospekta_exploratoria: Number(total_prospekta_exploratoria) || 0,
    total_prospekta_especifica: Number(total_prospekta_especifica) || 0,
    acumulado_bodega_exploratoria: Number(acumulado_bodega_exploratoria) || 0,
    acumulado_bodega_especifica: Number(acumulado_bodega_especifica) || 0,
    total_exploratoria:
      d.total_exploratoria ?? metricas.total_exploratoria ?? metricas.prospectos_exploratoria ?? boveda_exploratoria.length,
    total_especifica:
      d.total_especifica ?? metricas.total_especifica ?? metricas.prospectos_especifica ?? boveda_especifica.length,
  }
}

/* ── Endpoints ─────────────────────────────────────────────── */

export const authApi = {
  /** POST https://b2b-n8n.c4adol.easypanel.host/webhook/auth-login { email, password } */
  async login(email, password) {
    const cleanEmail = String(email ?? '').trim().toLowerCase()
    const res = await postToN8n(LOGIN_URL, {
      email: cleanEmail,
      password: String(password ?? ''),
    })

    const text = await res.text()
    let data = {}
    if (text) {
      try {
        data = unwrap(JSON.parse(text))
      } catch {
        throw new Error(`Respuesta inválida del servidor (HTTP ${res.status}): ${text.slice(0, 180)}`)
      }
    }

    if (data && data.ok === false) {
      throw new Error(data.mensaje || data.message || data.error || 'Credenciales incorrectas.')
    }
    if (!res.ok) {
      throw new Error(data?.mensaje || data?.message || data?.error || `Error HTTP ${res.status}`)
    }

    touchActiveSession()
    return data
  },
}

export const clientApi = {
  /** POST MIS_DATOS_URL { id_cliente: user.email.toLowerCase(), email: user.email.toLowerCase() } */
  misDatos: async (id_cliente) => {
    const cleanId = toClientEmailId(id_cliente)
    return normalizeClientData(await callWebhook(MIS_DATOS_URL, { id_cliente: cleanId, email: cleanId }))
  },

  /** POST GESTION_EMPRESAS_URL { accion: "listar", id_cliente: user.email.toLowerCase() } */
  listarEmpresas: async (id_cliente) => {
    const cleanId = toClientEmailId(id_cliente)
    const data = await callWebhook(GESTION_EMPRESAS_URL, {
      accion: 'listar',
      id_cliente: cleanId,
    })
    return normalizeEmpresasResponse(data)
  },

  /**
   * POST GESTION_EMPRESAS_URL { accion: "agregar", id_cliente: user.email.toLowerCase(), nombre_empresa, sitio_web, sector, pais }
   */
  agregarEmpresa: async (id_cliente, c = {}) => {
    const cleanId = toClientEmailId(id_cliente)
    return callWebhook(GESTION_EMPRESAS_URL, {
      accion: 'agregar',
      id_cliente: cleanId,
      nombre_empresa: String(c.nombre_empresa ?? c.nombre ?? '').trim(),
      sitio_web: String(c.sitio_web ?? c.dominio_web ?? '').trim(),
      sector: String(c.sector ?? c.industria ?? '').trim(),
      pais: String(c.pais ?? '').trim(),
    })
  },

  /** Agrega una o varias empresas válidas enviando accion: "agregar" a GESTION_EMPRESAS_URL. */
  guardarEmpresas: async (id_cliente, empresas = []) => {
    const cleanId = toClientEmailId(id_cliente)
    let lastRes = null
    for (const c of empresas) {
      const nombre = String(c?.nombre_empresa ?? c?.nombre ?? '').trim()
      const web = String(c?.sitio_web ?? c?.dominio_web ?? '').trim()
      if (!nombre && !web) continue
      lastRes = await clientApi.agregarEmpresa(cleanId, c)
    }
    return lastRes
  },

  /**
   * POST GESTION_EMPRESAS_URL { accion: "eliminar", id: <id numérico>, id_cliente: user.email.toLowerCase() }
   */
  eliminarEmpresas: async (id_cliente, items = []) => {
    const cleanId = toClientEmailId(id_cliente)
    let lastRes = null
    for (const c of items) {
      if (c?.id === null || c?.id === undefined || String(c.id).trim() === '') continue
      const parsedId = Number(c.id)
      const numericId = Number.isFinite(parsedId) ? parsedId : c.id
      lastRes = await callWebhook(GESTION_EMPRESAS_URL, {
        accion: 'eliminar',
        id: numericId,
        id_cliente: cleanId,
      })
    }
    return lastRes
  },
}

export const searchApi = {
  /** POST EXPLORATORIA_URL sin AbortController ni timeout corto (permite hasta 10 minutos). */
  exploratoria: (payload) =>
    callSearchEndpoint(
      EXPLORATORIA_URL,
      { ...payload, id_cliente: toClientEmailId(payload?.id_cliente || payload?.email) },
      payload?.idioma || 'es',
    ),
  /** POST ESPECIFICA_URL sin AbortController ni timeout corto (permite hasta 10 minutos). */
  especifica: (payload) =>
    callSearchEndpoint(
      ESPECIFICA_URL,
      { ...payload, id_cliente: toClientEmailId(payload?.id_cliente || payload?.email) },
      payload?.idioma || 'es',
    ),
}

export const resultsApi = {
  /**
   * Soft delete de filas del dashboard con id_cliente = email.toLowerCase().
   */
  ocultar: async (id_cliente, tabla, ids) => {
    const cleanId = toClientEmailId(id_cliente)
    const cleanIds = Array.isArray(ids) ? ids : [ids]
    const payload = {
      id_cliente: cleanId,
      email: cleanId,
      tabla,
      ids: cleanIds,
      id_registro: cleanIds.length === 1 ? cleanIds[0] : cleanIds,
    }
    try {
      return await callWebhook('OCULTAR_RESULTADOS_WEBHOOK', payload)
    } catch {
      return callWebhook('OCULTAR_REGISTRO_WEBHOOK', payload)
    }
  },
}

export const adminApi = {
  /** POST admin-gestion { accion, id_admin, ...payload } */
  run: (accion, id_admin, payload = {}) => {
    const cleanAdmin = toClientEmailId(id_admin)
    return callWebhook('ADMIN_WEBHOOK', {
      accion,
      id_admin: cleanAdmin,
      ...payload,
      ...(payload.id_cliente !== undefined ? { id_cliente: toClientEmailId(payload.id_cliente) } : {}),
    })
  },
  listarTodo: async (id_admin) => normalizeAdminData(await adminApi.run('listar_todo', id_admin)),
  consultarBoveda: async (id_admin, token_licencia) =>
    normalizeAdminData(await adminApi.run('consultar_boveda', id_admin, { token_licencia, master_token: token_licencia })),
}

export const leadsApi = {
  /** POST contacto-leads { nombre, empresa, email, telefono, paquete_interes, mensaje } */
  submitContact: ({ nombre, empresa, email, telefono, paquete_interes, mensaje }) =>
    callWebhook('CONTACTO_WEBHOOK', {
      nombre,
      empresa,
      email: String(email || '').trim().toLowerCase(),
      telefono,
      paquete_interes,
      mensaje,
    }),
}
