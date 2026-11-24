import { useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, ShieldCheck } from 'lucide-react'
import Logo from '../../components/brand/Logo'
import Footer from '../../components/layout/Footer'
import { LanguageToggle, ThemeToggle } from '../../components/ui/PreferenceToggles'
import { useAuth } from '../../context/AuthContext'
import { usePreferences } from '../../context/PreferencesContext'
import { usePublicModals } from '../../context/PublicModalContext'
import { useRouter } from '../../router'
import { BRAND } from '../../config/brand'

/** Página dedicada /login conectada directamente a POST https://b2b-n8n.c4adol.easypanel.host/webhook/auth-login. */
export default function LoginPage() {
  const { login } = useAuth()
  const { t } = usePreferences()
  const { openRequestAccess } = usePublicModals()
  const { navigate } = useRouter()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const submit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const cleanEmail = String(email ?? '').trim().toLowerCase()
      const usuario = await login(cleanEmail, password)
      const rol = String(usuario?.rol || '').trim().toLowerCase()
      const isPanelAdmin = rol === 'superadmin' || rol === 'admin'
      navigate(isPanelAdmin ? '/admin' : '/dashboard', { replace: true })
    } catch (error) {
      console.error('Error Login:', error)
      setError(error?.message ? String(error.message) : String(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-page text-ink flex flex-col">
      {/* Barra superior compacta */}
      <header className="border-b border-line bg-page/90 backdrop-blur-xl">
        <div className="container-page flex h-[76px] items-center justify-between gap-3">
          <button type="button" onClick={() => navigate('/')} className="cursor-pointer" id="login-logo">
            <Logo size="md" />
          </button>
          <div className="flex items-center gap-2">
            <LanguageToggle />
            <ThemeToggle />
            <button type="button" id="login-back" onClick={() => navigate('/')} className="btn btn-ghost btn-sm h-10">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">{t('login.backHome')}</span>
            </button>
          </div>
        </div>
      </header>

      <main className="container-page flex flex-1 items-center justify-center py-10 sm:py-16">
        <div className="grid w-full max-w-4xl grid-cols-1 overflow-hidden rounded-3xl border border-line bg-surface shadow-lift lg:grid-cols-5 animate-pop">
          {/* Panel lateral de identidad */}
          <aside className="surface-navy hidden flex-col justify-between p-10 text-white lg:col-span-2 lg:flex">
            <div>
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1 font-mono text-[10px] uppercase tracking-[0.16em] text-blue-200">
                <ShieldCheck className="h-3.5 w-3.5 text-electric" />
                {t('login.asideBadge')}
              </span>
              <h2 className="mt-5 text-2xl font-extrabold leading-snug text-white">{t('login.asideTitle')}</h2>
              <p className="mt-3 text-sm leading-relaxed text-blue-100/80">{t('login.asideSubtitle')}</p>
              <ul className="mt-8 space-y-3.5 text-sm text-blue-50">
                {t('login.asideBullets').map((b) => (
                  <li key={b} className="flex items-start gap-2.5">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-electric" />
                    <span>{b}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-[11px] text-blue-200/70">
              {t('common.motto')} · {BRAND.signature}
            </p>
          </aside>

          {/* Formulario */}
          <div className="p-6 sm:p-10 lg:col-span-3">
            <div className="mb-6 lg:hidden">
              <Logo size="md" />
            </div>
            <h1 id="login-title" className="text-2xl font-extrabold sm:text-3xl">
              {t('login.title')}
            </h1>
            <p className="mt-1.5 text-sm text-muted">{t('login.subtitle')}</p>

            <form onSubmit={submit} className="mt-7 space-y-4">
              <div>
                <label className="field-label" htmlFor="login-email">
                  {t('login.email')}
                </label>
                <input
                  id="login-email"
                  type="email"
                  required
                  autoComplete="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder={t('login.emailPh')}
                />
              </div>

              <div>
                <label className="field-label" htmlFor="login-password">
                  {t('login.password')}
                </label>
                <div className="relative">
                  <input
                    id="login-password"
                    type={showPwd ? 'text' : 'password'}
                    required
                    autoComplete="current-password"
                    className="field pr-11"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPwd((v) => !v)}
                    className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink cursor-pointer"
                    aria-label={showPwd ? t('login.hidePwd') : t('login.showPwd')}
                  >
                    {showPwd ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <p
                  id="login-error-alert"
                  className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 font-mono text-xs leading-relaxed text-red-500 dark:text-red-300"
                  role="alert"
                >
                  {error}
                </p>
              )}

              <button type="submit" id="login-submit" disabled={loading} className="btn btn-accent mt-2 w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowRight className="h-4 w-4" />}
                {loading ? t('login.verifying') : t('login.submit')}
              </button>
            </form>

            <p className="mt-7 border-t border-line pt-5 text-center text-xs text-muted">
              {t('login.noAccount')}{' '}
              <button
                type="button"
                id="login-request-access"
                onClick={() => openRequestAccess()}
                className="font-semibold text-electric hover:underline cursor-pointer"
              >
                {t('login.requestAccess')}
              </button>
            </p>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
