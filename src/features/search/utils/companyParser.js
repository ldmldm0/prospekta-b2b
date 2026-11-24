import * as XLSX from 'xlsx'

/**
 * Extrae empresas, dominios e industria de texto libre o CSV/TXT.
 * Cada línea puede traer: "Empresa", "dominio.com", "https://...", o "Empresa, dominio, industria".
 */

const URL_RE = /^(https?:\/\/)?(www\.)?([a-z0-9-]+\.)+[a-z]{2,}(\/\S*)?$/i
const HEADER_RE = /^(empresa|company|nombre|nombre_empresa|name|raz[oó]n social)$/i

export const toDomain = (token = '') =>
  String(token)
    .trim()
    .replace(/^https?:\/\//i, '')
    .replace(/^www\./i, '')
    .replace(/\/.*$/, '')
    .toLowerCase()

const nameFromDomain = (domain) => {
  const base = domain.split('.')[0] || ''
  return base.charAt(0).toUpperCase() + base.slice(1)
}

/** Normaliza cualquier fila de empresa (de PostgreSQL o recién parseada) a la estructura de prospekta_empresas_cliente. */
export function normalizeCompanyRow(raw = {}, idx = 0) {
  const id = raw.id ?? raw.id_empresa ?? raw.id_registro ?? null
  const nombre_empresa = String(raw.nombre_empresa ?? raw.nombre ?? raw.empresa ?? raw.name ?? '').trim()
  const dominio_web = toDomain(raw.sitio_web ?? raw.dominio_web ?? raw.domain ?? raw.dominio ?? raw.website ?? '')
  const industria = String(raw.sector ?? raw.industria ?? raw.industry ?? '').trim()
  const pais = String(raw.pais ?? raw.country ?? '').trim()
  const estadoRaw = String(raw.estado ?? raw.status ?? 'pendiente').trim().toLowerCase()
  const estado = estadoRaw.startsWith('proc') || estadoRaw === 'completada' || estadoRaw === 'enriquecida' ? 'procesada' : 'pendiente'
  const key = (dominio_web || nombre_empresa || `row-${idx}`).toLowerCase()

  return {
    id,
    key: id !== null && id !== undefined && id !== '' ? `id-${id}` : `${key}-${idx}`,
    nombre_empresa: nombre_empresa || (dominio_web ? nameFromDomain(dominio_web) : ''),
    dominio_web,
    sitio_web: dominio_web,
    industria,
    sector: industria,
    pais,
    estado,
  }
}

export function parseCompanies(text, defaultIndustry = '') {
  const out = []
  const seen = new Set()

  String(text || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .forEach((line, i) => {
      const tokens = line
        .split(/[,;\t|]/)
        .map((s) => s.trim().replace(/^"|"$/g, ''))
        .filter(Boolean)
      if (!tokens.length) return
      if (i === 0 && HEADER_RE.test(tokens[0])) return

      const urlIdx = tokens.findIndex((tk) => URL_RE.test(tk))
      const urlToken = urlIdx >= 0 ? tokens[urlIdx] : ''
      const nonUrlTokens = tokens.filter((_, idx) => idx !== urlIdx)

      const dominio_web = urlToken ? toDomain(urlToken) : ''
      const nombre_empresa = nonUrlTokens[0] || (dominio_web ? nameFromDomain(dominio_web) : '')
      const industria = nonUrlTokens[1] || defaultIndustry || ''
      const pais = nonUrlTokens[2] || ''
      if (!nombre_empresa && !dominio_web) return

      const dedupKey = (dominio_web || nombre_empresa).toLowerCase()
      if (seen.has(dedupKey)) return
      seen.add(dedupKey)

      out.push({
        id: null,
        key: `${dedupKey}-${Math.random().toString(36).slice(2, 7)}`,
        nombre_empresa,
        dominio_web,
        sitio_web: dominio_web,
        industria,
        sector: industria,
        pais,
        estado: 'pendiente',
      })
    })

  return out
}

/** Une listas evitando duplicados por dominio_web o nombre_empresa. */
export function mergeCompanies(current = [], incoming = []) {
  const normalizedCurrent = current.map((c, i) => normalizeCompanyRow(c, i))
  const keys = new Set(normalizedCurrent.map((c) => (c.dominio_web || c.nombre_empresa).toLowerCase()).filter(Boolean))
  const fresh = []

  incoming.forEach((raw, i) => {
    const c = normalizeCompanyRow(raw, normalizedCurrent.length + i)
    const k = (c.dominio_web || c.nombre_empresa).toLowerCase()
    if (!k || keys.has(k)) return
    keys.add(k)
    fresh.push(c)
  })

  return { list: [...normalizedCurrent, ...fresh], added: fresh }
}

/** Lee un archivo como texto o base64 (para enviarlo al servidor). */
export const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(r.result)
    r.onerror = reject
    r.readAsText(file)
  })

export const readFileAsBase64 = (file) =>
  new Promise((resolve, reject) => {
    const r = new FileReader()
    r.onload = () => resolve(String(r.result).split(',')[1] || '')
    r.onerror = reject
    r.readAsDataURL(file)
  })

/** Extrae empresas válidas (nombre_empresa o sitio_web no vacíos) desde un archivo Excel (.xlsx / .xls). */
export function parseExcelCompanies(arrayBuffer, defaultIndustry = '') {
  const wb = XLSX.read(arrayBuffer, { type: 'array' })
  const firstSheet = wb.SheetNames[0]
  if (!firstSheet) return []
  const ws = wb.Sheets[firstSheet]
  const csv = XLSX.utils.sheet_to_csv(ws)
  return parseCompanies(csv, defaultIndustry)
}
