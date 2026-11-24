import { useMemo, useState } from 'react'
import { Building2, CheckCircle2, ChevronLeft, ChevronRight, Clock, Globe, Loader2, Search, Trash2, X } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'

const PAGE_SIZES = [10, 25, 50, 100]

/**
 * Tabla persistente y paginada "Mis Empresas Cargadas" (prospekta_empresas_cliente).
 * Capaz de manejar miles de filas con fluidez, buscador por nombre/dominio,
 * filtro por estado (Todas, Pendientes, Procesadas), filtro por industria,
 * selección individual / Seleccionar todo y eliminación en lote.
 */
export default function LoadedCompaniesTable({ companies = [], onDeleteCompanies, saving = false }) {
  const { t, locale } = usePreferences()
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('todas') // todas | pendiente | procesada
  const [industryFilter, setIndustryFilter] = useState('todas')
  const [pageSize, setPageSize] = useState(25)
  const [page, setPage] = useState(1)
  const [selectedKeys, setSelectedKeys] = useState(() => new Set())
  const [deletingKeys, setDeletingKeys] = useState(() => new Set())

  const validCompanies = useMemo(
    () => (Array.isArray(companies) ? companies.filter((c) => c && c.id !== null && c.id !== undefined && String(c.id).trim() !== '') : []),
    [companies],
  )

  const industries = useMemo(() => {
    const set = new Set()
    for (const c of validCompanies) {
      const sector = c.sector || c.industria
      if (sector) set.add(sector)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [validCompanies])

  const counts = useMemo(() => {
    let pendientes = 0
    let procesadas = 0
    for (const c of validCompanies) {
      if (c.estado === 'procesada') procesadas++
      else pendientes++
    }
    return { total: validCompanies.length, pendientes, procesadas }
  }, [validCompanies])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return validCompanies.filter((c) => {
      const sector = c.sector || c.industria || ''
      const sitio = c.sitio_web || c.dominio_web || ''
      if (statusFilter !== 'todas' && c.estado !== statusFilter) return false
      if (industryFilter !== 'todas' && sector !== industryFilter) return false
      if (!q) return true
      return (
        (c.nombre_empresa || '').toLowerCase().includes(q) ||
        sitio.toLowerCase().includes(q) ||
        sector.toLowerCase().includes(q)
      )
    })
  }, [validCompanies, query, statusFilter, industryFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize))
  const safePage = Math.min(page, totalPages)
  const startIdx = (safePage - 1) * pageSize
  const pageRows = useMemo(() => filtered.slice(startIdx, startIdx + pageSize), [filtered, startIdx, pageSize])

  const filteredKeys = useMemo(() => filtered.map((c) => c.key), [filtered])
  const selectedFiltered = useMemo(() => filtered.filter((c) => selectedKeys.has(c.key)), [filtered, selectedKeys])
  const allFilteredSelected = filteredKeys.length > 0 && selectedFiltered.length === filteredKeys.length

  const toggleAll = () => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (allFilteredSelected) filteredKeys.forEach((k) => next.delete(k))
      else filteredKeys.forEach((k) => next.add(k))
      return next
    })
  }

  const toggleRow = (key) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const handleDelete = async (items) => {
    if (!items.length || !onDeleteCompanies) return
    const keys = items.map((c) => c.key)
    setDeletingKeys((prev) => {
      const next = new Set(prev)
      keys.forEach((k) => next.add(k))
      return next
    })
    try {
      await onDeleteCompanies(items)
      setSelectedKeys((prev) => {
        const next = new Set(prev)
        keys.forEach((k) => next.delete(k))
        return next
      })
    } finally {
      setDeletingKeys((prev) => {
        const next = new Set(prev)
        keys.forEach((k) => next.delete(k))
        return next
      })
    }
  }

  const allSelectedItems = useMemo(() => companies.filter((c) => selectedKeys.has(c.key)), [companies, selectedKeys])

  return (
    <div className="rounded-2xl border border-line bg-surface overflow-hidden">
      {/* Encabezado y contadores */}
      <div className="flex flex-col gap-3 border-b border-line bg-mist/50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex flex-wrap items-center gap-2">
          <Building2 className="h-4.5 w-4.5 text-electric" />
          <h4 className="text-sm font-bold text-ink">{t('search.companies.tableTitle')}</h4>
          <span className="rounded-full bg-electric-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-electric">
            {counts.total.toLocaleString(locale)}
          </span>
          {saving && (
            <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-electric">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              {t('search.companies.savingDb')}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
          {[
            { id: 'todas', label: `${t('search.companies.filterAll')} (${counts.total.toLocaleString(locale)})` },
            { id: 'pendiente', label: `${t('search.companies.filterPending')} (${counts.pendientes.toLocaleString(locale)})` },
            { id: 'procesada', label: `${t('search.companies.filterProcessed')} (${counts.procesadas.toLocaleString(locale)})` },
          ].map((tab) => {
            const on = statusFilter === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id)
                  setPage(1)
                }}
                className={`rounded-lg px-2.5 py-1 font-semibold transition cursor-pointer ${
                  on ? 'bg-electric text-white' : 'bg-surface text-muted hover:text-ink'
                }`}
              >
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Barra de filtros y acciones en lote */}
      <div className="flex flex-col gap-2.5 border-b border-line bg-mist/30 px-4 py-3 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <div className="relative flex-1 sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setPage(1)
              }}
              placeholder={t('search.companies.searchPh')}
              className="field h-9 pl-9 pr-8 text-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => {
                  setQuery('')
                  setPage(1)
                }}
                className="absolute right-2 top-1/2 grid h-5 w-5 -translate-y-1/2 place-items-center rounded text-muted hover:text-ink cursor-pointer"
                aria-label={t('common.close')}
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <select
            value={industryFilter}
            onChange={(e) => {
              setIndustryFilter(e.target.value)
              setPage(1)
            }}
            className="field h-9 py-1 text-xs sm:w-56 cursor-pointer"
            aria-label={t('search.companies.industryFilter')}
          >
            <option value="todas">{t('search.companies.allIndustries')}</option>
            {industries.map((ind) => (
              <option key={ind} value={ind}>
                {ind}
              </option>
            ))}
          </select>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {allSelectedItems.length > 0 && (
            <button
              type="button"
              id="delete-selected-companies"
              onClick={() => handleDelete(allSelectedItems)}
              disabled={deletingKeys.size > 0}
              className="btn btn-sm h-9 border border-red-500/30 bg-red-500/10 text-xs text-red-500 hover:bg-red-500/20 dark:text-red-300"
            >
              {deletingKeys.size > 0 ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              {t('search.companies.deleteSelected', { n: allSelectedItems.length })}
            </button>
          )}
        </div>
      </div>

      {/* Tabla */}
      {!validCompanies.length ? (
        <p className="px-4 py-10 text-center text-xs text-muted">{t('search.companies.empty')}</p>
      ) : !filtered.length ? (
        <p className="px-4 py-10 text-center text-xs text-muted">{t('table.noMatches')}</p>
      ) : (
        <>
          <div className="table-scroll">
            <table className="w-full min-w-[640px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-mist text-[10px] font-semibold uppercase tracking-wider text-muted">
                  <th className="w-10 px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allFilteredSelected}
                      onChange={toggleAll}
                      aria-label={t('table.selectAll')}
                      title={t('table.selectAll')}
                      className="h-4 w-4 rounded border-line accent-electric cursor-pointer"
                    />
                  </th>
                  <th className="px-4 py-3">{t('search.companies.colName')}</th>
                  <th className="px-4 py-3">{t('search.companies.colDomain')}</th>
                  <th className="px-4 py-3">{t('search.companies.colIndustry')}</th>
                  <th className="px-4 py-3">{t('search.companies.colStatus')}</th>
                  <th className="w-14 px-4 py-3 text-right">{t('table.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {pageRows.map((c) => {
                  const isSelected = selectedKeys.has(c.key)
                  const isDeleting = deletingKeys.has(c.key)
                  const isProc = c.estado === 'procesada'
                  const sitioWeb = c.sitio_web || c.dominio_web || ''
                  const sector = c.sector || c.industria || ''
                  return (
                    <tr
                      key={c.key}
                      className={`transition-colors hover:bg-electric-50/40 ${isSelected ? 'bg-electric-50/60' : ''} ${
                        isDeleting ? 'opacity-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 align-middle">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleRow(c.key)}
                          disabled={isDeleting}
                          aria-label={t('table.selectRow')}
                          className="h-4 w-4 rounded border-line accent-electric cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 align-middle font-semibold text-ink">{c.nombre_empresa || '—'}</td>
                      <td className="px-4 py-3 align-middle">
                        {sitioWeb ? (
                          <a
                            href={`https://${sitioWeb.replace(/^https?:\/\//i, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 font-mono text-[11px] text-electric hover:underline"
                          >
                            <Globe className="h-3 w-3 shrink-0" />
                            {sitioWeb}
                          </a>
                        ) : (
                          <span className="text-muted/60">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 align-middle text-ink-soft">{sector || <span className="text-muted/60">—</span>}</td>
                      <td className="px-4 py-3 align-middle">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                            isProc
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                              : 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                          }`}
                        >
                          {isProc ? <CheckCircle2 className="h-3 w-3" /> : <Clock className="h-3 w-3" />}
                          {isProc ? t('search.companies.statusProcessed') : t('search.companies.statusPending')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <button
                          type="button"
                          onClick={() => handleDelete([c])}
                          disabled={isDeleting}
                          title={t('table.deleteRow')}
                          aria-label={`${t('search.companies.remove')} ${c.nombre_empresa}`}
                          className="ml-auto grid h-7 w-7 place-items-center rounded-lg text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40 cursor-pointer"
                        >
                          {isDeleting ? <Loader2 className="h-3.5 w-3.5 animate-spin text-red-500" /> : <Trash2 className="h-3.5 w-3.5" />}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          <div className="flex flex-col items-center justify-between gap-3 border-t border-line bg-mist/40 px-4 py-2.5 text-xs text-muted sm:flex-row sm:px-5">
            <div className="flex items-center gap-2">
              <span>
                {t('search.companies.showing', {
                  from: (startIdx + 1).toLocaleString(locale),
                  to: Math.min(startIdx + pageSize, filtered.length).toLocaleString(locale),
                  total: filtered.length.toLocaleString(locale),
                })}
              </span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value))
                  setPage(1)
                }}
                aria-label={t('search.companies.rowsPerPage')}
                className="rounded-lg border border-line bg-surface px-2 py-1 text-xs text-ink cursor-pointer"
              >
                {PAGE_SIZES.map((n) => (
                  <option key={n} value={n}>
                    {n} / pág.
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="btn btn-ghost btn-sm h-8 px-2.5 disabled:opacity-40"
              >
                <ChevronLeft className="h-3.5 w-3.5" />
              </button>
              <span className="px-2 font-mono text-xs text-ink">
                {safePage} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="btn btn-ghost btn-sm h-8 px-2.5 disabled:opacity-40"
              >
                <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
