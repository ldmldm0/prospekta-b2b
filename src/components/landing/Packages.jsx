import { ArrowRight, Check } from 'lucide-react'
import { PACKAGES } from '../../config/packages'
import { usePreferences } from '../../context/PreferencesContext'

export default function Packages({ onSelectPlan }) {
  const { t, lang, locale } = usePreferences()

  return (
    <section id="paquetes" className="bg-mist py-20 sm:py-24 lg:py-32">
      <div className="container-page">
        <div className="reveal mx-auto max-w-2xl text-center">
          <p className="eyebrow">{t('packages.eyebrow')}</p>
          <h2 className="mt-3 text-[1.9rem] font-extrabold leading-tight sm:text-[2.6rem]">{t('packages.title')}</h2>
          <p className="mt-4 text-base text-muted sm:text-lg">
            {t('packages.creditRule')}. {t('packages.subtitle')}
          </p>
        </div>

        <div className="mt-12 grid grid-cols-1 items-stretch gap-5 sm:mt-14 md:grid-cols-2 lg:grid-cols-3">
          {PACKAGES.map((p, i) => {
            const c = p[lang]
            const f = p.featured
            return (
              <article
                key={p.id}
                className={`reveal relative flex flex-col rounded-3xl p-7 transition-all duration-300 sm:p-8 ${
                  f ? 'surface-navy text-white shadow-lift md:col-span-2 lg:col-span-1 lg:-my-4 lg:py-12' : 'card card-hover'
                }`}
                style={{ transitionDelay: `${i * 90}ms` }}
              >
                {f && (
                  <span className="absolute right-6 top-6 rounded-full bg-electric px-3 py-1 text-[11px] font-semibold text-white">
                    {c.badge || t('packages.recommended')}
                  </span>
                )}
                <h3 className={`pr-24 text-lg font-bold ${f ? 'text-white' : ''}`}>{c.name}</h3>
                <p className={`mt-1.5 text-sm leading-relaxed ${f ? 'text-blue-100/80' : 'text-muted'}`}>{c.description}</p>

                <div className="mt-7 flex flex-wrap items-baseline gap-x-2 gap-y-1">
                  <span className={`font-display text-5xl font-extrabold tracking-tight ${f ? 'text-white' : 'text-ink'}`}>
                    {p.prefix}
                    {p.credits.toLocaleString(locale)}
                  </span>
                  <span className={`text-sm font-semibold ${f ? 'text-white' : 'text-ink'}`}>{c.unit}</span>
                </div>
                <p className={`mt-1 text-xs font-medium ${f ? 'text-blue-100/80' : 'text-muted'}`}>{c.creditSub}</p>

                <ul className={`mt-7 flex-1 space-y-3 border-t pt-7 text-sm ${f ? 'border-white/15' : 'border-line'}`}>
                  {c.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5">
                      <span className={`mt-0.5 grid h-4.5 w-4.5 shrink-0 place-items-center rounded-full ${f ? 'bg-electric text-white' : 'bg-electric-50 text-electric'}`}>
                        <Check className="h-3 w-3" strokeWidth={3} />
                      </span>
                      <span className={f ? 'text-blue-50' : 'text-ink'}>{feat}</span>
                    </li>
                  ))}
                </ul>

                <button type="button" id={`plan-cta-${p.id}`} onClick={() => onSelectPlan(p.id)} className={`btn mt-8 w-full ${f ? 'btn-accent' : 'btn-primary'}`}>
                  {t('packages.cta')}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            )
          })}
        </div>

        <p className="reveal mt-10 text-center text-sm text-muted">
          {t('packages.customPre')}{' '}
          <button type="button" onClick={() => onSelectPlan('personalizado')} className="font-semibold text-electric hover:underline cursor-pointer">
            {t('packages.customLink')}
          </button>
        </p>
      </div>
    </section>
  )
}
