import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { translations } from '../config/translations'

const LANG_KEY = 'prospekta.lang'
const THEME_KEY = 'prospekta.theme.user'
const PreferencesContext = createContext(null)

const safeGet = (key) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const safeSet = (key, value) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // Entornos sin acceso a localStorage (iframes restringidos / modo privado)
  }
}

const initialLang = () => {
  const saved = safeGet(LANG_KEY)
  if (saved === 'es' || saved === 'en') return saved
  return 'es'
}

const initialTheme = () => (safeGet(THEME_KEY) === 'light' ? 'light' : 'dark')

/** Busca 'a.b.c' dentro del diccionario. */
const lookup = (dict, path) => path.split('.').reduce((acc, k) => (acc == null ? acc : acc[k]), dict)

/** Idioma (ES/EN) y tema (claro/oscuro), persistidos en localStorage cuando está disponible. */
export function PreferencesProvider({ children }) {
  const [lang, setLang] = useState(initialLang)
  const [theme, setTheme] = useState(initialTheme)

  useEffect(() => {
    safeSet(LANG_KEY, lang)
    document.documentElement.lang = lang
  }, [lang])

  useEffect(() => {
    safeSet(THEME_KEY, theme)
    document.documentElement.classList.toggle('dark', theme === 'dark')
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0B1120' : '#021B54')
  }, [theme])

  const t = useCallback(
    (key, vars) => {
      let value = lookup(translations[lang], key)
      if (value === undefined) value = lookup(translations.es, key) ?? key
      if (typeof value === 'string' && vars) {
        value = value.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`))
      }
      return value
    },
    [lang],
  )

  const value = useMemo(
    () => ({
      lang,
      theme,
      t,
      setLang,
      toggleLang: () => setLang((l) => (l === 'es' ? 'en' : 'es')),
      toggleTheme: () => setTheme((th) => (th === 'dark' ? 'light' : 'dark')),
      locale: lang === 'es' ? 'es-CO' : 'en-US',
    }),
    [lang, theme, t],
  )

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePreferences() {
  const ctx = useContext(PreferencesContext)
  if (!ctx) throw new Error('usePreferences debe usarse dentro de <PreferencesProvider>')
  return ctx
}
