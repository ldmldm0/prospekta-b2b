import { useEffect, useState } from 'react'
import { LogIn, Menu, X } from 'lucide-react'
import Logo from '../brand/Logo'
import { LanguageToggle, MobilePreferences, ThemeToggle } from '../ui/PreferenceToggles'
import { usePreferences } from '../../context/PreferencesContext'
import { usePublicModals } from '../../context/PublicModalContext'

/**
 * Header fijo de la vista pública (escritorio + menú hamburguesa en móvil).
 * Los enlaces principales abren modales emergentes consistentes sin saltos bruscos de scroll.
 */
export default function PublicNavbar({ onLogin }) {
  const { t } = usePreferences()
  const { openHowItWorks, openPackages, openRequestAccess } = usePublicModals()
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  // Cierra el menú móvil al pasar a escritorio
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 1024px)')
    const onChange = () => mq.matches && setOpen(false)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  const links = [
    { id: 'como-funciona', key: 'nav.howItWorks', action: openHowItWorks },
    { id: 'paquetes', key: 'nav.packages', action: openPackages },
    { id: 'solicitar-acceso', key: 'nav.contact', action: () => openRequestAccess() },
  ]

  const triggerLink = (action) => {
    setOpen(false)
    action()
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-300 ${
        scrolled || open ? 'border-b border-line bg-page/90 backdrop-blur-xl' : 'bg-transparent'
      }`}
    >
      <div className="container-page flex h-[78px] items-center justify-between gap-4">
        <button type="button" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })} className="min-w-0 cursor-pointer" id="nav-logo">
          <Logo size="md" />
        </button>

        <nav className="hidden items-center gap-1 lg:flex" aria-label="Principal">
          {links.map((l) => (
            <button
              key={l.id}
              type="button"
              id={`nav-${l.id}`}
              onClick={() => triggerLink(l.action)}
              className="rounded-lg px-3.5 py-2 text-sm font-medium text-muted transition-colors hover:bg-mist hover:text-ink cursor-pointer"
            >
              {t(l.key)}
            </button>
          ))}
          <span className="mx-2 h-6 w-px bg-line" />
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <button type="button" id="nav-login" onClick={onLogin} className="btn btn-primary btn-sm ml-1 h-10 px-4">
              <LogIn className="h-4 w-4" />
              {t('nav.login')}
            </button>
          </div>
        </nav>

        <button
          type="button"
          className="icon-btn lg:hidden"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
          aria-expanded={open}
          aria-controls="mobile-menu"
          id="nav-mobile-toggle"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="max-h-[calc(100dvh-72px)] overflow-y-auto border-t border-line bg-page lg:hidden animate-pop">
          <div className="container-page flex flex-col gap-1 py-4">
            {links.map((l) => (
              <button
                key={l.id}
                type="button"
                onClick={() => triggerLink(l.action)}
                className="rounded-xl px-3 py-3.5 text-left text-base font-semibold text-ink hover:bg-mist cursor-pointer"
              >
                {t(l.key)}
              </button>
            ))}
            <div className="mt-3 border-t border-line pt-4">
              <MobilePreferences />
            </div>
            <button
              type="button"
              id="nav-login-mobile"
              onClick={() => {
                setOpen(false)
                onLogin()
              }}
              className="btn btn-primary mt-3 w-full"
            >
              <LogIn className="h-4 w-4" /> {t('nav.login')}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
