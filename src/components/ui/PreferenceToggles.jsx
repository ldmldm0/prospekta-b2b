import { Languages, Moon, Sun } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'

/** Botón ES / EN. */
export function LanguageToggle({ className = '' }) {
  const { lang, toggleLang, t } = usePreferences()
  return (
    <button
      type="button"
      id="lang-toggle"
      onClick={toggleLang}
      title={t('prefs.switchLang')}
      aria-label={t('prefs.switchLang')}
      className={`inline-flex h-10 shrink-0 items-center gap-1 rounded-xl border border-line bg-surface px-2.5 text-xs font-bold text-ink transition hover:border-electric/40 hover:bg-electric-50 cursor-pointer ${className}`}
    >
      <Languages className="h-4 w-4 text-electric" />
      <span className={lang === 'es' ? 'text-ink' : 'text-muted/60'}>ES</span>
      <span className="text-muted/40">/</span>
      <span className={lang === 'en' ? 'text-ink' : 'text-muted/60'}>EN</span>
    </button>
  )
}

/** Botón Sol / Luna. */
export function ThemeToggle({ className = '' }) {
  const { theme, toggleTheme, t } = usePreferences()
  const dark = theme === 'dark'
  const label = dark ? t('prefs.switchToLight') : t('prefs.switchToDark')
  return (
    <button type="button" id="theme-toggle" onClick={toggleTheme} title={label} aria-label={label} className={`icon-btn ${className}`}>
      {dark ? <Sun className="h-4.5 w-4.5 text-electric" /> : <Moon className="h-4.5 w-4.5 text-electric" />}
    </button>
  )
}

/** Versión ancha para menús móviles: muestra ambos controles con etiqueta. */
export function MobilePreferences() {
  const { lang, setLang, theme, toggleTheme, t } = usePreferences()
  const dark = theme === 'dark'
  return (
    <div className="grid grid-cols-2 gap-2">
      <div className="rounded-xl border border-line p-1">
        <p className="px-2 pt-1 text-[10px] font-semibold uppercase tracking-wider text-muted">{t('prefs.language')}</p>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {['es', 'en'].map((code) => (
            <button
              key={code}
              type="button"
              onClick={() => setLang(code)}
              aria-pressed={lang === code}
              className={`rounded-lg py-2 text-xs font-bold transition cursor-pointer ${lang === code ? 'bg-electric text-white' : 'text-muted hover:text-ink'}`}
            >
              {code.toUpperCase()}
            </button>
          ))}
        </div>
      </div>
      <button type="button" onClick={toggleTheme} className="flex items-center gap-3 rounded-xl border border-line p-3 text-left cursor-pointer hover:bg-electric-50">
        <span className="grid h-9 w-9 place-items-center rounded-lg bg-electric-50 text-electric">
          {dark ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
        </span>
        <span>
          <span className="block text-[10px] font-semibold uppercase tracking-wider text-muted">{t('prefs.theme')}</span>
          <span className="block text-xs font-semibold text-ink">{dark ? t('prefs.dark') : t('prefs.light')}</span>
        </span>
      </button>
    </div>
  )
}
