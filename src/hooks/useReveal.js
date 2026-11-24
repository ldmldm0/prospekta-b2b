import { useEffect } from 'react'

/** Añade .is-visible a los elementos .reveal cuando entran en pantalla. */
export function useReveal(deps = []) {
  useEffect(() => {
    const els = document.querySelectorAll('.reveal:not(.is-visible)')
    if (!('IntersectionObserver' in window)) {
      els.forEach((el) => el.classList.add('is-visible'))
      return
    }
    const io = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('is-visible')
            io.unobserve(e.target)
          }
        }),
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' },
    )
    els.forEach((el) => io.observe(el))
    return () => io.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps)
}

/**
 * Desplazamiento suave a una sección de la Landing.
 * Si el destino es el formulario de solicitud de acceso (#solicitar-acceso o #contactar),
 * enfoca automáticamente el primer campo del formulario (#c-nombre).
 */
export const scrollToSection = (id, { focusFirstInput = false } = {}) => {
  const isAccessSection = id === 'solicitar-acceso' || id === 'contactar'
  const target =
    document.getElementById(id) ||
    (isAccessSection ? document.getElementById('solicitar-acceso') || document.getElementById('contactar') : null)

  if (!target) return false
  target.scrollIntoView({ behavior: 'smooth', block: 'start' })

  if (isAccessSection || focusFirstInput) {
    setTimeout(() => {
      const firstInput = document.getElementById('c-nombre') || target.querySelector('input, select, textarea')
      firstInput?.focus({ preventScroll: true })
    }, 450)
  }
  return true
}

/** Solicita ir a #solicitar-acceso incluso cuando se navega desde otra vista (ej. /login). */
let pendingSectionScroll = null

export const requestScrollToSection = (id) => {
  if (!scrollToSection(id, { focusFirstInput: id === 'solicitar-acceso' || id === 'contactar' })) {
    pendingSectionScroll = id
  }
}

export const consumePendingSectionScroll = () => {
  const id = pendingSectionScroll
  pendingSectionScroll = null
  return id
}
