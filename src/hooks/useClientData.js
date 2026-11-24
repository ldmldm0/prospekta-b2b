import { useCallback, useEffect, useRef, useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { normalizeCompanyRow } from '../features/search/utils/companyParser'
import { clientApi, getFriendlySearchError, toClientEmailId } from '../services/api'
import { getRowId } from '../utils/tableColumns'

const localCompaniesKey = (id) => `prospekta.empresas_cliente.${toClientEmailId(id)}`
const hasValidCompanyId = (c) => c && c.id !== null && c.id !== undefined && String(c.id).trim() !== ''

function readCachedCompanies(idCliente) {
  const cleanId = toClientEmailId(idCliente)
  if (!cleanId) return []
  try {
    const raw = localStorage.getItem(localCompaniesKey(cleanId))
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(hasValidCompanyId).map((c, i) => normalizeCompanyRow(c, i))
      : []
  } catch {
    return []
  }
}

function writeCachedCompanies(idCliente, list) {
  const cleanId = toClientEmailId(idCliente)
  if (!cleanId) return
  try {
    localStorage.setItem(localCompaniesKey(cleanId), JSON.stringify(list))
  } catch {
    // ignorar
  }
}

/**
 * Carga y refresca en paralelo los datos del cliente desde:
 * a) POST MIS_DATOS_URL { id_cliente: user.email.toLowerCase(), email: user.email.toLowerCase() }
 * b) POST GESTION_EMPRESAS_URL { accion: "listar", id_cliente: user.email.toLowerCase() }
 * NUNCA llama a exploratoria ni especifica al cargar o presionar "Actualizar".
 */
export function useClientData() {
  const { usuario, updateUser } = useAuth()
  const idCliente = toClientEmailId(usuario?.email || usuario?.id_cliente)

  const [data, setData] = useState(() => ({
    historial_exploratorio: [],
    resultados_lista: [],
    empresas_cliente: readCachedCompanies(idCliente),
    estado_busqueda: null,
  }))
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [savingCompanies, setSavingCompanies] = useState(false)
  const [error, setError] = useState('')
  const mounted = useRef(true)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  /** Consulta únicamente GESTION_EMPRESAS_URL ({ accion: "listar", id_cliente }) y actualiza Mis Empresas Cargadas desde data.empresas. */
  const refreshCompaniesList = useCallback(async () => {
    if (!idCliente) return []
    try {
      const listed = await clientApi.listarEmpresas(idCliente)
      if (!mounted.current) return listed
      setData((prev) => {
        writeCachedCompanies(idCliente, listed)
        return { ...prev, empresas_cliente: listed }
      })
      return listed
    } catch {
      return null
    }
  }, [idCliente])

  /** Ejecuta en paralelo MIS_DATOS_URL y GESTION_EMPRESAS_URL (accion: "listar"). */
  const fetchData = useCallback(
    async ({ silent = false } = {}) => {
      if (!idCliente) return null
      if (silent) setRefreshing(true)
      else setLoading(true)
      setError('')

      try {
        const [misDatosRes, empresasRes] = await Promise.allSettled([
          clientApi.misDatos(idCliente),
          clientApi.listarEmpresas(idCliente),
        ])

        if (!mounted.current) return null

        if (misDatosRes.status === 'rejected' && empresasRes.status === 'rejected') {
          throw misDatosRes.reason || new Error(getFriendlySearchError('es'))
        }

        const res = misDatosRes.status === 'fulfilled' ? misDatosRes.value : null
        const listedCompanies = empresasRes.status === 'fulfilled' ? empresasRes.value : null

        setData((prev) => {
          const nextEmpresas = Array.isArray(listedCompanies)
            ? listedCompanies
            : res?.empresas_cliente?.length
              ? res.empresas_cliente
              : prev.empresas_cliente
          writeCachedCompanies(idCliente, nextEmpresas)
          return {
            historial_exploratorio: res ? (Array.isArray(res.historial_exploratorio) ? res.historial_exploratorio : []) : prev.historial_exploratorio,
            resultados_lista: res ? (Array.isArray(res.resultados_lista) ? res.resultados_lista : []) : prev.resultados_lista,
            empresas_cliente: nextEmpresas,
            estado_busqueda: res ? (res.estado_busqueda ?? null) : prev.estado_busqueda,
          }
        })

        if (res) {
          const patch = {}
          if (res.perfil?.nombre) patch.nombre = res.perfil.nombre
          if (res.perfil?.empresa) patch.empresa = res.perfil.empresa
          if (res.perfil?.email) patch.email = toClientEmailId(res.perfil.email)
          if (res.perfil?.estado) patch.estado = res.perfil.estado
          if (res.saldo_creditos !== null) patch.saldo_creditos = res.saldo_creditos
          if (Object.keys(patch).length) updateUser(patch)
        }
        return res
      } catch (err) {
        if (!mounted.current) return null
        if (!silent) setError(err.message || getFriendlySearchError('es'))
        return null
      } finally {
        if (mounted.current) {
          setLoading(false)
          setRefreshing(false)
        }
      }
    },
    [idCliente, updateUser],
  )

  useEffect(() => {
    fetchData({ silent: false })
  }, [fetchData])

  /** Remueve inmediatamente las filas ocultadas/eliminadas de la vista actual y sincroniza en segundo plano. */
  const removeRows = useCallback(
    (tabla, ids) => {
      const idSet = new Set((Array.isArray(ids) ? ids : [ids]).map(String))
      setData((prev) => ({
        ...prev,
        [tabla]: (prev[tabla] || []).filter((row) => {
          const rid = getRowId(row)
          return rid === null || !idSet.has(String(rid))
        }),
      }))
      setTimeout(() => {
        if (mounted.current) fetchData({ silent: true })
      }, 1500)
    },
    [fetchData],
  )

  /**
   * Marca como 'procesada' las empresas ejecutadas en una Búsqueda Específica
   * para que la tabla "Mis Empresas Cargadas" cambie de "Pendiente" a "Procesado" al instante.
   */
  const markCompaniesProcessed = useCallback(
    (executedCompanies = []) => {
      if (!executedCompanies.length || !idCliente) return
      const executedKeys = new Set(
        executedCompanies
          .map((c) => (c.dominio_web || c.nombre_empresa || '').toLowerCase())
          .filter(Boolean),
      )
      setData((prev) => {
        const nextList = prev.empresas_cliente.map((c) => {
          const k = (c.dominio_web || c.nombre_empresa || '').toLowerCase()
          if (executedKeys.has(k)) {
            return { ...c, estado: 'procesada' }
          }
          return c
        })
        writeCachedCompanies(idCliente, nextList)
        return { ...prev, empresas_cliente: nextList }
      })
    },
    [idCliente],
  )

  /**
   * Agrega empresas enviando POST a GESTION_EMPRESAS_URL con
   * { accion: "agregar", id_cliente: user.email.toLowerCase(), nombre_empresa, sitio_web, sector, pais }
   * por cada empresa válida y luego vuelve a ejecutar { accion: "listar" } para actualizar desde data.empresas.
   */
  const addCompanies = useCallback(
    async (incoming = []) => {
      if (!incoming.length || !idCliente) return 0
      const validEntries = incoming.filter((c) => {
        if (!c || typeof c !== 'object') return false
        const nombre = String(c.nombre_empresa ?? c.nombre ?? '').trim()
        const web = String(c.sitio_web ?? c.dominio_web ?? '').trim()
        return Boolean(nombre || web)
      })
      if (!validEntries.length) return 0

      setSavingCompanies(true)
      try {
        await clientApi.guardarEmpresas(idCliente, validEntries)
        await refreshCompaniesList()
        return validEntries.length
      } finally {
        if (mounted.current) setSavingCompanies(false)
      }
    },
    [idCliente, refreshCompaniesList],
  )

  /**
   * Elimina empresas enviando POST a GESTION_EMPRESAS_URL con
   * { accion: "eliminar", id: empresa.id, id_cliente: user.email.toLowerCase() }
   * y luego vuelve a ejecutar { accion: "listar" }.
   */
  const deleteCompanies = useCallback(
    async (itemsToRemove = []) => {
      if (!itemsToRemove.length || !idCliente) return
      const keySet = new Set(itemsToRemove.map((c) => c.key))

      setData((prev) => {
        const nextList = prev.empresas_cliente.filter((c) => !keySet.has(c.key))
        writeCachedCompanies(idCliente, nextList)
        return { ...prev, empresas_cliente: nextList }
      })

      try {
        await clientApi.eliminarEmpresas(idCliente, itemsToRemove)
        await refreshCompaniesList()
      } catch {
        // Si falla la red, ya se actualizó optimistamente la vista
      }
    },
    [idCliente, refreshCompaniesList],
  )

  return {
    historial_exploratorio: data.historial_exploratorio,
    resultados_lista: data.resultados_lista,
    empresas_cliente: data.empresas_cliente,
    estado_busqueda: data.estado_busqueda,
    loading,
    refreshing,
    savingCompanies,
    error,
    refresh: (opts) => fetchData({ silent: true, ...opts }),
    reload: () => fetchData({ silent: false }),
    removeRows,
    markCompaniesProcessed,
    addCompanies,
    deleteCompanies,
  }
}
