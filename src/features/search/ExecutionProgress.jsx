import { CheckCircle2, Loader2, Sparkles } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'

/** Barra de progreso y aviso de procesamiento en tiempo real mientras corre la búsqueda. step: 0..3 */
export default function ExecutionProgress({ step, running = false, liveActivity = null }) {
  const { t } = usePreferences()
  const steps = t('search.progress')
  const safeStep = step === null || step === undefined ? 0 : step
  const done = !running && safeStep >= steps.length - 1
  const nuevos = liveActivity?.registrosNuevos ?? 0
  const meta = liveActivity?.metaSolicitada
  const hasLiveMeta = Boolean(meta && meta > 0)
  const pct = hasLiveMeta && !done ? Math.min(99, Math.round((nuevos / meta) * 100)) : Math.round(((safeStep + 1) / steps.length) * 100)

  const liveLabel = hasLiveMeta
    ? `${nuevos} de ${meta} encontrados · Procesando...`
    : nuevos > 0
      ? `${nuevos} encontrados · Procesando...`
      : null

  return (
    <div className="mt-6 rounded-2xl border border-electric/30 bg-electric-50 p-4 sm:p-5 animate-pop" role="status" aria-live="polite">
      <div className="mb-2 flex items-center justify-between gap-3 text-xs">
        <span className="flex items-center gap-2 font-semibold text-ink">
          {done ? <CheckCircle2 className="h-4 w-4 shrink-0 text-electric" /> : <Loader2 className="h-4 w-4 shrink-0 animate-spin text-electric" />}
          {liveLabel && !done ? liveLabel : steps[safeStep]}
        </span>
        <span className="font-mono text-muted">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div className="h-full rounded-full bg-gradient-to-r from-electric to-navy-700 transition-all duration-500" style={{ width: `${pct}%` }} />
      </div>
      {!done && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-electric/20 bg-surface/80 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-electric" />
          <p>{t('search.processingBanner')}</p>
        </div>
      )}
    </div>
  )
}
