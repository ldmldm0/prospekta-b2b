import { ArrowRight, BadgeCheck, Layers, MapPin, Search, ShieldCheck, Sparkles } from 'lucide-react'
import { HERO_PREVIEW_ROWS as PREVIEW_LEADS } from '../../data/heroPreview'
import { usePreferences } from '../../context/PreferencesContext'
import { usePublicModals } from '../../context/PublicModalContext'

function initials(name) {
  return name
    .replace(/^(Dra?\.)\s*/, '')
    .split(' ')
    .slice(0, 2)
    .map((p) => p[0])
    .join('')
}

/** Vista previa ilustrativa del producto. */
function ProductPreview() {
  const { t } = usePreferences()
  const p = t('hero.preview')
  const verifier = t('search.results.verifier')

  return (
    <div className="relative">
      <div className="card relative overflow-hidden p-0 shadow-lift">
        <div className="flex items-center justify-between gap-3 border-b border-line bg-mist/70 px-4 py-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-ink">
            <Search className="h-3.5 w-3.5 text-electric" />
            {p.mode}
          </div>
          <span className="truncate font-mono text-[10px] text-muted">{p.combos}</span>
        </div>

        <div className="flex flex-wrap gap-1.5 border-b border-line px-4 py-3">
          {p.chips.map((c) => (
            <span key={c} className="chip border-electric/20 bg-electric-50 text-ink">
              {c}
            </span>
          ))}
        </div>

        <ul className="divide-y divide-line">
          {PREVIEW_LEADS.map((l, i) => (
            <li key={l.email} className="flex items-start gap-3 px-4 py-3.5 animate-fade-up" style={{ animationDelay: `${300 + i * 140}ms` }}>
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy text-[11px] font-bold text-white dark:bg-electric">
                {initials(l.nombre)}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate text-sm font-semibold text-ink">{l.nombre}</p>
                  <span className="hidden shrink-0 items-center gap-1 rounded-full bg-electric-50 px-2 py-0.5 font-mono text-[10px] font-medium text-electric min-[400px]:inline-flex">
                    <BadgeCheck className="h-3 w-3" />
                    {verifier[l.verificador] || l.verificador}
                  </span>
                </div>
                <p className="truncate text-xs text-muted">
                  {l.cargo} · {l.empresa}
                </p>
                <p className="mt-1 flex items-center gap-3 font-mono text-[11px] text-ink-soft">
                  <span className="truncate">{l.email}</span>
                  <span className="hidden items-center gap-1 text-muted sm:inline-flex">
                    <MapPin className="h-3 w-3" />
                    {l.ubicacion.split(',')[0]}
                  </span>
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div className="flex items-center justify-between gap-3 bg-mist/70 px-4 py-3 text-xs">
          <span className="truncate text-muted">{p.footer}</span>
          <span className="shrink-0 font-semibold text-electric">{p.download}</span>
        </div>
      </div>

      <div className="card absolute -bottom-6 -left-4 hidden w-60 p-4 animate-float sm:block lg:-left-10">
        <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted">
          <Sparkles className="h-3.5 w-3.5 text-electric" /> {p.aiSummary}
        </div>
        <p className="mt-2 text-xs leading-relaxed text-ink">{p.aiQuote}</p>
      </div>
    </div>
  )
}

export default function Hero() {
  const { t } = usePreferences()
  const { openPackages, openRequestAccess } = usePublicModals()
  const metrics = t('hero.metrics')

  return (
    <section className="surface-hero relative overflow-hidden pb-16 pt-28 sm:pb-20 sm:pt-32 lg:pb-28 lg:pt-40">
      <div className="container-page grid items-center gap-12 lg:grid-cols-12 lg:gap-10">
        <div className="min-w-0 lg:col-span-6 animate-fade-up">
          <p className="eyebrow">{t('hero.eyebrow')}</p>
          <h1 className="mt-4 text-[2.1rem] font-extrabold leading-[1.08] tracking-[-0.025em] min-[400px]:text-[2.35rem] sm:text-5xl lg:text-[3.6rem]">
            {t('hero.title')}
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted sm:text-lg">
            {t('hero.subPre')}
            <strong className="font-semibold text-ink">{t('hero.subBold')}</strong>
            {t('hero.subPost')}
          </p>

          <div className="mt-9 flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              id="hero-request-access"
              onClick={() => openRequestAccess()}
              className="btn btn-accent px-6 py-3.5"
            >
              {t('hero.ctaAccess')}
              <ArrowRight className="h-4 w-4" />
            </button>
            <button type="button" id="hero-view-packages" onClick={openPackages} className="btn btn-ghost px-6 py-3.5">
              <Layers className="h-4 w-4 text-electric" />
              {t('hero.ctaPackages')}
            </button>
          </div>

          <p className="mt-6 flex items-start gap-2 text-xs text-muted">
            <ShieldCheck className="h-4 w-4 shrink-0 text-electric" />
            {t('hero.trust')}
          </p>
        </div>

        <div className="min-w-0 lg:col-span-6 lg:pl-6 animate-fade-up [animation-delay:150ms]">
          <ProductPreview />
        </div>
      </div>

      <div className="container-page mt-16 sm:mt-20">
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl border border-line bg-line lg:grid-cols-4">
          {metrics.map((m) => (
            <div key={m.label} className="bg-surface px-4 py-5 sm:px-7 sm:py-6">
              <dt className="sr-only">{m.label}</dt>
              <dd className="font-display text-2xl font-extrabold tracking-tight text-ink sm:text-3xl">{m.value}</dd>
              <p className="mt-1 text-xs leading-snug text-muted sm:text-sm">{m.label}</p>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
