import { useState } from 'react'
import { Compass, Target } from 'lucide-react'
import DataTable from '../../components/ui/DataTable'
import { useAuth } from '../../context/AuthContext'
import { usePreferences } from '../../context/PreferencesContext'
import { useToast } from '../../components/ui/Toast'
import { resultsApi } from '../../services/api'

const TAB_TO_TABLE = {
  exploratoria: 'historial_exploratorio',
  especifica: 'resultados_lista',
}

/**
 * Resultados en dos pestañas independientes (Exploratoria / Específica),
 * cada una con buscador interno, exportación CSV/Excel y eliminación (soft delete).
 */
export default function ResultsPanel({ historialExploratorio = [], resultadosLista = [], tab, onTab, removeRows }) {
  const { usuario } = useAuth()
  const { t, lang, locale } = usePreferences()
  const toast = useToast()
  const [filterStats, setFilterStats] = useState({ filtered: 0, total: 0, active: false })

  const rowsByTab = {
    exploratoria: historialExploratorio,
    especifica: resultadosLista,
  }
  const rows = rowsByTab[tab] || []
  const tabla = TAB_TO_TABLE[tab]

  const tabs = [
    { id: 'exploratoria', label: t('search.results.tabExploratoria'), icon: Compass },
    { id: 'especifica', label: t('search.results.tabEspecifica'), icon: Target },
  ]

  const handleDelete = async (ids) => {
    try {
      await resultsApi.ocultar(usuario.id_cliente, tabla, ids)
      removeRows(tabla, ids)
      toast(t('search.toast.deleted', { n: ids.length }))
    } catch (err) {
      toast(err.message || t('search.toast.deleteError'), 'error')
      throw err
    }
  }

  const isFilteredView = filterStats.active && filterStats.total === rows.length
  const badgeText = isFilteredView
    ? lang === 'en'
      ? `${filterStats.filtered.toLocaleString(locale)} of ${rows.length.toLocaleString(locale)} records`
      : `${filterStats.filtered.toLocaleString(locale)} de ${rows.length.toLocaleString(locale)} registros`
    : t('search.results.count', { n: rows.length.toLocaleString(locale) })

  return (
    <section id="results-panel" className="card overflow-hidden scroll-mt-24">
      {/* Pestañas */}
      <div className="flex gap-1 overflow-x-auto border-b border-line bg-mist/50 p-1.5" role="tablist">
        {tabs.map(({ id, label, icon: Icon }) => {
          const on = tab === id
          return (
            <button
              key={id}
              id={`results-tab-${id}`}
              role="tab"
              aria-selected={on}
              type="button"
              onClick={() => onTab(id)}
              className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer sm:px-4 ${
                on ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
              }`}
            >
              <Icon className={`h-4 w-4 ${on ? 'text-electric' : ''}`} />
              <span className="whitespace-nowrap">{label}</span>
              <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${on ? 'bg-electric text-white' : 'bg-line/60 text-muted'}`}>
                {rowsByTab[id].length}
              </span>
            </button>
          )
        })}
      </div>

      {/* Encabezado de la pestaña */}
      <div className="flex flex-col gap-2 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h3 className="text-lg font-bold">{tabs.find((x) => x.id === tab).label}</h3>
            <span id="results-dynamic-badge" className="rounded-full bg-electric-50 px-2.5 py-0.5 font-mono text-xs font-semibold text-electric">
              {badgeText}
            </span>
          </div>
          <p className="mt-1 text-xs text-muted">{t('search.results.subtitle')}</p>
        </div>
      </div>

      <DataTable
        key={tab}
        rows={rows}
        exportPrefix={`prospekta_${tabla}`}
        selectable
        onDeleteIds={handleDelete}
        showNewsSoon
        enableResultFilters
        onFilterCountChange={setFilterStats}
        emptyTitle={t('search.results.emptyTitle')}
        emptySubtitle={tab === 'exploratoria' ? t('search.results.emptyExploratoria') : t('search.results.emptyEspecifica')}
      />
    </section>
  )
}
