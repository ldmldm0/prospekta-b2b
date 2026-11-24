/**
 * PROSPEKTA · Identidad y datos de contacto oficiales.
 *
 * LOGOS OFICIALES TRANSPARENTES (sin recuadro blanco):
 * - Modo Claro: public/logo-prospekta.png
 * - Modo Oscuro: public/logo-prospekta-dark.png
 */
export const BRAND = {
  name: 'PROSPEKTA',
  tagline: 'Inteligencia Comercial B2B',
  motto: 'Encuentra · Conecta · Crece',
  signature: 'By Fiumi & Levitze',
  developer: 'Luciano DLM',
  developerUrl: 'https://contra.com/juancito_luciano_me_ris_vgm7x1qf/work',
  logoSrc: `${import.meta.env.BASE_URL}logo-prospekta.png`,
  logoSrcDark: `${import.meta.env.BASE_URL}logo-prospekta-dark.png`,
}

/**
 * Canales oficiales. Déjalos vacíos ('') para ocultarlos;
 * la sección Contactar mostrará "Disponibles muy pronto".
 * whatsapp: solo dígitos con indicativo, ej. '573001234567'
 */
export const CONTACT_CHANNELS = {
  email: '',
  whatsapp: '',
  whatsappLabel: '',
}
