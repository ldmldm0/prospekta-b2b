import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight, Download, ExternalLink, FileSpreadsheet, Loader2, Newspaper, RotateCcw, Search, SearchX, Trash2, UserPlus, X } from 'lucide-react'
import Modal from './Modal'
import { usePreferences } from '../../context/PreferencesContext'
import { useToast } from './Toast'
import { downloadCSV, downloadExcel } from '../../utils/export'
import { deriveColumns, formatPlainValue, getRowId, isEmailKey, isPhoneKey, isUrlValue, toHref } from '../../utils/tableColumns'

const DATE_KEYS = ['fecha_creacion', 'created_at', 'fecha', 'fecha_registro', 'timestamp']
const INDUSTRY_KEYS = ['industria', 'sector', 'industry']
const SIZE_KEYS = ['tamano', 'tamaño', 'empleados', 'size']
const VERIFIER_KEYS = ['verificador', 'estado_email', 'verificacion', 'verification']
const PRIMARY_BADGE_KEYS = new Set(['empresa', 'nombre_empresa', 'company', 'nombre', 'name', 'contacto'])
const LONG_TEXT_COL_RE = /(palabra|keyword|tags|descrip|resumen|summary|nota|mensaje|perfil|actividad|especialidad|bio|detalle|contexto)/i

const pickField = (row, keys) => {
  if (!row || typeof row !== 'object') return ''
  for (const k of keys) {
    if (row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '') {
      return String(row[k]).trim()
    }
  }
  const foundKey = Object.keys(row).find((rk) => keys.includes(rk.toLowerCase()))
  return foundKey && row[foundKey] != null ? String(row[foundKey]).trim() : ''
}

const parseRowDate = (row) => {
  const raw = pickField(row, DATE_KEYS)
  if (!raw) return null
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d
}

const isSameLocalDay = (d1, d2) =>
  d1.getFullYear() === d2.getFullYear() && d1.getMonth() === d2.getMonth() && d1.getDate() === d2.getDate()

const isRowCreatedToday = (row) => {
  const d = parseRowDate(row)
  return d ? isSameLocalDay(d, new Date()) : false
}

/**
 * Celda compacta con límite visual de 2 líneas (`line-clamp-2`) y botón "Ver más" / "Ver menos"
 * para columnas largas como Palabras clave, Descripción, Resumen, etc.
 */
function CompactTextCell({ text, colKey, showNewBadge, newBadgeLabel }) {
  const [expanded, setExpanded] = useState(false)
  const isLongColumn = LONG_TEXT_COL_RE.test(String(colKey || ''))
  const needsClamp = (isLongColumn && text.length > 65) || text.length > 90 || text.includes('\n')

  if (!needsClamp) {
    return (
      <span className="inline-flex flex-wrap items-center gap-1.5">
        <span>{text}</span>
        {showNewBadge && (
          <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            {newBadgeLabel}
          </span>
        )}
      </span>
    )
  }

  return (
    <div className="max-w-[260px]">
      <div className={expanded ? 'whitespace-pre-line break-words' : 'line-clamp-2 break-words'}>
        <span>{text}</span>
        {showNewBadge && (
          <span className="ml-1.5 inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            {newBadgeLabel}
          </span>
        )}
      </div>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation()
          setExpanded((v) => !v)
        }}
        className="mt-0.5 inline-flex items-center text-[11px] font-semibold text-electric hover:underline cursor-pointer"
      >
        {expanded ? 'Ver menos' : 'Ver más'}
      </button>
    </div>
  )
}

/**
 * Tabla genérica con buscador interno, barra de filtros avanzados (Fecha/Novedad, Industria, Tamaño, Verificación),
 * etiqueta verde "Nuevo" para registros creados hoy, selección individual/múltiple,
 * eliminación instantánea (soft delete) con spinner visual por fila, exportación CSV / Excel,
 * botones flotantes laterales (← / →), arrastre horizontal con el cursor (drag-to-scroll)
 * y celdas largas compactadas a 2 líneas con botón "Ver más" / "Ver menos".
 * Muestra el 100% de los registros sin recortar a 20.
 */
export default function DataTable({
  rows = [],
  exportPrefix = 'prospekta_export',
  selectable = false,
  onDeleteIds,
  onConvertRow,
  convertRowLabel = 'Crear cuenta',
  showNewsSoon = false,
  enableResultFilters = false,
  onFilterCountChange,
  emptyTitle,
  emptySubtitle,
  hideKeys = [],
}) {
  const { t, lang, locale } = usePreferences()
  const toast = useToast()

  const [query, setQuery] = useState('')
  const [dateFilter, setDateFilter] = useState('todos') // 'todos' | 'hoy' | '7dias' | 'rango'
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [industryFilter, setIndustryFilter] = useState('todas')
  const [sizeFilter, setSizeFilter] = useState('todos')
  const [verifierFilter, setVerifierFilter] = useState('todos') // 'todos' | 'verificado_100' | 'valido_corp'

  const [selected, setSelected] = useState(() => new Set())
  const [confirmIds, setConfirmIds] = useState(null) // null | array de ids a eliminar en lote
  const [deletingIds, setDeletingIds] = useState(() => new Set())
  const [bulkDeleting, setBulkDeleting] = useState(false)

  // Scroll horizontal asistido: flechas flotantes laterales + drag-to-scroll
  const scrollContainerRef = useRef(null)
  const dragStateRef = useRef({
    isDown: false,
    isDragging: false,
    startX: 0,
    scrollLeft: 0,
  })
  const [isDraggingUI, setIsDraggingUI] = useState(false)
  const [scrollState, setScrollState] = useState({ canLeft: false, canRight: true, hasOverflow: false })

  const updateScrollButtons = useCallback(() => {
    const el = scrollContainerRef.current
    if (!el) return
    const maxScroll = Math.max(0, el.scrollWidth - el.clientWidth)
    const current = el.scrollLeft
    const hasOverflow = maxScroll > 4
    const canLeft = hasOverflow && current > 4
    const canRight = hasOverflow && current < maxScroll - 4
    setScrollState((prev) =>
      prev.canLeft === canLeft && prev.canRight === canRight && prev.hasOverflow === hasOverflow
        ? prev
        : { canLeft, canRight, hasOverflow },
    )
  }, [])

  const scrollHorizontally = useCallback((direction) => {
    const el = scrollContainerRef.current
    if (!el) return
    const step = Math.max(280, Math.round(el.clientWidth * 0.65))
    el.scrollBy({ left: direction * step, behavior: 'smooth' })
  }, [])

  const handleMouseDown = useCallback((e) => {
    if (e.button !== 0) return
    const target = e.target
    if (target && target.closest('a, button, input, select, textarea, label')) return
    const el = scrollContainerRef.current
    if (!el) return
    dragStateRef.current = {
      isDown: true,
      isDragging: false,
      startX: e.pageX - el.offsetLeft,
      scrollLeft: el.scrollLeft,
    }
  }, [])

  const handleMouseMove = useCallback((e) => {
    const state = dragStateRef.current
    if (!state.isDown) return
    const el = scrollContainerRef.current
    if (!el) return
    const x = e.pageX - el.offsetLeft
    const delta = x - state.startX
    if (!state.isDragging && Math.abs(delta) > 5) {
      state.isDragging = true
      setIsDraggingUI(true)
    }
    if (state.isDragging) {
      e.preventDefault()
      el.scrollLeft = state.scrollLeft - delta * 1.25
    }
  }, [])

  const stopDragging = useCallback(() => {
    if (!dragStateRef.current.isDown) return
    dragStateRef.current.isDown = false
    if (dragStateRef.current.isDragging) {
      setTimeout(() => {
        dragStateRef.current.isDragging = false
      }, 0)
    }
    setIsDraggingUI(false)
  }, [])

  const colLabels = useMemo(() => t('table.cols') || {}, [t])
  const columns = useMemo(() => deriveColumns(rows, colLabels, { hideKeys }), [rows, colLabels, hideKeys])

  // Valores únicos dinámicos de industria y tamaño presentes en la tabla actual
  const uniqueIndustries = useMemo(() => {
    if (!enableResultFilters) return []
    const set = new Set()
    for (const r of rows) {
      const val = pickField(r, INDUSTRY_KEYS)
      if (val) set.add(val)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows, enableResultFilters])

  const uniqueSizes = useMemo(() => {
    if (!enableResultFilters) return []
    const set = new Set()
    for (const r of rows) {
      const val = pickField(r, SIZE_KEYS)
      if (val) set.add(val)
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b))
  }, [rows, enableResultFilters])

  // Indexar TODAS las filas sin ningún recorte (.slice)
  const indexedRows = useMemo(
    () =>
      rows.map((row, idx) => {
        const id = getRowId(row)
        return { row, id, key: id !== null ? String(id) : `row-${idx}`, isToday: isRowCreatedToday(row) }
      }),
    [rows],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    const now = new Date()
    const sevenDaysAgo = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7, 0, 0, 0, 0)
    const fromDate = dateFrom ? new Date(`${dateFrom}T00:00:00`) : null
    const toDate = dateTo ? new Date(`${dateTo}T23:59:59.999`) : null

    return indexedRows.filter(({ row, isToday }) => {
      if (enableResultFilters) {
        if (dateFilter === 'hoy' && !isToday) return false
        if (dateFilter === '7dias') {
          const d = parseRowDate(row)
          if (!d || d < sevenDaysAgo) return false
        }
        if (dateFilter === 'rango' && (fromDate || toDate)) {
          const d = parseRowDate(row)
          if (!d) return false
          if (fromDate && d < fromDate) return false
          if (toDate && d > toDate) return false
        }

        if (industryFilter !== 'todas') {
          if (pickField(row, INDUSTRY_KEYS) !== industryFilter) return false
        }

        if (sizeFilter !== 'todos') {
          if (pickField(row, SIZE_KEYS) !== sizeFilter) return false
        }

        if (verifierFilter !== 'todos') {
          const v = pickField(row, VERIFIER_KEYS).toLowerCase()
          if (verifierFilter === 'verificado_100') {
            if (!v.includes('100') && !v.includes('verificado')) return false
          } else if (verifierFilter === 'valido_corp') {
            if (!v.includes('valido') && !v.includes('válido') && !v.includes('corporativo') && !v.includes('catch')) return false
          }
        }
      }

      if (!q) return true
      return columns.some((c) => formatPlainValue(row[c.key], locale).toLowerCase().includes(q))
    })
  }, [indexedRows, columns, query, locale, enableResultFilters, dateFilter, dateFrom, dateTo, industryFilter, sizeFilter, verifierFilter])

  useEffect(() => {
    updateScrollButtons()
    const el = scrollContainerRef.current
    if (!el) return undefined
    const onResize = () => updateScrollButtons()
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [updateScrollButtons, filtered.length, columns.length])

  const selectableFilteredIds = useMemo(() => filtered.map((r) => r.id).filter((id) => id !== null), [filtered])
  const selectedInView = useMemo(() => selectableFilteredIds.filter((id) => selected.has(id)), [selectableFilteredIds, selected])
  const allSelected = selectableFilteredIds.length > 0 && selectedInView.length === selectableFilteredIds.length

  const hasActiveFilters =
    Boolean(query.trim()) ||
    dateFilter !== 'todos' ||
    industryFilter !== 'todas' ||
    sizeFilter !== 'todos' ||
    verifierFilter !== 'todos'

  useEffect(() => {
    onFilterCountChange?.({
      filtered: filtered.length,
      total: rows.length,
      active: hasActiveFilters,
    })
  }, [onFilterCountChange, filtered.length, rows.length, hasActiveFilters])

  const resetFilters = () => {
    setQuery('')
    setDateFilter('todos')
    setDateFrom('')
    setDateTo('')
    setIndustryFilter('todas')
    setSizeFilter('todos')
    setVerifierFilter('todos')
  }

  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) selectableFilteredIds.forEach((id) => next.delete(id))
      else selectableFilteredIds.forEach((id) => next.add(id))
      return next
    })
  }

  const toggleOne = (id) => {
    if (id === null) return
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const exportRows = (kind) => {
    if (!filtered.length) return
    // Si hay filas marcadas con checkbox dentro de la vista filtrada, exporta las marcadas; de lo contrario, exporta todas las visibles tras filtrar
    const checkedRows = filtered.filter(({ id }) => id !== null && selected.has(id))
    const rowsToExport = checkedRows.length > 0 ? checkedRows : filtered

    const headers = [...columns.map((c) => c.label), ...(showNewsSoon ? [t('search.results.cols.news')] : [])]
    const data = rowsToExport.map(({ row }) => [
      ...columns.map((c) => formatPlainValue(row[c.key], locale)),
      ...(showNewsSoon ? [t('search.results.newsSoon')] : []),
    ])
    const stamp = new Date().toISOString().slice(0, 10)
    if (kind === 'excel') {
      downloadExcel(`${exportPrefix}_${stamp}.xls`, headers, data)
      toast(t('table.toastExcel'))
    } else {
      downloadCSV(`${exportPrefix}_${stamp}.csv`, headers, data)
      toast(t('table.toastCsv'))
    }
  }

  /** Eliminación individual instantánea con spinner en la fila y alerta si falla la conexión. */
  const handleInstantRowDelete = async (id) => {
    if (id === null || !onDeleteIds || deletingIds.has(id)) return
    setDeletingIds((prev) => new Set(prev).add(id))
    try {
      await onDeleteIds([id])
      setSelected((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    } catch {
      // El padre muestra el toast/alerta de error
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev)
        next.delete(id)
        return next
      })
    }
  }

  const confirmBulkDelete = async () => {
    if (!confirmIds?.length || !onDeleteIds) return
    setBulkDeleting(true)
    setDeletingIds((prev) => {
      const next = new Set(prev)
      confirmIds.forEach((id) => next.add(id))
      return next
    })
    try {
      await onDeleteIds(confirmIds)
      setSelected((prev) => {
        const next = new Set(prev)
        confirmIds.forEach((id) => next.delete(id))
        return next
      })
      setConfirmIds(null)
    } catch {
      // El padre muestra el error en toast
    } finally {
      setBulkDeleting(false)
      setDeletingIds((prev) => {
        const next = new Set(prev)
        confirmIds.forEach((id) => next.delete(id))
        return next
      })
    }
  }

  if (!rows.length) {
    return (
      <div className="flex flex-col items-center border-t border-line px-6 py-14 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-mist text-muted">
          <SearchX className="h-6 w-6" />
        </span>
        <p className="mt-4 text-sm font-semibold text-ink">{emptyTitle || t('table.emptyTitle')}</p>
        {emptySubtitle && <p className="mt-1 max-w-sm text-xs text-muted">{emptySubtitle}</p>}
      </div>
    )
  }

  const totalSelected = Array.from(selected).filter((id) => indexedRows.some((r) => r.id === id))
  const firstBadgeColKey =
    columns.find((c) => PRIMARY_BADGE_KEYS.has(c.key.toLowerCase()))?.key || columns[0]?.key || null
  const clickableNameColKey =
    columns.find((c) => ['nombre', 'name', 'contacto'].includes(c.key.toLowerCase()))?.key || firstBadgeColKey
  const newBadgeLabel = t('table.newBadge')
  const showActionsColumn = Boolean((selectable && onDeleteIds) || onConvertRow)

  return (
    <div className="border-t border-line">
      {/* Barra de herramientas: buscador + selección + exportar */}
      <div className="flex flex-col gap-3 border-b border-line bg-mist/40 px-4 py-3 sm:px-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('table.searchPh')}
              className="field h-10 pl-10 pr-9 text-xs"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                aria-label={t('common.close')}
                className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {selectable && onDeleteIds && totalSelected.length > 0 && (
              <button
                type="button"
                onClick={() => setConfirmIds(totalSelected)}
                className="btn btn-sm border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 dark:text-red-300"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('table.deleteSelected', { n: totalSelected.length })}
              </button>
            )}

            <button type="button" onClick={() => exportRows('csv')} disabled={!filtered.length} className="btn btn-ghost btn-sm">
              <Download className="h-3.5 w-3.5 text-electric" />
              {t('table.exportCsv')}
            </button>
            <button type="button" onClick={() => exportRows('excel')} disabled={!filtered.length} className="btn btn-ghost btn-sm">
              <FileSpreadsheet className="h-3.5 w-3.5 text-electric" />
              {t('table.exportExcel')}
            </button>
          </div>
        </div>

        {/* Fila de filtros combinables para las tablas de resultados (Exploratoria y Específica) */}
        {enableResultFilters && (
          <div className="flex flex-wrap items-center gap-2 pt-1">
            {/* 1. Fecha / Novedad */}
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              aria-label={t('table.filters.dateLabel')}
              className="field h-9 w-full py-1 text-xs sm:w-44 cursor-pointer"
            >
              <option value="todos">{t('table.filters.dateAll')}</option>
              <option value="hoy">{t('table.filters.dateToday')}</option>
              <option value="7dias">{t('table.filters.date7Days')}</option>
              <option value="rango">{t('table.filters.dateRange')}</option>
            </select>

            {dateFilter === 'rango' && (
              <div className="flex flex-wrap items-center gap-1.5">
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  aria-label={t('table.filters.dateFrom')}
                  title={t('table.filters.dateFrom')}
                  className="field h-9 w-36 py-1 text-xs"
                />
                <span className="text-xs text-muted">–</span>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  aria-label={t('table.filters.dateTo')}
                  title={t('table.filters.dateTo')}
                  className="field h-9 w-36 py-1 text-xs"
                />
              </div>
            )}

            <span
              id="date-filter-count"
              className="inline-flex h-9 items-center rounded-xl border border-line bg-surface px-2.5 font-mono text-[11px] font-semibold text-ink-soft"
            >
              {hasActiveFilters
                ? lang === 'en'
                  ? `${filtered.length.toLocaleString(locale)} of ${rows.length.toLocaleString(locale)}`
                  : `${filtered.length.toLocaleString(locale)} de ${rows.length.toLocaleString(locale)}`
                : `${rows.length.toLocaleString(locale)} ${lang === 'en' ? 'records' : 'registros'}`}
            </span>

            {/* 2. Industria / Estilo de empresa */}
            <select
              value={industryFilter}
              onChange={(e) => setIndustryFilter(e.target.value)}
              aria-label={t('table.filters.industryAll')}
              className="field h-9 w-full py-1 text-xs sm:w-48 cursor-pointer"
            >
              <option value="todas">{t('table.filters.industryAll')}</option>
              {uniqueIndustries.map((ind) => (
                <option key={ind} value={ind}>
                  {ind}
                </option>
              ))}
            </select>

            {/* 3. Tamaño de empresa */}
            <select
              value={sizeFilter}
              onChange={(e) => setSizeFilter(e.target.value)}
              aria-label={t('table.filters.sizeAll')}
              className="field h-9 w-full py-1 text-xs sm:w-44 cursor-pointer"
            >
              <option value="todos">{t('table.filters.sizeAll')}</option>
              {uniqueSizes.map((sz) => (
                <option key={sz} value={sz}>
                  {sz}
                </option>
              ))}
            </select>

            {/* 4. Verificación */}
            <select
              value={verifierFilter}
              onChange={(e) => setVerifierFilter(e.target.value)}
              aria-label={t('table.filters.verifierAll')}
              className="field h-9 w-full py-1 text-xs sm:w-48 cursor-pointer"
            >
              <option value="todos">{t('table.filters.verifierAll')}</option>
              <option value="verificado_100">{t('table.filters.verifier100')}</option>
              <option value="valido_corp">{t('table.filters.verifierCorp')}</option>
            </select>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="btn btn-ghost btn-sm h-9 px-2.5 text-xs text-muted hover:text-ink"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                {t('table.filters.clear')}
              </button>
            )}
          </div>
        )}
      </div>

      <p className="border-b border-line bg-mist/30 px-4 py-2 text-[11px] text-muted sm:hidden">{t('search.results.scrollHint')}</p>

      {!filtered.length ? (
        <div className="px-6 py-12 text-center text-xs text-muted">{t('table.noMatches')}</div>
      ) : (
        <div className="group/table relative">
          {/* Botones flotantes laterales de desplazamiento horizontal (← / →) */}
          {scrollState.hasOverflow && (
            <>
              <button
                type="button"
                onClick={() => scrollHorizontally(-1)}
                disabled={!scrollState.canLeft}
                aria-label="Desplazar tabla a la izquierda"
                title="Desplazar a la izquierda (←)"
                className={`absolute left-2 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-line bg-surface/95 text-ink shadow-lift backdrop-blur-md transition-all duration-200 cursor-pointer hover:border-electric hover:bg-electric hover:text-white ${
                  scrollState.canLeft
                    ? 'opacity-90 group-hover/table:opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => scrollHorizontally(1)}
                disabled={!scrollState.canRight}
                aria-label="Desplazar tabla a la derecha"
                title="Desplazar a la derecha (→)"
                className={`absolute right-2 top-1/2 z-20 -translate-y-1/2 grid h-10 w-10 place-items-center rounded-full border border-line bg-surface/95 text-ink shadow-lift backdrop-blur-md transition-all duration-200 cursor-pointer hover:border-electric hover:bg-electric hover:text-white ${
                  scrollState.canRight
                    ? 'opacity-90 group-hover/table:opacity-100'
                    : 'pointer-events-none opacity-0'
                }`}
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
          <div
            ref={scrollContainerRef}
            onScroll={updateScrollButtons}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={stopDragging}
            onMouseLeave={stopDragging}
            className={`table-scroll ${isDraggingUI ? 'cursor-grabbing select-none' : 'cursor-grab'}`}
          >
            <table className="w-full min-w-[720px] border-collapse text-left text-xs">
              <thead>
                <tr className="border-b border-line bg-mist text-[10px] font-semibold uppercase tracking-wider text-muted">
                  {selectable && onDeleteIds && (
                    <th className="w-10 px-4 py-3.5">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        disabled={!selectableFilteredIds.length}
                        aria-label={t('table.selectAll')}
                        title={t('table.selectAll')}
                        className="h-4 w-4 rounded border-line accent-electric cursor-pointer"
                      />
                    </th>
                  )}
                  {columns.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-4 py-3.5">
                      {c.label}
                    </th>
                  ))}
                  {showNewsSoon && <th className="whitespace-nowrap px-4 py-3.5">{t('search.results.cols.news')}</th>}
                  {showActionsColumn && <th className="w-14 whitespace-nowrap px-4 py-3.5 text-right">{t('table.actions')}</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filtered.map(({ row, id, key, isToday }) => {
                  const isSelected = id !== null && selected.has(id)
                  const isRowDeleting = id !== null && deletingIds.has(id)
                  return (
                    <tr
                      key={key}
                      className={`transition-colors hover:bg-electric-50/40 ${isSelected ? 'bg-electric-50/60' : ''} ${
                        isRowDeleting ? 'opacity-50' : ''
                      }`}
                    >
                      {selectable && onDeleteIds && (
                        <td className="px-4 py-3.5 align-top">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleOne(id)}
                            disabled={id === null || isRowDeleting}
                            aria-label={t('table.selectRow')}
                            className="h-4 w-4 rounded border-line accent-electric cursor-pointer disabled:opacity-40"
                          />
                        </td>
                      )}

                      {columns.map((c) => {
                        const raw = row[c.key]
                        const text = formatPlainValue(raw, locale)
                        const showNewBadge = isToday && c.key === firstBadgeColKey
                        const isClickableNameCell = Boolean(onConvertRow && c.key === clickableNameColKey && text)
                        if (!text) {
                          return (
                            <td key={c.key} className="px-4 py-3.5 align-top text-muted/60">
                              <span className="inline-flex items-center gap-1.5">
                                <span>—</span>
                                {showNewBadge && (
                                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                    {newBadgeLabel}
                                  </span>
                                )}
                              </span>
                            </td>
                          )
                        }
                        if (isClickableNameCell) {
                          return (
                            <td key={c.key} className="max-w-[260px] px-4 py-3.5 align-top">
                              <span className="inline-flex flex-wrap items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => onConvertRow(row)}
                                  title={`${convertRowLabel}: ${text}`}
                                  className="inline-flex items-center gap-1.5 text-left font-bold text-electric hover:underline cursor-pointer"
                                >
                                  <span>{text}</span>
                                  <UserPlus className="h-3.5 w-3.5 shrink-0" />
                                </button>
                                {showNewBadge && (
                                  <span className="inline-flex items-center rounded-full border border-emerald-500/30 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
                                    {newBadgeLabel}
                                  </span>
                                )}
                              </span>
                            </td>
                          )
                        }
                        if (isUrlValue(c.key, String(raw))) {
                          return (
                            <td key={c.key} className="max-w-[220px] px-4 py-3.5 align-top">
                              <a
                                href={toHref(raw)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 break-all font-medium text-electric hover:underline"
                              >
                                <span className="truncate max-w-[180px]">{String(raw).replace(/^https?:\/\/(www\.)?/i, '')}</span>
                                <ExternalLink className="h-3 w-3 shrink-0" />
                              </a>
                            </td>
                          )
                        }
                        if (isEmailKey(c.key)) {
                          return (
                            <td key={c.key} className="whitespace-nowrap px-4 py-3.5 align-top font-mono text-[11px] text-ink">
                              {text}
                            </td>
                          )
                        }
                        if (isPhoneKey(c.key)) {
                          return (
                            <td key={c.key} className="whitespace-nowrap px-4 py-3.5 align-top font-mono text-[11px] text-ink-soft">
                              {text}
                            </td>
                          )
                        }
                        return (
                          <td key={c.key} className="max-w-[260px] px-4 py-3.5 align-top leading-relaxed text-ink-soft">
                            <CompactTextCell
                              text={text}
                              colKey={c.key}
                              showNewBadge={showNewBadge}
                              newBadgeLabel={newBadgeLabel}
                            />
                          </td>
                        )
                      })}

                      {showNewsSoon && (
                        <td className="whitespace-nowrap px-4 py-3.5 align-top">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-line px-2.5 py-1 text-[10px] font-semibold text-muted">
                            <Newspaper className="h-3 w-3" /> {t('search.results.newsSoon')}
                          </span>
                        </td>
                      )}

                      {showActionsColumn && (
                        <td className="whitespace-nowrap px-4 py-3.5 text-right align-top">
                          <div className="inline-flex items-center justify-end gap-1.5">
                            {onConvertRow && (
                              <button
                                type="button"
                                onClick={() => onConvertRow(row)}
                                title={convertRowLabel}
                                aria-label={convertRowLabel}
                                className="btn btn-ghost btn-sm h-8 px-2.5 text-[11px]"
                              >
                                <UserPlus className="h-3.5 w-3.5 text-electric" />
                                <span>{convertRowLabel}</span>
                              </button>
                            )}
                            {selectable && onDeleteIds && (
                              <button
                                type="button"
                                onClick={() => handleInstantRowDelete(id)}
                                disabled={id === null || isRowDeleting}
                                title={t('table.deleteRow')}
                                aria-label={t('table.deleteRow')}
                                className="grid h-8 w-8 place-items-center rounded-lg text-muted transition hover:bg-red-500/10 hover:text-red-500 disabled:opacity-40 cursor-pointer"
                              >
                                {isRowDeleting ? <Loader2 className="h-4 w-4 animate-spin text-red-500" /> : <Trash2 className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal de confirmación de eliminación en lote */}
      <Modal open={Boolean(confirmIds)} onClose={() => !bulkDeleting && setConfirmIds(null)} labelledBy="confirm-delete-title">
        <div className="p-6 sm:p-8">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-red-500/10 text-red-500">
            <Trash2 className="h-6 w-6" />
          </div>
          <h3 id="confirm-delete-title" className="mt-4 text-lg font-bold text-ink">
            {t('table.confirmTitle')}
          </h3>
          <p className="mt-2 text-sm leading-relaxed text-muted">
            {confirmIds?.length === 1 ? t('table.confirmSingle') : t('table.confirmMultiple', { n: confirmIds?.length || 0 })}
          </p>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={() => setConfirmIds(null)} disabled={bulkDeleting} className="btn btn-ghost btn-sm">
              {t('common.cancel')}
            </button>
            <button
              type="button"
              onClick={confirmBulkDelete}
              disabled={bulkDeleting}
              className="btn btn-sm bg-red-600 text-white hover:bg-red-700"
            >
              {bulkDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
              {bulkDeleting ? t('table.deleting') : t('table.confirmBtn')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
