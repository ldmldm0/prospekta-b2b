import { Compass, Download, Filter, Sparkles, Target } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'

const STEP_ICONS = [Filter, Sparkles, Download]
const MODE_ICONS = [Compass, Target]

export default function HowItWorks() {
  const { t } = usePreferences()
  const steps = t('how.steps')
  const modes = t('how.modes')

  return (
    <section id="como-funciona" className="bg-page py-20 sm:py-24 lg:py-32">
      <div className="container-page">
        <div className="reveal max-w-2xl">
          <p className="eyebrow">{t('how.eyebrow')}</p>
          <h2 className="mt-3 text-[1.9rem] font-extrabold leading-tight sm:text-[2.6rem]">{t('how.title')}</h2>
          <p className="mt-4 text-base text-muted sm:text-lg">{t('how.subtitle')}</p>
        </div>

        <ol className="mt-12 grid grid-cols-1 gap-5 sm:mt-14 lg:grid-cols-3">
          {steps.map(({ title, text, tags }, i) => {
            const Icon = STEP_ICONS[i]
            return (
              <li key={i} className="reveal card card-hover group relative flex flex-col p-6 sm:p-7" style={{ transitionDelay: `${i * 90}ms` }}>
                <div className="flex items-center justify-between">
                  <span className="grid h-12 w-12 place-items-center rounded-2xl bg-electric-50 text-electric transition-colors duration-300 group-hover:bg-electric group-hover:text-white">
                    <Icon className="h-5.5 w-5.5" />
                  </span>
                  <span className="font-display text-4xl font-extrabold text-line transition-colors group-hover:text-electric-100">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                </div>
                <h3 className="mt-6 text-xl font-bold leading-snug">{title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-muted">{text}</p>
                <div className="mt-6 flex flex-wrap gap-1.5">
                  {tags.map((tag) => (
                    <span key={tag} className="chip font-mono">
                      {tag}
                    </span>
                  ))}
                </div>
              </li>
            )
          })}
        </ol>

        <div className="reveal mt-6 grid grid-cols-1 gap-3 rounded-3xl bg-mist p-3 sm:grid-cols-2 sm:gap-5">
          {modes.map(({ title, text }, i) => {
            const Icon = MODE_ICONS[i]
            return (
              <div key={title} className="flex items-start gap-4 rounded-2xl bg-surface p-5 shadow-card sm:p-6">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-navy text-white dark:bg-electric">
                  <Icon className="h-5 w-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold">{title}</h3>
                  <p className="mt-1 text-sm leading-relaxed text-muted">{text}</p>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
