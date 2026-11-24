/**
 * PROSPEKTA · Paquetes comerciales oficiales (bilingüe ES / EN)
 * Edita libremente nombres, volúmenes y beneficios.
 * - `featured`: resalta la tarjeta como destacada / más popular.
 * - `prefix`: prefijo opcional delante del número (ej. "+" para "+2.000").
 */

export const PACKAGES = [
  {
    id: 'pymes',
    credits: 300,
    prefix: '',
    featured: false,
    es: {
      name: 'Plan PyMEs / Inicio',
      unit: 'contactos verificados',
      creditSub: '300 créditos',
      description: 'Ideal para empresas pequeñas y medianas que inician su prospección B2B.',
      features: [
        'Acceso a Búsqueda Exploratoria y Específica',
        'Verificación de correos y teléfonos',
        'Exportación CSV',
      ],
    },
    en: {
      name: 'SME / Starter Plan',
      unit: 'verified contacts',
      creditSub: '300 credits',
      description: 'Ideal for small and medium businesses starting their B2B prospecting.',
      features: [
        'Access to Exploratory and Specific Search',
        'Email and phone verification',
        'CSV export',
      ],
    },
  },
  {
    id: 'crecimiento',
    credits: 1000,
    prefix: '',
    featured: true,
    es: {
      name: 'Plan Crecimiento',
      badge: 'Más Popular',
      unit: 'contactos verificados',
      creditSub: '1.000 créditos',
      description: 'Diseñado para equipos comerciales en expansión que requieren flujo constante de tomadores de decisión.',
      features: [
        'Todo lo del Plan PyMEs / Inicio',
        'Filtros avanzados por área y jerarquía',
        'Carga masiva de empresas',
        'Soporte prioritario',
      ],
    },
    en: {
      name: 'Growth Plan',
      badge: 'Most Popular',
      unit: 'verified contacts',
      creditSub: '1,000 credits',
      description: 'Designed for growing sales teams that need a steady flow of decision-makers.',
      features: [
        'Everything in the SME / Starter Plan',
        'Advanced filters by area and seniority',
        'Bulk company upload',
        'Priority support',
      ],
    },
  },
  {
    id: 'corporativo',
    credits: 2000,
    prefix: '+',
    featured: false,
    es: {
      name: 'Plan Corporativo',
      unit: 'contactos verificados',
      creditSub: 'Paquetes a medida desde 2.000 créditos en adelante',
      description: 'Para operaciones B2B de alto volumen, múltiples mercados internacionales y campañas dedicadas.',
      features: [
        'Todo lo del Plan Crecimiento',
        'Acompañamiento personalizado',
        'Asignación flexible de créditos',
      ],
    },
    en: {
      name: 'Corporate Plan',
      unit: 'verified contacts',
      creditSub: 'Tailored packages from 2,000 credits upwards',
      description: 'For high-volume B2B operations, multiple international markets and dedicated campaigns.',
      features: [
        'Everything in the Growth Plan',
        'Personalized guidance',
        'Flexible credit allocation',
      ],
    },
  },
]
