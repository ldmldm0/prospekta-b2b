import { Component, useEffect } from 'react'
import { ActivityProvider } from './context/ActivityContext'
import { AuthProvider, useAuth } from './context/AuthContext'
import { PreferencesProvider, usePreferences } from './context/PreferencesContext'
import { PublicModalProvider } from './context/PublicModalContext'
import { ToastProvider } from './components/ui/Toast'
import { RouterProvider, useRouter } from './router'
import LandingPage from './pages/public/LandingPage'
import LoginPage from './pages/public/LoginPage'
import DashboardPage from './pages/private/DashboardPage'
import AdminPage from './pages/private/AdminPage'

/** Evita pantallas en negro ante cualquier error inesperado en tiempo de ejecución. */
class ErrorBoundary extends Component {
  constructor(props) {
    super(props)
    this.state = { error: null }
  }

  static getDerivedStateFromError(error) {
    return { error }
  }

  render() {
    if (this.state.error) {
      return (
        <div className="flex min-h-screen items-center justify-center bg-page p-6 text-ink">
          <div className="card max-w-md p-8 text-center">
            <h1 className="text-xl font-bold">Algo salió mal al cargar PROSPEKTA</h1>
            <p className="mt-2 text-xs text-muted">{this.state.error?.message || 'Error inesperado en la aplicación.'}</p>
            <button
              type="button"
              onClick={() => {
                this.setState({ error: null })
                window.location.href = '/'
              }}
              className="btn btn-accent btn-sm mt-6"
            >
              Recargar aplicación
            </button>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

/**
 * Protección de rutas sin renderizar nunca `null`:
 *  - Sin sesión:
 *      · /login, /dashboard, /admin → LoginPage (sincronizando URL a /login)
 *      · cualquier otra ruta (/)    → LandingPage
 *  - Con sesión:
 *      · rol === 'admin'   → AdminPage (sincronizando URL a /admin)
 *      · rol === 'cliente' → DashboardPage (sincronizando URL a /dashboard)
 */
function AppRoutes() {
  const { isAuthenticated, isAdmin } = useAuth()
  const { path, navigate } = useRouter()
  const { t } = usePreferences()

  const targetPath = isAuthenticated
    ? path === '/admin'
      ? isAdmin
        ? '/admin'
        : '/dashboard'
      : path === '/dashboard'
        ? '/dashboard'
        : isAdmin
          ? '/admin'
          : '/dashboard'
    : path === '/login' || path === '/dashboard' || path === '/admin'
      ? '/login'
      : '/'

  useEffect(() => {
    if (path !== targetPath) {
      navigate(targetPath, { replace: true })
    }
  }, [path, targetPath, navigate])

  useEffect(() => {
    if (targetPath === '/login') document.title = `${t('login.title')} · PROSPEKTA`
    else if (targetPath === '/admin') document.title = `${t('dash.adminEyebrow')} · PROSPEKTA`
    else if (targetPath === '/dashboard') document.title = `Dashboard · PROSPEKTA`
    else document.title = `PROSPEKTA — ${t('common.tagline')} | ${t('common.motto')}`
  }, [targetPath, t])

  if (targetPath === '/admin') return <AdminPage />
  if (targetPath === '/dashboard') return <DashboardPage />
  if (targetPath === '/login') return <LoginPage />
  return <LandingPage />
}

export default function App() {
  return (
    <ErrorBoundary>
      <PreferencesProvider>
        <AuthProvider>
          <RouterProvider>
            <ToastProvider>
              <ActivityProvider>
                <PublicModalProvider>
                  <AppRoutes />
                </PublicModalProvider>
              </ActivityProvider>
            </ToastProvider>
          </RouterProvider>
        </AuthProvider>
      </PreferencesProvider>
    </ErrorBoundary>
  )
}
