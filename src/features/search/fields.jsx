import { Check, Sparkles } from 'lucide-react'
import { AREAS, LEVELS, MAX_PROFILE_WORDS, PROFILE_EXAMPLES, QUANTITIES, clampWords, countWords } from '../../config/searchOptions'
import { usePreferences } from '../../context/PreferencesContext'

/** Etiqueta de sección del formulario. */
export function SectionLabel({ children, aside, htmlFor }) {
  return (
    <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
      <label htmlFor={htmlFor} className="eyebrow">
        {children}
      </label>
      {aside}
    </div>
  )
}

/**
 * Grupo de botones de selección múltiple (tamaños, áreas, niveles).
 * Nunca deja la selección vacía si `keepOne` es true.
 */
export function ChipToggleGroup({ options, value, onChange, keepOne = true, exclusive, className = 'flex flex-wrap gap-2', idPrefix }) {
  const { lang } = usePreferences()
  const toggle = (v) => {
    const on = value.includes(v)
    if (on) {
      if (keepOne && value.length === 1) return
      onChange(value.filter((x) => x !== v))
    } else if (exclusive && v === exclusive) {
      onChange([v])
    } else {
      onChange([...value.filter((x) => x !== exclusive), v])
    }
  }
  return (
    <div className={className}>
      {options.map((o, i) => {
        const on = value.includes(o.value)
        return (
          <button key={o.value} id={idPrefix ? `${idPrefix}-${i}` : undefined} type="button" aria-pressed={on} onClick={() => toggle(o.value)} className="toggle-chip">
            <span className="truncate">{o[lang]}</span>
            {on && <Check className="h-3.5 w-3.5 shrink-0 text-electric" />}
          </button>
        )
      })}
    </div>
  )
}

/** Campo abierto de perfil con límite estricto de 60 palabras y contador visual en tiempo real. */
export function ProfileField({ id, value, onChange, hintKey = 'search.perfilHint', onExample }) {
  const { t, lang } = usePreferences()
  const words = countWords(value)
  const atLimit = words >= MAX_PROFILE_WORDS

  const handleChange = (e) => {
    const next = e.target.value
    if (countWords(next) <= MAX_PROFILE_WORDS) {
      onChange(next)
    } else {
      onChange(clampWords(next, MAX_PROFILE_WORDS))
    }
  }

  return (
    <div>
      <SectionLabel
        htmlFor={id}
        aside={
          <span
            className={`rounded-full px-2.5 py-0.5 font-mono text-[11px] font-semibold ${
              atLimit ? 'bg-amber-500/15 text-amber-400' : 'bg-mist text-muted'
            }`}
          >
            {t('search.wordCount', { n: words, max: MAX_PROFILE_WORDS })}
          </span>
        }
      >
        {t('search.perfil')}
      </SectionLabel>
      <textarea
        id={id}
        rows={3}
        value={value}
        onChange={handleChange}
        placeholder={t('search.perfilPh')}
        className="field resize-y"
      />
      <p className="mt-2 flex items-start gap-1.5 text-xs text-electric">
        <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0" />
        {t(hintKey)}
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="mr-1 text-[11px] text-muted">{t('search.examples')}</span>
        {PROFILE_EXAMPLES.map((ex) => (
          <button
            key={ex.es.label}
            type="button"
            onClick={() => {
              onChange(clampWords(ex[lang].text, MAX_PROFILE_WORDS))
              onExample?.()
            }}
            className="rounded-lg border border-line bg-surface px-2.5 py-1 text-[11px] text-muted transition hover:border-electric/40 hover:text-electric cursor-pointer"
          >
            {ex[lang].label}
          </button>
        ))}
      </div>
    </div>
  )
}

export function QuantityField({ id, value, onChange }) {
  const { t, lang } = usePreferences()
  return (
    <div>
      <SectionLabel htmlFor={id}>{t('search.quantity')}</SectionLabel>
      <select id={id} value={value} onChange={(e) => onChange(Number(e.target.value))} className="field cursor-pointer">
        {QUANTITIES.map((q) => (
          <option key={q.value} value={q.value}>
            {q[lang]}
          </option>
        ))}
      </select>
      <p className="mt-1.5 text-[11px] text-muted">{t('search.quantityHint')}</p>
    </div>
  )
}

/** Cruce dinámico: 14 áreas × 6 niveles. */
export function SegmentationFields({ areas, niveles, onAreas, onNiveles, idPrefix }) {
  const { t } = usePreferences()
  const combos = Math.max(1, areas.length) * Math.max(1, niveles.length)
  const allAreas = areas.length === AREAS.length

  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
      <div className="lg:col-span-7">
        <SectionLabel
          aside={
            <button
              type="button"
              onClick={() => onAreas(allAreas ? [AREAS[0].value, AREAS[1].value] : AREAS.map((a) => a.value))}
              className="text-xs font-semibold text-electric hover:underline cursor-pointer"
            >
              {t('search.toggleAll')}
            </button>
          }
        >
          {t('search.areas', { n: AREAS.length })}
        </SectionLabel>
        <ChipToggleGroup idPrefix={`${idPrefix}-area`} options={AREAS} value={areas} onChange={onAreas} className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2 sm:grid-cols-3" />
      </div>
      <div className="lg:col-span-5">
        <SectionLabel
          aside={<span className="rounded-full bg-electric-50 px-2.5 py-0.5 font-mono text-[11px] font-semibold text-electric">{t('search.combos', { n: combos })}</span>}
        >
          {t('search.levels', { n: LEVELS.length })}
        </SectionLabel>
        <ChipToggleGroup idPrefix={`${idPrefix}-level`} options={LEVELS} value={niveles} onChange={onNiveles} className="grid grid-cols-1 gap-2 min-[400px]:grid-cols-2" />
      </div>
    </div>
  )
}
