import { useEffect } from 'react'
import { AlertTriangle, Loader2, LogOut, RefreshCw } from 'lucide-react'
import PrivateTopbar from '../../components/layout/PrivateTopbar'
import Footer from '../../components/layout/Footer'
import SearchWorkspace from '../../features/search/SearchWorkspace'
import { useActivity } from '../../context/ActivityContext'
import { useAuth } from '../../context/AuthContext'
import { usePreferences } from '../../context/PreferencesContext'
import { useClientData } from '../../hooks/useClientData'
import { useRouter } from '../../router'

/** Vista privada /dashboard: solo accesible para clientes autenticados. */
export default function DashboardPage() {
  const { usuario, logout } = useAuth()
  const { t } = usePreferences()
  const { navigate } = useRouter()
  const clientData = useClientData()
  const activity = useActivity()

  const { refresh, historial_exploratorio, resultados_lista, estado_busqueda } = clientData

  useEffect(() => {
    if (!activity) return undefined
    return activity.registerRefreshHandler(refresh)
  }, [activity, refresh])

  useEffect(() => {
    if (!activity) return
    activity.syncResultCounts({
      exploratoriaCount: historial_exploratorio.length,
      especificaCount: resultados_lista.length,
      saldoCreditos: usuario?.saldo_creditos,
      estadoBusqueda: estado_busqueda,
    })
  }, [activity, historial_exploratorio.length, resultados_lista.length, usuario?.saldo_creditos, estado_busqueda])

  const firstName = (usuario?.nombre || usuario?.email || '').split(' ')[0]

  const handleLogout = () => {
    logout()
    navigate('/login', { replace: true })
  }

  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <PrivateTopbar />

      <main className="container-page flex-1 py-6 sm:py-10">
        <div className="mb-6 flex flex-col justify-between gap-3 sm:mb-8 sm:flex-row sm:items-end animate-fade-up">
          <div>
            <p className="eyebrow">{t('dash.searchEyebrow')}</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t('dash.greeting', { name: firstName })}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t('dash.searchSubtitle')}</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="button"
              id="refresh-client-data"
              onClick={() => clientData.refresh()}
              disabled={clientData.loading || clientData.refreshing}
              className="btn btn-ghost btn-sm"
            >
              <RefreshCw className={`h-4 w-4 text-electric ${clientData.refreshing ? 'animate-spin' : ''}`} />
              {t('dash.refresh')}
            </button>
            <p className="hidden text-xs text-muted sm:block">{t('common.motto')}</p>
          </div>
        </div>

        {clientData.loading ? (
          <div className="card flex flex-col items-center justify-center gap-3 py-20 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-electric" />
            <p className="text-sm font-semibold text-ink">{t('dash.loadingTitle')}</p>
            <p className="text-xs text-muted">{t('dash.loadingSubtitle')}</p>
          </div>
        ) : clientData.error ? (
          <div className="card flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
            <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-500">
              <AlertTriangle className="h-6 w-6" />
            </span>
            <div>
              <p className="text-base font-bold text-ink">{t('dash.errorTitle')}</p>
              <p className="mt-1 max-w-md text-xs text-muted">{clientData.error}</p>
            </div>
            <div className="flex flex-wrap items-center justify-center gap-2">
              <button type="button" onClick={clientData.reload} className="btn btn-accent btn-sm">
                <RefreshCw className="h-4 w-4" />
                {t('dash.retry')}
              </button>
              <button type="button" onClick={handleLogout} className="btn btn-ghost btn-sm">
                <LogOut className="h-4 w-4" />
                {t('nav.logout')}
              </button>
            </div>
          </div>
        ) : (
          <SearchWorkspace
            historialExploratorio={clientData.historial_exploratorio}
            resultadosLista={clientData.resultados_lista}
            empresasCliente={clientData.empresas_cliente}
            savingCompanies={clientData.savingCompanies}
            addCompanies={clientData.addCompanies}
            deleteCompanies={clientData.deleteCompanies}
            markCompaniesProcessed={clientData.markCompaniesProcessed}
            refreshData={clientData.refresh}
            removeRows={clientData.removeRows}
          />
        )}
      </main>

      <Footer compact />
    </div>
  )
}
