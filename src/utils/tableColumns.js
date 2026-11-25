/**
 * Derivación dinámica de columnas, etiquetas, formateo y extracción de ID
 * para las tablas de resultados y leads que devuelve n8n.
 */

const HIDDEN_KEYS = new Set([
  'oculto',
  'eliminado',
  'visible',
  'visible_en_dashboard',
  'visible_dashboard',
  'visible en dashboard',
  'mostrar_dashboard',
  'estado_registro',
  'estado_busqueda',
  'id_ejecucion',
  'deleted_at',
  'updated_at',
  'password',
  'password_hash',
  'contrasena',
])
const INTERNAL_ID_RE = /^id(_|$)/i
const TECHNICAL_VISIBILITY_RE = /^visible(_|\s|$)|(_|\s)dashboard$/i

const PRIORITY_ORDER = [
  'empresa',
  'nombre_empresa',
  'company',
  'sitio_web',
  'dominio_web',
  'web',
  'website',
  'dominio',
  'domain',
  'linkedin_empresa',
  'nombre',
  'name',
  'contacto',
  'cargo',
  'title',
  'puesto',
  'area',
  'nivel',
  'email',
  'correo',
  'verificador',
  'estado_email',
  'telefono',
  'phone',
  'whatsapp',
  'linkedin',
  'linkedin_contacto',
  'resumen',
  'descripcion',
  'industria',
  'sector',
  'tamano',
  'empleados',
  'ubicacion',
  'ciudad',
  'pais',
  'paquete_interes',
  'mensaje',
  'estado',
  'fecha',
  'created_at',
]

const URL_KEY_RE = /(web|website|sitio|url|linkedin|dominio|domain|enlace|perfil_linkedin|link)/i
const EMAIL_KEY_RE = /(email|correo)/i
const PHONE_KEY_RE = /(telefono|phone|whatsapp|celular|movil)/i
const ISO_DATE_RE = /^\d{4}-\d{2}-\d{2}(T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:?\d{2})?)?$/

/** Obtiene el ID de fila para soft delete (id o primera clave id_* distinta de id_cliente). */
export function getRowId(row) {
  if (!row || typeof row !== 'object') return null
  if (row.id !== undefined && row.id !== null && row.id !== '') return row.id
  if (row.id_registro !== undefined && row.id_registro !== null && row.id_registro !== '') return row.id_registro
  const alt = Object.keys(row).find((k) => /^id_/i.test(k) && k.toLowerCase() !== 'id_cliente' && row[k] !== undefined && row[k] !== null && row[k] !== '')
  return alt ? row[alt] : null
}

/** Convierte una clave snake_case o camelCase en etiqueta legible. */
export function humanizeKey(key) {
  return String(key)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (c) => c.toUpperCase())
}

/** Deriva columnas ordenadas desde la unión de claves de las filas, ocultando columnas técnicas internas. */
export function deriveColumns(rows, colLabels = {}, { hideKeys = [] } = {}) {
  const extraHidden = new Set(hideKeys.map((k) => k.toLowerCase()))
  const seen = new Set()

  for (const row of rows) {
    if (!row || typeof row !== 'object') continue
    for (const key of Object.keys(row)) {
      const lower = key.toLowerCase().trim()
      if (
        HIDDEN_KEYS.has(lower) ||
        extraHidden.has(lower) ||
        INTERNAL_ID_RE.test(lower) ||
        TECHNICAL_VISIBILITY_RE.test(lower)
      ) {
        continue
      }
      seen.add(key)
    }
  }

  const orderIndex = (k) => {
    const idx = PRIORITY_ORDER.indexOf(k.toLowerCase())
    return idx === -1 ? PRIORITY_ORDER.length : idx
  }

  return Array.from(seen)
    .sort((a, b) => orderIndex(a) - orderIndex(b))
    .map((key) => ({
      key,
      label: colLabels[key.toLowerCase()] || humanizeKey(key),
    }))
}

/** Formatea un valor para texto plano (búsqueda, CSV y Excel). */
export function formatPlainValue(value, locale = 'es-CO') {
  if (value === null || value === undefined || value === '') return ''
  if (typeof value === 'boolean') return value ? 'Sí' : 'No'
  if (Array.isArray(value)) return value.join(', ')
  if (typeof value === 'object') return JSON.stringify(value)
  const str = String(value).trim()
  if (ISO_DATE_RE.test(str)) {
    const d = new Date(str)
    if (!Number.isNaN(d.getTime())) {
      return d.toLocaleDateString(locale, { year: 'numeric', month: 'short', day: '2-digit' })
    }
  }
  return str
}

export const isUrlValue = (key, val) => {
  if (!val || typeof val !== 'string') return false
  const s = val.trim()
  if (/^https?:\/\//i.test(s) || /^(www\.)?linkedin\.com\//i.test(s)) return true
  return URL_KEY_RE.test(key) && /^([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i.test(s)
}

export const toHref = (val) => {
  const s = String(val).trim()
  return /^https?:\/\//i.test(s) ? s : `https://${s}`
}

export const isEmailKey = (key) => EMAIL_KEY_RE.test(key)
export const isPhoneKey = (key) => PHONE_KEY_RE.test(key)
