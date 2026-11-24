import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'

const RouterContext = createContext(null)
const KNOWN_ROUTES = ['/login', '/dashboard', '/admin']

/**
 * Normaliza la ruta actual de forma segura.
 * Nunca conserva parámetros de sesión en la URL para que la sesión sea intransferible por link.
 */
export const normalizeRoute = (raw = '/') => {
  const clean = String(raw || '/').split('?')[0].split('#')[0] || '/'
  const trimmed = clean.length > 1 ? clean.replace(/\/+$/, '') : clean
  if (trimmed === '/' || trimmed === '/index.html') return '/'
  if (KNOWN_ROUTES.includes(trimmed)) return trimmed
  const suffix = KNOWN_ROUTES.find((r) => trimmed.endsWith(r))
  return suffix || '/'
}

/** Router minimalista con History API que limpia parámetros de URL y protege las vistas. */
export function RouterProvider({ children }) {
  const [path, setPath] = useState(() => {
    try {
      const normalized = normalizeRoute(window.location.pathname)
      if (window.location.search) {
        window.history.replaceState({}, '', normalized)
      }
      return normalized
    } catch {
      return '/'
    }
  })

  useEffect(() => {
    const onPop = () => {
      try {
        setPath(normalizeRoute(window.location.pathname))
      } catch {
        setPath('/')
      }
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  const navigate = useCallback((to, { replace = false } = {}) => {
    const next = normalizeRoute(to)
    setPath(next)
    try {
      if (normalizeRoute(window.location.pathname) !== next || window.location.search) {
        window.history[replace ? 'replaceState' : 'pushState']({}, '', next)
      }
    } catch {
      // Si History API está restringida en un iframe, el estado de React sigue funcionando
    }
    try {
      window.scrollTo({ top: 0 })
    } catch {
      // ignorar
    }
  }, [])

  const value = useMemo(() => ({ path, navigate }), [path, navigate])
  return <RouterContext.Provider value={value}>{children}</RouterContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useRouter() {
  const ctx = useContext(RouterContext)
  if (!ctx) throw new Error('useRouter debe usarse dentro de <RouterProvider>')
  return ctx
}
