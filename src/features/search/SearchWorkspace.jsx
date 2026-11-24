import { useEffect, useRef, useState } from 'react'
import { Check, Coins, Compass, Globe2, Loader2, Rocket, Target } from 'lucide-react'
import { createDefaultEspecifica, createDefaultExploratoria } from '../../config/searchOptions'
import { useActivity } from '../../context/ActivityContext'
import { useAuth } from '../../context/AuthContext'
import { usePreferences } from '../../context/PreferencesContext'
import { useToast } from '../../components/ui/Toast'
import StatCard from '../../components/ui/StatCard'
import ExploratoriaForm from './ExploratoriaForm'
import EspecificaForm from './EspecificaForm'
import ExecutionProgress from './ExecutionProgress'
import ResultsPanel from './ResultsPanel'
import { buildEspecificaPayload, buildExploratoriaPayload, runSearch } from './searchRunner'

const MODE_ICONS = { exploratoria: Globe2, especifica: Target }

/**
 * Buscador B2B con estados 100% independientes entre Búsqueda Exploratoria y Búsqueda Específica.
 * Al finalizar cualquier búsqueda (exitosa o parcial), recarga automáticamente `mis-datos`
 * para actualizar créditos, contadores, tablas de resultados y el estado "Procesado" de las empresas.
 */
export default function SearchWorkspace({
  historialExploratorio = [],
  resultadosLista = [],
  empresasCliente = [],
  savingCompanies = false,
  addCompanies,
  deleteCompanies,
  markCompaniesProcessed,
  refreshData,
  removeRows,
}) {
  const activity = useActivity()
  const { usuario, updateUser } = useAuth()
  const { t, lang, locale } = usePreferences()
  const toast = useToast()

  const [mode, setMode] = useState('exploratoria')

  // Estados 100% separados para cada tipo de búsqueda
  const [exploratoria, setExploratoria] = useState(createDefaultExploratoria)
  const [runningExp, setRunningExp] = useState(false)
  const [stepExp, setStepExp] = useState(null)

  const [especifica, setEspecifica] = useState(createDefaultEspecifica)
  const [filesEsp, setFilesEsp] = useState([])
  const [runningEsp, setRunningEsp] = useState(false)
  const [stepEsp, setStepEsp] = useState(null)

  const [resultsTab, setResultsTab] = useState('exploratoria')
  const followUpTimers = useRef([])

  useEffect(
    () => () => {
      followUpTimers.current.forEach(clearTimeout)
    },
    [],
  )

  const scheduleFollowUpRefresh = () => {
    followUpTimers.current.forEach(clearTimeout)
    followUpTimers.current = [
      setTimeout(() => refreshData(), 4000),
      setTimeout(() => refreshData(), 15000),
      setTimeout(() => refreshData(), 35000),
    ]
  }

  const syncImmediateCredits = (res) => {
    const nextCredits = res?.saldo_creditos ?? res?.creditsRemaining ?? res?.usuario?.saldo_creditos
    if (nextCredits !== undefined && nextCredits !== null && Number.isFinite(Number(nextCredits))) {
      updateUser({ saldo_creditos: Number(nextCredits) })
    }
  }

  const startExploratoria = async () => {
    if ((usuario?.saldo_creditos ?? 0) <= 0) {
      toast(t('search.toast.noCredits'), 'error')
      return
    }
    setRunningExp(true)
    const activityId = activity?.startActivity('exploratoria', {
      baselineCount: historialExploratorio.length,
      baselineCredits: usuario?.saldo_creditos,
    })
    try {
      const payload = buildExploratoriaPayload({ usuario, lang, exploratoria })
      const res = await runSearch('exploratoria', payload, { onStep: setStepExp })
      if (res?.status === 'processing' || res?.background) {
        // n8n sigue trabajando en segundo plano: mantener estado activo sin mostrar errores
        return
      }
      syncImmediateCredits(res)
      setStepExp(3)
      setResultsTab('exploratoria')
      await refreshData()
      activity?.completeActivity(activityId)
      scheduleFollowUpRefresh()
      toast(t('search.toast.completed'))
      setTimeout(() => document.getElementById('results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
    } catch (err) {
      setStepExp(null)
      const outcome = activity?.handleSearchError?.(activityId, err)
      if (outcome && !outcome.keepPolling) {
        toast(outcome.message || 'La búsqueda falló en el servidor. Revisa los parámetros o intenta nuevamente.', 'error')
      }
    } finally {
      setRunningExp(false)
      setTimeout(() => setStepExp(null), 2600)
    }
  }

  const startEspecifica = async () => {
    if (!empresasCliente.length && !filesEsp.length) {
      toast(t('search.toast.noCompanies'), 'error')
      return
    }
    if ((usuario?.saldo_creditos ?? 0) <= 0) {
      toast(t('search.toast.noCredits'), 'error')
      return
    }
    setRunningEsp(true)
    const activityId = activity?.startActivity('especifica', {
      baselineCount: resultadosLista.length,
      baselineCredits: usuario?.saldo_creditos,
    })
    try {
      const payload = buildEspecificaPayload({
        usuario,
        lang,
        especifica,
        companies: empresasCliente,
        files: filesEsp,
      })
      const res = await runSearch('especifica', payload, { onStep: setStepEsp })
      if (res?.status === 'processing' || res?.background) {
        // n8n sigue trabajando en segundo plano: mantener estado activo sin mostrar errores
        return
      }
      syncImmediateCredits(res)
      markCompaniesProcessed?.(empresasCliente)
      setStepEsp(3)
      setResultsTab('especifica')
      await refreshData()
      activity?.completeActivity(activityId)
      scheduleFollowUpRefresh()
      toast(t('search.toast.completed'))
      setTimeout(() => document.getElementById('results-panel')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 350)
    } catch (err) {
      setStepEsp(null)
      const outcome = activity?.handleSearchError?.(activityId, err)
      if (outcome && !outcome.keepPolling) {
        toast(outcome.message || 'La búsqueda falló en el servidor. Revisa los parámetros o intenta nuevamente.', 'error')
      }
    } finally {
      setRunningEsp(false)
      setTimeout(() => setStepEsp(null), 2600)
    }
  }

  const isExp = mode === 'exploratoria'
  const bgRunningExp = Boolean(activity?.activeActivities?.some((a) => a.type === 'exploratoria'))
  const bgRunningEsp = Boolean(activity?.activeActivities?.some((a) => a.type === 'especifica'))
  const isRunningExp = runningExp || bgRunningExp
  const isRunningEsp = runningEsp || bgRunningEsp
  const anyRunning = isRunningExp || isRunningEsp
  const step = isExp ? (stepExp ?? (bgRunningExp ? 1 : null)) : (stepEsp ?? (bgRunningEsp ? 1 : null))
  const CtaIcon = anyRunning ? Loader2 : Rocket

  const exploratoriaCount = Array.isArray(historialExploratorio) ? historialExploratorio.length : 0
  const especificaCount = Array.isArray(resultadosLista) ? resultadosLista.length : 0

  return (
    <div className="space-y-6">
      {/* Tarjetas superiores con conteos reales independientes */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 animate-fade-up">
        <StatCard
          tone="navy"
          icon={Coins}
          label={t('dash.statCredits')}
          value={(usuario?.saldo_creditos ?? 0).toLocaleString(locale)}
          hint={t('dash.statCreditsHint')}
        />
        <StatCard
          icon={Compass}
          label={t('dash.statExploratory')}
          value={exploratoriaCount.toLocaleString(locale)}
          hint={t('dash.statExploratoryHint')}
        />
        <StatCard
          icon={Target}
          label={t('dash.statSpecific')}
          value={especificaCount.toLocaleString(locale)}
          hint={t('dash.statSpecificHint')}
        />
      </div>

      <section className="card p-5 sm:p-8 animate-pop">
        {/* 1. Tipo de búsqueda */}
        <p className="eyebrow">{t('search.step1')}</p>
        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {['exploratoria', 'especifica'].map((id) => {
            const Icon = MODE_ICONS[id]
            const on = mode === id
            return (
              <button
                key={id}
                id={`mode-${id}`}
                type="button"
                aria-pressed={on}
                onClick={() => setMode(id)}
                className={`flex items-start gap-3.5 rounded-2xl border p-4 text-left transition cursor-pointer ${
                  on ? 'border-electric bg-electric-50 ring-4 ring-electric/10' : 'border-line bg-surface hover:border-electric/30'
                }`}
              >
                <span className={`mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-xl ${on ? 'bg-electric text-white' : 'bg-mist text-ink'}`}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">{t(`search.modes.${id}.title`)}</span>
                  <span className="mt-1 block text-xs leading-relaxed text-muted">{t(`search.modes.${id}.desc`)}</span>
                </span>
                {on && <Check className="h-4.5 w-4.5 shrink-0 text-electric" />}
              </button>
            )
          })}
        </div>

        {/* 2. Formularios independientes */}
        <div className="mt-8 border-t border-line pt-8">
          {isExp ? (
            <div key="form-exploratoria" className="animate-pop">
              <ExploratoriaForm value={exploratoria} onChange={setExploratoria} />
            </div>
          ) : (
            <div key="form-especifica" className="animate-pop">
              <EspecificaForm
                value={especifica}
                onChange={setEspecifica}
                companies={empresasCliente}
                files={filesEsp}
                onFiles={setFilesEsp}
                onAddCompanies={addCompanies}
                onDeleteCompanies={deleteCompanies}
                savingCompanies={savingCompanies}
              />
            </div>
          )}
        </div>

        {/* 3. Acción */}
        <div className="mt-8 flex flex-col gap-3 border-t border-line pt-6 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            id="start-search"
            onClick={isExp ? startExploratoria : startEspecifica}
            disabled={anyRunning}
            className="btn btn-accent w-full py-4 text-[15px] sm:w-auto sm:px-8"
          >
            <CtaIcon className={`h-5 w-5 ${anyRunning ? 'animate-spin' : ''}`} />
            {t(`search.modes.${mode}.cta`)}
          </button>
        </div>

        {(anyRunning || step !== null) && (
          <ExecutionProgress
            step={step}
            running={anyRunning}
            liveActivity={activity?.activeActivities?.find((a) => a.type === mode) || activity?.activeActivities?.[0] || null}
          />
        )}
      </section>

      <ResultsPanel
        historialExploratorio={historialExploratorio}
        resultadosLista={resultadosLista}
        tab={resultsTab}
        onTab={setResultsTab}
        removeRows={removeRows}
      />
    </div>
  )
}
