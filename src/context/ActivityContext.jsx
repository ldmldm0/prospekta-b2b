import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'

const ActivityContext = createContext(null)

const MAX_POLL_DURATION_MS = 120 * 60 * 1000 // 120 minutos (2 horas)
const POLL_INTERVAL_MS = 15 * 1000 // 15 segundos

/**
 * Parsea `estado_busqueda` con formato `completado:entregados:pedidos` (o `completado`)
 * y construye el mensaje transparente exacto solicitado:
 * - Si entregados >= pedidos: "Búsqueda completada · {entregados} contactos verificados"
 * - Si entregados < pedidos:  "Búsqueda finalizada · Se encontraron {entregados} de {pedidos} contactos que cumplen con tus filtros (solo se descontaron {entregados} créditos)"
 */
export function parseCompletionStatus(estadoStr = '') {
  const clean = String(estadoStr || '').trim().toLowerCase()
  if (!clean.startsWith('completado')) return null

  const match = clean.match(/^completado:(\d+):(\d+)/)
  if (match) {
    const entregados = Number(match[1])
    const pedidos = Number(match[2])
    const message =
      entregados >= pedidos
        ? `Búsqueda completada · ${entregados} contactos verificados`
        : `Búsqueda finalizada · Se encontraron ${entregados} de ${pedidos} contactos que cumplen con tus filtros (solo se descontaron ${entregados} créditos)`
    return {
      isCompleted: true,
      entregados,
      pedidos,
      message,
    }
  }

  const singleMatch = clean.match(/^completado:(\d+)/)
  if (singleMatch) {
    const entregados = Number(singleMatch[1])
    return {
      isCompleted: true,
      entregados,
      pedidos: entregados,
      message: `Búsqueda completada · ${entregados} contactos verificados`,
    }
  }

  return {
    isCompleted: true,
    entregados: null,
    pedidos: null,
    message: 'Búsqueda finalizada',
  }
}

/**
 * Contexto global para rastrear ejecuciones en vivo (Búsqueda Exploratoria / Específica)
 * y auto-sincronizar `mis-datos` + `gestion-empresas` cada 15s (hasta 2 horas) mientras haya actividad.
 */
export function ActivityProvider({ children }) {
  const [activities, setActivities] = useState([])
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
    hasIncompleteRecords: false,
    processingMeta: null,
    completionInfo: null,
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
          completionMessage: null,
        },
        ...prev.slice(0, 7),
      ])

      if (type === 'exploratoria') {
        setProcessingState((prev) => ({
          ...prev,
          isProcessing: true,
          processingMeta: prev.processingMeta ?? numMeta,
          completionInfo: null,
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
   * Sincroniza `estado_busqueda` y `estado_registro`:
   * - Mientras `estado_busqueda` comience con `procesando:` o existan registros del usuario con `estado_registro === 'no_completado_aun'`,
   *   mantiene encendido el punto verde animado ("Búsqueda en curso · Verificando prospectos...").
   * - En cuanto `estado_busqueda` cambie a `completado:...` y no queden filas del usuario en `no_completado_aun`,
   *   apaga el punto verde al instante y muestra el mensaje exacto según `completado:entregados:pedidos`.
   */
  const syncResultCounts = useCallback(
    ({
      exploratoriaCount = 0,
      especificaCount = 0,
      saldoCreditos = null,
      estadoBusqueda = null,
      hasIncompleteRecords = false,
    }) => {
      const currentNow = Date.now()
      const estadoStr = String(estadoBusqueda || '').trim().toLowerCase()
      const metaMatch = estadoStr.match(/^procesando:(\d+)/)
      const parsedMeta = metaMatch ? Number(metaMatch[1]) : null
      const isProcessingStatus = estadoStr.startsWith('procesando')
      const incompleteRowsActive = Boolean(hasIncompleteRecords)
      const keepActiveGreen = isProcessingStatus || incompleteRowsActive
      const completionInfo = !keepActiveGreen ? parseCompletionStatus(estadoStr) : null

      const numericSaldo =
        saldoCreditos !== null && saldoCreditos !== undefined && Number.isFinite(Number(saldoCreditos))
          ? Number(saldoCreditos)
          : null

      setProcessingState((prev) => {
        if (keepActiveGreen) {
          const nextMeta = parsedMeta ?? prev.processingMeta ?? null
          if (
            prev.estadoBusqueda === (estadoStr || null) &&
            prev.isProcessing === true &&
            prev.hasIncompleteRecords === incompleteRowsActive &&
            prev.processingMeta === nextMeta &&
            prev.completionInfo === null
          ) {
            return prev
          }
          return {
            estadoBusqueda: estadoStr || null,
            isProcessing: true,
            hasIncompleteRecords: incompleteRowsActive,
            processingMeta: nextMeta,
            completionInfo: null,
          }
        }

        const prevMsg = prev.completionInfo?.message ?? null
        const nextMsg = completionInfo?.message ?? null
        if (
          prev.estadoBusqueda === (estadoStr || null) &&
          prev.isProcessing === false &&
          prev.hasIncompleteRecords === false &&
          prev.processingMeta === null &&
          prevMsg === nextMsg &&
          prev.completionInfo?.entregados === (completionInfo?.entregados ?? null) &&
          prev.completionInfo?.pedidos === (completionInfo?.pedidos ?? null)
        ) {
          return prev
        }
        return {
          estadoBusqueda: estadoStr || null,
          isProcessing: false,
          hasIncompleteRecords: false,
          processingMeta: null,
          completionInfo,
        }
      })

      setActivities((prev) => {
        let changed = false
        let hasAnyRunning = false

        const next = prev.map((a) => {
          if (a.status === 'running') {
            hasAnyRunning = true
          }
          if (a.status !== 'running') return a
          const count = a.type === 'exploratoria' ? exploratoriaCount : especificaCount
          const elapsed = currentNow - a.startedAt
          const rawNuevos = Math.max(0, count - a.baselineCount)
          const nextMeta = parsedMeta ?? a.metaSolicitada ?? null
          const registrosNuevos =
            keepActiveGreen && nextMeta && nextMeta > 0 ? Math.min(rawNuevos, nextMeta) : rawNuevos

          const creditsChanged =
            numericSaldo !== null &&
            a.baselineCredits !== null &&
            a.baselineCredits !== undefined &&
            Number(numericSaldo) !== Number(a.baselineCredits)
          const serverCompleted = Boolean(completionInfo?.isCompleted)

          // Solo cerramos la actividad cuando ya NO esté en procesando: ni queden filas en no_completado_aun
          if (!keepActiveGreen && (serverCompleted || creditsChanged || elapsed >= MAX_POLL_DURATION_MS)) {
            changed = true
            return {
              ...a,
              registrosNuevos: completionInfo?.entregados ?? rawNuevos,
              metaSolicitada: completionInfo?.pedidos ?? nextMeta,
              completionMessage: completionInfo?.message || 'Búsqueda finalizada',
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

        // Si el backend reporta procesando: o hay registros en no_completado_aun y no había actividad en curso, la creamos automáticamente
        if (keepActiveGreen && !hasAnyRunning) {
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
              completionMessage: null,
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
   * Devuelve siempre `saldo_creditos` directamente desde la base de datos sin hacer restas manuales en el navegador.
   */
  const getVisualCredits = useCallback((rawCredits) => {
    const dbCredits = Number(rawCredits ?? 0)
    return Number.isFinite(dbCredits) ? dbCredits : 0
  }, [])

  const completionInfo = processingState.completionInfo
  const completionMessage =
    completionInfo?.message ||
    activities.find((a) => a.status === 'completed' && a.completionMessage)?.completionMessage ||
    null

  // Auto-sincronización cada 15 segundos mientras exista una búsqueda activa o registros en no_completado_aun
  useEffect(() => {
    if (!hasRunning) return undefined
    const poller = setInterval(() => {
      if (refreshHandlerRef.current) {
        refreshHandlerRef.current()
      }
      const current = Date.now()
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
    }, POLL_INTERVAL_MS)
    return () => clearInterval(poller)
  }, [hasRunning])

  const value = useMemo(
    () => ({
      activities,
      activeActivities,
      hasRunning,
      manualRefreshing,
      isProcessing: processingState.isProcessing,
      hasIncompleteRecords: processingState.hasIncompleteRecords,
      estadoBusqueda: processingState.estadoBusqueda,
      completionInfo,
      completionMessage,
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
      manualRefreshing,
      processingState.isProcessing,
      processingState.hasIncompleteRecords,
      processingState.estadoBusqueda,
      completionInfo,
      completionMessage,
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
