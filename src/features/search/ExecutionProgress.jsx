import { CheckCircle2, Coins, Sparkles } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'

/** Barra de progreso y aviso de procesamiento en tiempo real mientras corre la búsqueda. step: 0..3 */
export default function ExecutionProgress({ step, running = false, liveActivity = null }) {
  const { t } = usePreferences()
  const steps = t('search.progress')
  const safeStep = step === null || step === undefined ? 0 : step
  const done = !running && safeStep >= steps.length - 1
  const rawNuevos = liveActivity?.registrosNuevos ?? 0
  const meta = liveActivity?.metaSolicitada
  const hasLiveMeta = Boolean(meta && meta > 0)
  const nuevos = hasLiveMeta ? Math.min(rawNuevos, meta) : rawNuevos
  const pct = hasLiveMeta && !done ? Math.min(99, Math.round((nuevos / meta) * 100)) : Math.round(((safeStep + 1) / steps.length) * 100)

  const liveCountBadge = hasLiveMeta
    ? `${nuevos} de ${meta} encontrados`
    : nuevos > 0
      ? `${nuevos} encontrados`
      : null

  return (
    <div className="mt-6 rounded-2xl border border-electric/30 bg-electric-50 p-4 sm:p-5 animate-pop" role="status" aria-live="polite">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <span className="flex flex-wrap items-center gap-2 font-semibold text-ink">
          {done ? (
            <>
              <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-500" />
              <span>Búsqueda finalizada</span>
            </>
          ) : (
            <>
              <span className="relative flex h-2.5 w-2.5 shrink-0">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
              </span>
              <span>Búsqueda en curso · Verificando prospectos...</span>
              {liveCountBadge && (
                <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-300">
                  {liveCountBadge}
                </span>
              )}
            </>
          )}
        </span>
        <span className="font-mono text-muted">{done ? '100%' : `${pct}%`}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-line">
        <div
          className="h-full rounded-full bg-gradient-to-r from-electric to-navy-700 transition-all duration-500"
          style={{ width: `${done ? 100 : pct}%` }}
        />
      </div>
      {hasLiveMeta && !done && (
        <p
          id="progress-credit-reservation"
          className="mt-2.5 flex items-center gap-1.5 text-[11px] font-medium text-amber-700 dark:text-amber-300"
        >
          <Coins className="h-3.5 w-3.5 shrink-0 text-amber-500" />
          <span>Reservando hasta {meta} créditos — solo se descuentan los entregados al finalizar</span>
        </p>
      )}
      {!done && (
        <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-electric/20 bg-surface/80 px-3.5 py-3 text-xs leading-relaxed text-ink-soft">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 animate-pulse text-electric" />
          <p>{t('search.processingBanner')}</p>
        </div>
      )}
    </div>
  )
}
