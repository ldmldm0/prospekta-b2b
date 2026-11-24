import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ActivityContext = createContext(null)

const MAX_POLL_DURATION_MS = 120 * 60 * 1000 // 120 minutos (2 horas)
const POLL_INTERVAL_MS = 15 * 1000 // 15 segundos
const MIN_COMPLETION_SIGNAL_MS = 15 * 1000 // 15 segundos

/**
 * Contexto global para rastrear ejecuciones en vivo (Búsqueda Exploratoria / Específica)
 * y auto-sincronizar `mis-datos` + `gestion-empresas` cada 15s (hasta 2 horas) mientras haya actividad.
 */
export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState([])
  const [now, setNow] = useState(() => Date.now())
  const refreshHandlerRef = useRef(null)
  const [manualRefreshing, setManualRefreshing] = useState(false)

  const registerRefreshHandler = useCallback((fn) => {
    refreshHandlerRef.current = typeof fn === 'function' ? fn : null
    return () => {
      if (refreshHandlerRef.current === fn) {
        refreshHandlerRef.current = null
      }
    }
  }, [])

  const triggerRefresh = useCallback(async () => {
    if (!refreshHandlerRef.current) return null
    setManualRefreshing(true)
    try {
      return await refreshHandlerRef.current()
    } finally {
      setManualRefreshing(false)
    }
  }, [])

  const startActivity = useCallback((type, { baselineCount = 0, baselineCredits = null } = {}) => {
    const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
    const startedAt = Date.now()
    setActivities((prev) => [
      {
        id,
        type, // 'exploratoria' | 'especifica'
        status: 'running', // 'running' | 'completed' | 'error'
        startedAt,
        finishedAt: null,
        baselineCount,
        baselineCredits: baselineCredits !== null && baselineCredits !== undefined ? Number(baselineCredits) : null,
        registrosNuevos: 0,
        metaSolicitada: null,
      },
      ...prev.slice(0, 7),
    ])
    return id
  }, [])

  const completeActivity = useCallback((id) => {
    if (!id) return
    setActivities((prev) =>
      prev.map((a) => (a.id === id && a.status === 'running' ? { ...a, status: 'completed', finishedAt: Date.now() } : a)),
    )
  }, [])

  const failActivity = useCallback((id, errorMessage) => {
    if (!id) return
    setActivities((prev) =>
      prev.map((a) =>
        a.id === id && a.status === 'running'
          ? {
              ...a,
              status: 'error',
              finishedAt: Date.now(),
              errorMessage:
                errorMessage || 'La búsqueda falló en el servidor. Revisa los parámetros o intenta nuevamente.',
            }
          : a,
      ),
    )
  }, [])

  /**
   * Evalúa un error de búsqueda:
   * - Solo marca Error y detiene el sondeo cuando el servidor responde explícitamente HTTP 400 (o 500 distinto de 502/504)
   *   junto a { ok: false }.
   * - Ante 502, 504, Failed to fetch o AbortError, mantiene el estado activo y el sondeo cada 15s.
   */
  const handleSearchError = useCallback(
    (id, err) => {
      const status = Number(err?.status || 0)
      const isProxyTimeout = status === 502 || status === 504
      const isExplicitServerError =
        (status === 400 || (status >= 500 && !isProxyTimeout)) && err?.data?.ok === false
      const isExplicitOkFalse = err?.data?.ok === false && !isProxyTimeout

      if (!isExplicitServerError && !isExplicitOkFalse) {
        return { keepPolling: true, message: '' }
      }

      const exactServerMsg =
        err?.data?.error ||
        err?.data?.mensaje ||
        err?.data?.message ||
        err?.message ||
        'La búsqueda falló en el servidor. Revisa los parámetros o intenta nuevamente.'

      failActivity(id, exactServerMsg)
      return { keepPolling: false, message: exactServerMsg }
    },
    [failActivity],
  )

  /**
   * Actualiza avance en vivo (registrosNuevos / metaSolicitada desde estado_busqueda "procesando:META")
   * y marca como 'completed' ÚNICAMENTE cuando:
   * - mis-datos devuelve estado_busqueda === 'completado' (tras al menos 15s desde el inicio), o
   * - cambia el saldo_creditos del cliente.
   * Nunca cierra la ejecución solo porque aparezcan registros nuevos mientras sigue procesando.
   */
  const syncResultCounts = useCallback(
    ({ exploratoriaCount = 0, especificaCount = 0, saldoCreditos = null, estadoBusqueda = null }) => {
      const currentNow = Date.now()
      const estadoStr = String(estadoBusqueda || '').trim().toLowerCase()
      const metaMatch = estadoStr.match(/^procesando:(\d+)/)
      const parsedMeta = metaMatch ? Number(metaMatch[1]) : null
      const isProcessingStatus = estadoStr.startsWith('procesando')

      setActivities((prev) => {
        let changed = false
        const next = prev.map((a) => {
          if (a.status !== 'running') return a
          const count = a.type === 'exploratoria' ? exploratoriaCount : especificaCount
          const elapsed = currentNow - a.startedAt
          const registrosNuevos = Math.max(0, count - a.baselineCount)
          const nextMeta = parsedMeta ?? a.metaSolicitada ?? null

          const creditsChanged =
            saldoCreditos !== null &&
            saldoCreditos !== undefined &&
            a.baselineCredits !== null &&
            a.baselineCredits !== undefined &&
            Number(saldoCreditos) !== Number(a.baselineCredits)
          const serverCompleted = estadoStr === 'completado' && elapsed >= MIN_COMPLETION_SIGNAL_MS

          if (!isProcessingStatus && (serverCompleted || creditsChanged || elapsed >= MAX_POLL_DURATION_MS)) {
            changed = true
            return {
              ...a,
              registrosNuevos,
              metaSolicitada: nextMeta,
              status: 'completed',
              finishedAt: currentNow,
            }
          }

          if (registrosNuevos !== a.registrosNuevos || nextMeta !== a.metaSolicitada) {
            changed = true
            return {
              ...a,
              registrosNuevos,
              metaSolicitada: nextMeta,
            }
          }

          return a
        })
        return changed ? next : prev
      })
    },
    [],
  )

  const activeActivities = useMemo(() => activities.filter((a) => a.status === 'running'), [activities])
  const hasRunning = activeActivities.length > 0

  // Temporizador de 1s mientras haya procesos activos para mostrar mm:ss en vivo
  useEffect(() => {
    if (!hasRunning) return undefined
    setNow(Date.now())
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      // Si alguna actividad superó los 15 minutos, marcarla como finalizada
      setActivities((prev) => {
        let changed = false
        const next = prev.map((a) => {
          if (a.status === 'running' && current - a.startedAt >= MAX_POLL_DURATION_MS) {
            changed = true
            return { ...a, status: 'completed', finishedAt: current }
          }
          return a
        })
        return changed ? next : prev
      })
    }, 1000)
    return () => clearInterval(timer)
  }, [hasRunning])

  // Auto-sincronización cada 20 segundos (hasta 15 minutos) mientras exista una búsqueda activa
  useEffect(() => {
    if (!hasRunning) return undefined
    const poller = setInterval(() => {
      if (refreshHandlerRef.current) {
        refreshHandlerRef.current()
      }
    }, POLL_INTERVAL_MS)
    return () => clearInterval(poller)
  }, [hasRunning])

  const value = useMemo(
    () => ({
      activities,
      activeActivities,
      hasRunning,
      now,
      manualRefreshing,
      startActivity,
      completeActivity,
      failActivity,
      handleSearchError,
      syncResultCounts,
      registerRefreshHandler,
      triggerRefresh,
    }),
    [
      activities,
      activeActivities,
      hasRunning,
      now,
      manualRefreshing,
      startActivity,
      completeActivity,
      failActivity,
      handleSearchError,
      syncResultCounts,
      registerRefreshHandler,
      triggerRefresh,
    ],
  )

  return <ActivityContext.Provider value={value}>{children}</ActivityContext.Provider>
}

export function useActivity() {
  return useContext(ActivityContext)
}
