import { useId, useState } from 'react'
import { BRAND } from '../../config/brand'
import { usePreferences } from '../../context/PreferencesContext'

/**
 * Isotipo vectorial de respaldo: lupa con degradado #0072FF → #021B54 y tres barras ascendentes.
 */
export function LogoMark({ className = 'h-10 w-10' }) {
  const gid = useId().replace(/:/g, '')
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden="true">
      <defs>
        <linearGradient id={`pk-${gid}`} x1="6" y1="6" x2="42" y2="42" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0072FF" />
          <stop offset="1" style={{ stopColor: 'var(--logo-end)' }} />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="14" fill="none" stroke={`url(#pk-${gid})`} strokeWidth="4.5" />
      <path d="M30.5 30.5 42 42" stroke={`url(#pk-${gid})`} strokeWidth="6" strokeLinecap="round" />
      <rect x="12.6" y="20" width="3.6" height="7.5" rx="1.2" fill="#0072FF" />
      <rect x="18.2" y="15.5" width="3.6" height="12" rx="1.2" fill="#0A4FCF" />
      <rect x="23.8" y="11" width="3.6" height="16.5" rx="1.2" fill="#38BDF8" />
    </svg>
  )
}

/**
 * Logo oficial PROSPEKTA 100% transparente (sin pastilla ni contenedor blanco).
 * - Modo Claro: usa /logo-prospekta.png (tipografía azul marino #021B54 + acentos azul eléctrico).
 * - Modo Oscuro: usa /logo-prospekta-dark.png (tipografía en blanco puro #FFFFFF + lupa, 'A', 'B2B' y eslogan en azul brillante).
 * @param {'sm'|'md'|'lg'} size
 */
export default function Logo({ size = 'md', showTagline = true, className = '' }) {
  const { t, theme } = usePreferences()
  const [missing, setMissing] = useState(false)
  const dims = {
    sm: {
      img: 'h-11 sm:h-12',
      mark: 'h-9 w-9',
      name: 'text-base',
      tag: 'text-[8.5px]',
    },
    md: {
      img: 'h-12 sm:h-14',
      mark: 'h-11 w-11',
      name: 'text-xl',
      tag: 'text-[9.5px]',
    },
    lg: {
      img: 'h-14 sm:h-16',
      mark: 'h-14 w-14',
      name: 'text-[28px]',
      tag: 'text-[11px]',
    },
  }[size] || {
    img: 'h-12 sm:h-14',
    mark: 'h-11 w-11',
    name: 'text-xl',
    tag: 'text-[9.5px]',
  }
  const tagline = t('common.tagline')
  const src = theme === 'dark' && BRAND.logoSrcDark ? BRAND.logoSrcDark : BRAND.logoSrc

  if (!missing) {
    return (
      <img
        src={src}
        alt={`${BRAND.name} — ${tagline}`}
        className={`${dims.img} w-auto max-w-full shrink-0 object-contain select-none ${className}`}
        draggable="false"
        onError={() => setMissing(true)}
      />
    )
  }

  return (
    <span className={`inline-flex items-center gap-2.5 ${className}`} aria-label={`${BRAND.name} — ${tagline}`}>
      <LogoMark className={dims.mark} />
      <span className="flex flex-col items-start text-left leading-none">
        <span className={`font-display font-extrabold tracking-[0.04em] text-ink ${dims.name}`}>{BRAND.name}</span>
        {showTagline && (
          <span className={`mt-1 whitespace-nowrap font-semibold uppercase tracking-[0.2em] text-electric ${dims.tag}`}>{tagline}</span>
        )}
      </span>
    </span>
  )
}
