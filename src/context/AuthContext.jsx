import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { normalizeUser, postToN8n } from '../services/api'

const STORAGE_KEY = 'prospekta.session'
export const SESSION_TTL_MS = 30 * 60 * 1000 // 30 minutos
const AUTH_LOGIN_URL = 'https://b2b-n8n.c4adol.easypanel.host/webhook/auth-login'
const AuthContext = createContext(null)

/** Determina si un usuario es el administrador maestro (superadmin). */
export function isSuperAdminUser(u) {
  if (!u || typeof u !== 'object') return false
  const rol = String(u.rol ?? '').trim().toLowerCase()
  if (rol === 'superadmin' || rol === 'super_admin' || rol === 'master') return true
  if (u.es_superadmin === true || u.is_superadmin === true) return true
  return false
}

/** Determina si un usuario debe acceder al panel /admin o /dashboard. */
export function isAdminPanelUser(u) {
  if (!u || typeof u !== 'object') return false
  if (isSuperAdminUser(u)) return true
  const rol = String(u.rol ?? '').trim().toLowerCase()
  return rol === 'admin'
}

function clearStoredSession() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorar
  }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorar
  }
}

function readSession() {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // ignorar
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    const u = parsed?.usuario
    const expiresAt = Number(parsed?.expiresAt) || 0

    if (
      !u ||
      typeof u !== 'object' ||
      (!u.email && !u.id_cliente) ||
      !expiresAt ||
      Date.now() > expiresAt
    ) {
      clearStoredSession()
      return null
    }

    const usuario = normalizeUser(u)
    if (!usuario.id_cliente) {
      clearStoredSession()
      return null
    }
    return { usuario, expiresAt }
  } catch {
    clearStoredSession()
    return null
  }
}

function writeSession(session) {
  if (!session || !session.usuario) {
    clearStoredSession()
    return
  }
  try {
    sessionStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        usuario: session.usuario,
        expiresAt: session.expiresAt || Date.now() + SESSION_TTL_MS,
      }),
    )
  } catch {
    // Entornos sin acceso a sessionStorage
  }
}

export function AuthProvider({ children }) {
  const [session, setSession] = useState(readSession)

  const persist = useCallback((nextUsuario) => {
    if (!nextUsuario) {
      clearStoredSession()
      setSession(null)
      return
    }
    const next = {
      usuario: normalizeUser(nextUsuario),
      expiresAt: Date.now() + SESSION_TTL_MS,
    }
    writeSession(next)
    setSession(next)
  }, [])

  /** Renueva los 30 minutos de la sesión activa en sessionStorage tras cada acción exitosa. */
  const renewSession = useCallback(() => {
    setSession((prev) => {
      if (!prev?.usuario) return prev
      if (Date.now() > prev.expiresAt) {
        clearStoredSession()
        return null
      }
      const next = {
        ...prev,
        expiresAt: Date.now() + SESSION_TTL_MS,
      }
      writeSession(next)
      return next
    })
  }, [])

  // Verifica expiración cada 15 segundos y al recuperar foco/visibilidad; escucha eventos de acción exitosa
  useEffect(() => {
    if (!session?.usuario) return

    const checkExpiry = () => {
      try {
        const raw = sessionStorage.getItem(STORAGE_KEY)
        if (!raw) {
          setSession(null)
          return
        }
        const parsed = JSON.parse(raw)
        if (!parsed?.expiresAt || Date.now() > Number(parsed.expiresAt)) {
          clearStoredSession()
          setSession(null)
        }
      } catch {
        clearStoredSession()
        setSession(null)
      }
    }

    const onTouch = () => renewSession()
    const interval = setInterval(checkExpiry, 15000)
    window.addEventListener('focus', checkExpiry)
    document.addEventListener('visibilitychange', checkExpiry)
    window.addEventListener('prospekta:session-touch', onTouch)

    return () => {
      clearInterval(interval)
      window.removeEventListener('focus', checkExpiry)
      document.removeEventListener('visibilitychange', checkExpiry)
      window.removeEventListener('prospekta:session-touch', onTouch)
    }
  }, [session?.usuario, renewSession])

  /**
   * POST directo a https://b2b-n8n.c4adol.easypanel.host/webhook/auth-login
   * (con respaldo automático same-origin /api/n8n/auth-login si el iframe de preview bloquea dominios cruzados).
   */
  const login = useCallback(
    async (email, password) => {
      const cleanEmail = String(email ?? '').trim().toLowerCase()
      const res = await postToN8n(AUTH_LOGIN_URL, {
        email: cleanEmail,
        password: String(password ?? ''),
      })

      const rawText = await res.text()
      let parsed = {}
      if (rawText) {
        try {
          parsed = JSON.parse(rawText)
        } catch {
          throw new Error(`Respuesta no válida del servidor (HTTP ${res.status}): ${rawText.slice(0, 180)}`)
        }
      }

      const data = Array.isArray(parsed) && parsed.length === 1 && parsed[0] && typeof parsed[0] === 'object' ? parsed[0] : parsed

      if (data?.ok === false) {
        throw new Error(data.mensaje || data.message || data.error || 'Credenciales incorrectas.')
      }

      if (!res.ok) {
        throw new Error(data?.mensaje || data?.message || data?.error || `HTTP ${res.status} al autenticar.`)
      }

      if (data?.ok !== true || !data?.usuario || typeof data.usuario !== 'object') {
        throw new Error(
          data?.mensaje ||
            data?.message ||
            `Respuesta inesperada de auth-login: ${rawText ? rawText.slice(0, 180) : 'sin cuerpo JSON (ok/usuario)'}`,
        )
      }

      const rawUser = data.usuario
      const resolvedEmail = String(rawUser.email || rawUser.correo || cleanEmail).trim().toLowerCase()
      const usuario = normalizeUser({
        ...rawUser,
        email: resolvedEmail,
        id_cliente: resolvedEmail,
      })

      persist(usuario)
      return usuario
    },
    [persist],
  )

  const logout = useCallback(() => persist(null), [persist])

  /** Actualiza campos del usuario en sesión y renueva los 30 minutos. */
  const updateUser = useCallback((patch) => {
    if (!patch || typeof patch !== 'object') return
    setSession((s) => {
      if (!s?.usuario) return s
      const mergedEmail = String(patch.email || s.usuario.email || s.usuario.id_cliente || '')
        .trim()
        .toLowerCase()
      const next = {
        usuario: normalizeUser({
          ...s.usuario,
          ...patch,
          email: mergedEmail,
          id_cliente: mergedEmail,
        }),
        expiresAt: Date.now() + SESSION_TTL_MS,
      }
      writeSession(next)
      return next
    })
  }, [])

  const value = useMemo(() => {
    const usuario = session?.usuario ?? null
    const isSuperAdmin = isSuperAdminUser(usuario)
    const isAdmin = isAdminPanelUser(usuario)
    return {
      usuario,
      expiresAt: session?.expiresAt ?? null,
      isAuthenticated: Boolean(usuario),
      isAdmin,
      isSuperAdmin,
      login,
      logout,
      updateUser,
      renewSession,
    }
  }, [session, login, logout, updateUser, renewSession])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth debe usarse dentro de <AuthProvider>')
  return ctx
}
