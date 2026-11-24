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

  const [processingState, setProcessingState] = useState({
    estadoBusqueda: null,
    isProcessing: false,
    processingMeta: null,
    lockedSaldoInicial: null,
    liveSaldoCreditos: null,
  })

  const startActivity = useCallback(
    (type, { baselineCount = 0, baselineCredits = null, baselineIds = [], requestedMeta = null } = {}) => {
      const id = `${type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`
      const startedAt = Date.now()
      const numCredits =
        baselineCredits !== null && baselineCredits !== undefined && Number.isFinite(Number(baselineCredits))
          ? Number(baselineCredits)
          : null
      const numMeta =
        requestedMeta !== null && requestedMeta !== undefined && Number(requestedMeta) > 0
          ? Number(requestedMeta)
          : null

      setActivities((prev) => [
        {
          id,
          type, // 'exploratoria' | 'especifica'
          status: 'running', // 'running' | 'completed' | 'error'
          startedAt,
          finishedAt: null,
          baselineCount,
          baselineIds: Array.isArray(baselineIds) ? baselineIds : [],
          baselineCredits: numCredits,
          registrosNuevos: 0,
          metaSolicitada: numMeta,
        },
        ...prev.slice(0, 7),
      ])

      if (type === 'exploratoria' && numCredits !== null) {
        setProcessingState((prev) => ({
          ...prev,
          lockedSaldoInicial: prev.lockedSaldoInicial ?? numCredits,
          processingMeta: prev.processingMeta ?? numMeta,
        }))
      }
      return id
    },
    [],
  )

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
   * - cambia el saldo_creditos del cliente (y ya no está en procesando:N).
   * Nunca cierra la ejecución solo porque aparezcan registros nuevos mientras sigue procesando.
   */
  const syncResultCounts = useCallback(
    ({ exploratoriaCount = 0, especificaCount = 0, saldoCreditos = null, estadoBusqueda = null }) => {
      const currentNow = Date.now()
      const estadoStr = String(estadoBusqueda || '').trim().toLowerCase()
      const metaMatch = estadoStr.match(/^procesando:(\d+)/)
      const parsedMeta = metaMatch ? Number(metaMatch[1]) : null
      const isProcessingStatus = estadoStr.startsWith('procesando')

      const numericSaldo =
        saldoCreditos !== null && saldoCreditos !== undefined && Number.isFinite(Number(saldoCreditos))
          ? Number(saldoCreditos)
          : null

      setProcessingState((prev) => {
        if (isProcessingStatus) {
          const nextMeta = parsedMeta ?? prev.processingMeta ?? null
          // Si aún no teníamos saldoInicial fijado, tomamos el mayor entre el saldo conocido antes y el actual
          const baseCandidate =
            prev.lockedSaldoInicial !== null
              ? prev.lockedSaldoInicial
              : prev.liveSaldoCreditos !== null && numericSaldo !== null
                ? Math.max(prev.liveSaldoCreditos, numericSaldo)
                : (numericSaldo ?? prev.liveSaldoCreditos)
          if (
            prev.estadoBusqueda === estadoStr &&
            prev.isProcessing === true &&
            prev.processingMeta === nextMeta &&
            prev.lockedSaldoInicial === baseCandidate &&
            prev.liveSaldoCreditos === numericSaldo
          ) {
            return prev
          }
          return {
            estadoBusqueda: estadoStr,
            isProcessing: true,
            processingMeta: nextMeta,
            lockedSaldoInicial: baseCandidate,
            liveSaldoCreditos: numericSaldo,
          }
        }

        // Cuando estado_busqueda cambia a 'completado' (o deja de ser 'procesando'), liberamos el bloqueo y usamos el saldo real de BD
        if (
          prev.estadoBusqueda === (estadoStr || null) &&
          prev.isProcessing === false &&
          prev.processingMeta === null &&
          prev.lockedSaldoInicial === null &&
          prev.liveSaldoCreditos === numericSaldo
        ) {
          return prev
        }
        return {
          estadoBusqueda: estadoStr || null,
          isProcessing: false,
          processingMeta: null,
          lockedSaldoInicial: null,
          liveSaldoCreditos: numericSaldo,
        }
      })

      setActivities((prev) => {
        let changed = false
        let hasExpRunning = false

        const next = prev.map((a) => {
          if (a.type === 'exploratoria' && a.status === 'running') {
            hasExpRunning = true
          }
          if (a.status !== 'running') return a
          const count = a.type === 'exploratoria' ? exploratoriaCount : especificaCount
          const elapsed = currentNow - a.startedAt
          const rawNuevos = Math.max(0, count - a.baselineCount)
          const nextMeta = parsedMeta ?? a.metaSolicitada ?? null
          // Tope visual en tiempo real: durante procesando:N nunca mostrar más de N encontrados
          const registrosNuevos =
            isProcessingStatus && nextMeta && nextMeta > 0 ? Math.min(rawNuevos, nextMeta) : rawNuevos

          const creditsChanged =
            numericSaldo !== null &&
            a.baselineCredits !== null &&
            a.baselineCredits !== undefined &&
            Number(numericSaldo) !== Number(a.baselineCredits)
          const serverCompleted = estadoStr === 'completado' && elapsed >= MIN_COMPLETION_SIGNAL_MS

          if (!isProcessingStatus && (serverCompleted || creditsChanged || elapsed >= MAX_POLL_DURATION_MS)) {
            changed = true
            return {
              ...a,
              registrosNuevos: rawNuevos,
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

        // Si el backend reporta procesando:N al recargar la página y no había actividad local registrada, la creamos automáticamente
        if (isProcessingStatus && !hasExpRunning) {
          changed = true
          const id = `exploratoria-${currentNow}-sync`
          return [
            {
              id,
              type: 'exploratoria',
              status: 'running',
              startedAt: currentNow,
              finishedAt: null,
              baselineCount: exploratoriaCount,
              baselineIds: [],
              baselineCredits: numericSaldo,
              registrosNuevos: 0,
              metaSolicitada: parsedMeta,
            },
            ...next.slice(0, 7),
          ]
        }

        return changed ? next : prev
      })
    },
    [],
  )

  const activeActivities = useMemo(() => activities.filter((a) => a.status === 'running'), [activities])
  const hasRunning = activeActivities.length > 0 || processingState.isProcessing

  const runningExploratoria = useMemo(
    () => activeActivities.find((a) => a.type === 'exploratoria') || null,
    [activeActivities],
  )

  const reservationMeta = useMemo(() => {
    if (processingState.isProcessing && processingState.processingMeta > 0) {
      return processingState.processingMeta
    }
    if (processingState.isProcessing && runningExploratoria?.metaSolicitada > 0) {
      return runningExploratoria.metaSolicitada
    }
    return null
  }, [processingState.isProcessing, processingState.processingMeta, runningExploratoria])

  /**
   * Calcula el saldo visible blindado:
   * - Mientras `estado_busqueda` sea `procesando:N` (o haya búsqueda exploratoria activa en `procesando:N`),
   *   congela el saldo visible en `saldoInicial` (y nunca permite que caiga por debajo de `saldoInicial - N`).
   * - Cuando `estado_busqueda` cambia a `completado`, muestra el valor real devuelto por la base de datos.
   */
  const getVisualCredits = useCallback(
    (rawCredits) => {
      const dbCredits = Number(rawCredits ?? 0)
      if (!processingState.isProcessing) {
        return dbCredits
      }
      const saldoInicial =
        runningExploratoria?.baselineCredits ??
        processingState.lockedSaldoInicial ??
        dbCredits
      // Congelamos el saldo visible en saldoInicial (protegiendo que jamás caiga por debajo de saldoInicial - N)
      const n = reservationMeta ?? 0
      const minFloor = n > 0 ? Math.max(0, saldoInicial - n) : saldoInicial
      return Math.max(saldoInicial, minFloor)
    },
    [processingState.isProcessing, processingState.lockedSaldoInicial, runningExploratoria, reservationMeta],
  )

  // Temporizador de 1s mientras haya procesos activos para mostrar mm:ss en vivo
  useEffect(() => {
    if (!hasRunning) return undefined
    setNow(Date.now())
    const timer = setInterval(() => {
      const current = Date.now()
      setNow(current)
      // Si alguna actividad superó las 2 horas, marcarla como finalizada
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

  // Auto-sincronización cada 15 segundos mientras exista una búsqueda activa
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
      isProcessing: processingState.isProcessing,
      estadoBusqueda: processingState.estadoBusqueda,
      reservationMeta,
      runningExploratoria,
      getVisualCredits,
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
      processingState.isProcessing,
      processingState.estadoBusqueda,
      reservationMeta,
      runningExploratoria,
      getVisualCredits,
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
