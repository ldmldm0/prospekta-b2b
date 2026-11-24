import { ALL_COUNTRIES_VALUE, ALL_SIZES_VALUE, quantityRangeLabel } from '../../config/searchOptions'
import { searchApi, toClientEmailId } from '../../services/api'

/** Normaliza la lista de países: si incluye "Todos" o está vacía, envía ["Todos"] para que n8n no descarte por ubicación. */
const normalizeCountriesPayload = (paises = []) => {
  if (!Array.isArray(paises) || !paises.length || paises.includes(ALL_COUNTRIES_VALUE)) {
    return [ALL_COUNTRIES_VALUE]
  }
  return [...paises]
}

/** Normaliza tamaños de empresa. */
const normalizeSizesPayload = (tamanos = []) => {
  if (!Array.isArray(tamanos) || !tamanos.length || tamanos.includes(ALL_SIZES_VALUE)) {
    return [ALL_SIZES_VALUE]
  }
  return [...tamanos]
}

/**
 * Construye el payload para POST exploratoria o POST especifica.
 * `id_cliente` es SIEMPRE el correo electrónico en minúsculas del usuario autenticado (`user.email.toLowerCase()`).
 */
export function buildExploratoriaPayload({ usuario, lang, exploratoria }) {
  const id_cliente = toClientEmailId(usuario?.email || usuario?.id_cliente)
  const cantidad_resultados = quantityRangeLabel(exploratoria.cantidad)
  return {
    id_cliente,
    email: id_cliente,
    perfil: String(exploratoria.perfil || '').trim(),
    industrias: Array.isArray(exploratoria.industrias) ? [...exploratoria.industrias] : [],
    paises: normalizeCountriesPayload(exploratoria.paises),
    tamanos: normalizeSizesPayload(exploratoria.tamanos),
    areas: Array.isArray(exploratoria.areas) ? [...exploratoria.areas] : [],
    niveles: Array.isArray(exploratoria.niveles) ? [...exploratoria.niveles] : [],
    cantidad_resultados,
    cantidad: cantidad_resultados,
    idioma: lang,
  }
}

export function buildEspecificaPayload({ usuario, lang, especifica, companies, files }) {
  const id_cliente = toClientEmailId(usuario?.email || usuario?.id_cliente)
  const cantidad_resultados = quantityRangeLabel(especifica.cantidad)
  return {
    id_cliente,
    email: id_cliente,
    empresas: (companies || []).map((c) => ({
      id: c.id ?? null,
      id_cliente,
      nombre_empresa: c.nombre_empresa,
      dominio_web: c.dominio_web || '',
      industria: c.industria || '',
      estado: c.estado || 'pendiente',
      nombre: c.nombre_empresa,
      sitio_web: c.dominio_web || '',
    })),
    archivos: (files || []).map(({ name, type, content }) => ({ name, type, content })),
    perfil: String(especifica.perfil || '').trim(),
    paises: normalizeCountriesPayload(especifica.paises),
    tamanos: normalizeSizesPayload(especifica.tamanos),
    areas: Array.isArray(especifica.areas) ? [...especifica.areas] : [],
    niveles: Array.isArray(especifica.niveles) ? [...especifica.niveles] : [],
    cantidad_resultados,
    cantidad: Number(especifica.cantidad) || 50,
    idioma: lang,
  }
}

/**
 * Ejecuta la búsqueda real contra n8n.
 * Avanza la barra de progreso de la pestaña correspondiente mientras espera la respuesta del servidor.
 */
export async function runSearch(mode, payload, { onStep }) {
  let i = 0
  onStep(0)
  const timer = setInterval(() => onStep(Math.min(++i, 2)), 2500)
  try {
    return await (mode === 'exploratoria' ? searchApi.exploratoria(payload) : searchApi.especifica(payload))
  } finally {
    clearInterval(timer)
  }
}
