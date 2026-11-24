/**
 * PROSPEKTA · Catálogos del Buscador B2B (bilingüe ES / EN)
 * ─ `value` es el valor canónico que se envía al servidor (en español).
 * ─ `es` / `en` son las etiquetas visibles según el idioma activo.
 */

const opt = (es, en) => ({ value: es, es, en })

/** Devuelve la etiqueta de una opción en el idioma activo (o el texto libre si es personalizada). */
export const optionLabel = (list, value, lang) => {
  const found = list.find((o) => o.value === value)
  return found ? found[lang] : value
}

export const ALL_COUNTRIES_VALUE = 'Todos'
export const ALL_SIZES_VALUE = 'Todos los tamaños'

export const COUNTRIES = [
  { value: ALL_COUNTRIES_VALUE, es: 'Todos los países', en: 'All countries' },
  opt('Chile', 'Chile'),
  opt('Argentina', 'Argentina'),
  opt('Perú', 'Peru'),
  opt('Colombia', 'Colombia'),
  opt('México', 'Mexico'),
  opt('Brasil', 'Brazil'),
  opt('Ecuador', 'Ecuador'),
  opt('Uruguay', 'Uruguay'),
  opt('Paraguay', 'Paraguay'),
  opt('Bolivia', 'Bolivia'),
  opt('Costa Rica', 'Costa Rica'),
  opt('Panamá', 'Panama'),
  opt('República Dominicana', 'Dominican Republic'),
  opt('Guatemala', 'Guatemala'),
  opt('Estados Unidos', 'United States'),
  opt('Canadá', 'Canada'),
  opt('España', 'Spain'),
  opt('Alemania', 'Germany'),
  opt('Francia', 'France'),
  opt('Reino Unido', 'United Kingdom'),
  opt('Italia', 'Italy'),
  opt('Portugal', 'Portugal'),
  opt('Países Bajos', 'Netherlands'),
]

export const INDUSTRIES = [
  opt('Tecnología y Servicios TI', 'Technology & IT Services'),
  opt('Desarrollo de Software', 'Software Development'),
  opt('Banca y Finanzas', 'Banking & Finance'),
  opt('Seguros', 'Insurance'),
  opt('Salud, Clínicas y Hospitales', 'Healthcare, Clinics & Hospitals'),
  opt('Farmacéutica', 'Pharmaceutical'),
  opt('Logística y Transporte', 'Logistics & Transportation'),
  opt('Manufactura / Producción', 'Manufacturing / Production'),
  opt('Alimentos y Bebidas', 'Food & Beverage'),
  opt('Retail y Comercio', 'Retail & Commerce'),
  opt('Educación', 'Education'),
  opt('Construcción', 'Construction'),
  opt('Inmobiliario', 'Real Estate'),
  opt('Energía y Minería', 'Energy & Mining'),
  opt('Agroindustria', 'Agribusiness'),
  opt('Telecomunicaciones', 'Telecommunications'),
  opt('Consultoría y Servicios Profesionales', 'Consulting & Professional Services'),
]

/** Ordenados estrictamente de mayor a menor. */
export const SIZES = [
  { value: ALL_SIZES_VALUE, es: 'Todos los tamaños', en: 'All sizes' },
  opt('Más de 1.000 emp.', '1,000+ emp.'),
  opt('501 a 1.000 emp.', '501 – 1,000 emp.'),
  opt('201 a 500 emp.', '201 – 500 emp.'),
  opt('51 a 200 emp.', '51 – 200 emp.'),
  opt('11 a 50 emp.', '11 – 50 emp.'),
  opt('1 a 10 emp.', '1 – 10 emp.'),
]

/** 14 áreas funcionales. */
export const AREAS = [
  opt('Dirección general', 'General Management'),
  opt('Comercial / Ventas', 'Sales'),
  opt('Marketing', 'Marketing'),
  opt('Compras', 'Procurement'),
  opt('Logística', 'Logistics'),
  opt('Finanzas', 'Finance'),
  opt('RRHH / Talento', 'HR / Talent'),
  opt('Tecnología / TI', 'Technology / IT'),
  opt('Producción', 'Production'),
  opt('Calidad', 'Quality'),
  opt('Comunicaciones', 'Communications'),
  opt('Jurídica', 'Legal'),
  opt('Servicio al cliente', 'Customer Service'),
  opt('Ingeniería y Diseño', 'Engineering & Design'),
]

/** 6 niveles jerárquicos. */
export const LEVELS = [
  opt('Propietario / CEO', 'Owner / CEO'),
  opt('Vicepresidente', 'Vice President'),
  opt('Gerente / Director', 'Manager / Director'),
  opt('Jefe / Coordinador', 'Head / Coordinator'),
  opt('Analista / Especialista', 'Analyst / Specialist'),
  opt('Asistente / Auxiliar', 'Assistant'),
]

export const QUANTITIES = [
  { value: 10, range: '1 a 10', es: '1 a 10 prospectos', en: '1 – 10 prospects' },
  { value: 50, range: '11 a 50', es: '11 a 50 prospectos', en: '11 – 50 prospects' },
  { value: 100, range: '51 a 100', es: '51 a 100 prospectos', en: '51 – 100 prospects' },
  { value: 200, range: '51 a 200', es: '51 a 200 prospectos', en: '51 – 200 prospects' },
  { value: 500, range: '201 a 500', es: '201 a 500 prospectos', en: '201 – 500 prospects' },
  { value: 1000, range: '501 a 1.000', es: '501 a 1.000 prospectos', en: '501 – 1,000 prospects' },
  { value: 1500, range: 'Más de 1.000', es: 'Más de 1.000 prospectos', en: '1,000+ prospects' },
  { value: 9999, range: 'Todos los posibles', es: 'Todos los posibles (según saldo)', en: 'As many as possible (up to balance)' },
]

/** Devuelve el texto completo del rango elegido para `cantidad_resultados` (ej. "11 a 50", "51 a 200", "Más de 1.000"). */
export const quantityRangeLabel = (val) => {
  if (typeof val === 'string' && isNaN(Number(val))) return val
  const found = QUANTITIES.find((q) => Number(q.value) === Number(val))
  return found ? found.range : String(val ?? '11 a 50')
}

export const MAX_PROFILE_WORDS = 60

/** Cuenta palabras reales separadas por espacios. */
export const countWords = (text = '') => {
  const trimmed = String(text || '').trim()
  return trimmed ? trimmed.split(/\s+/).length : 0
}

/** Recorta un texto a un máximo de N palabras preservando el espaciado final si aún está dentro del límite. */
export const clampWords = (text = '', max = MAX_PROFILE_WORDS) => {
  const raw = String(text || '')
  const trimmed = raw.trim()
  if (!trimmed) return ''
  const words = trimmed.split(/\s+/)
  if (words.length <= max) return raw
  return words.slice(0, max).join(' ')
}

export const PROFILE_EXAMPLES = [
  {
    es: { label: 'Clínicas', text: 'Clínicas y centros médicos especializados con alta demanda operativa' },
    en: { label: 'Clinics', text: 'Specialized clinics and medical centers with high operational demand' },
  },
  {
    es: { label: 'Software B2B', text: 'Empresas de tecnología que desarrollen software empresarial B2B' },
    en: { label: 'B2B Software', text: 'Technology companies that develop B2B enterprise software' },
  },
  {
    es: { label: 'Manufactura', text: 'Empresas manufactureras de calzado, textiles y dotación industrial' },
    en: { label: 'Manufacturing', text: 'Footwear, textile and industrial workwear manufacturers' },
  },
  {
    es: { label: 'Logística', text: 'Compañías de logística, transporte de carga y cadena de suministro' },
    en: { label: 'Logistics', text: 'Logistics, freight transportation and supply chain companies' },
  },
  {
    es: { label: 'Educación', text: 'Instituciones del sector educativo y universidades privadas' },
    en: { label: 'Education', text: 'Education sector institutions and private universities' },
  },
]

export const createDefaultExploratoria = () => ({
  perfil: '',
  industrias: ['Manufactura / Producción'],
  cantidad: 50,
  paises: ['Colombia', 'México'],
  tamanos: ['201 a 500 emp.', '501 a 1.000 emp.'],
  areas: ['Dirección general', 'Comercial / Ventas', 'Producción'],
  niveles: ['Propietario / CEO', 'Gerente / Director'],
})

export const createDefaultEspecifica = () => ({
  perfil: '',
  paises: [ALL_COUNTRIES_VALUE],
  tamanos: [ALL_SIZES_VALUE],
  cantidad: 50,
  areas: ['Dirección general', 'Comercial / Ventas'],
  niveles: ['Propietario / CEO', 'Gerente / Director'],
})

export const DEFAULT_EXPLORATORIA = createDefaultExploratoria()
export const DEFAULT_ESPECIFICA = createDefaultEspecifica()

/** Formatos aceptados en "Agregue empresas". */
export const COMPANY_FILE_ACCEPT = '.csv,.xlsx,.txt,.pdf'
