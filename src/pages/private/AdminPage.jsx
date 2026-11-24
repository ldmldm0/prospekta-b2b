import PrivateTopbar from '../../components/layout/PrivateTopbar'
import Footer from '../../components/layout/Footer'
import AdminPanel from '../../features/admin/AdminPanel'
import { useAuth } from '../../context/AuthContext'
import { usePreferences } from '../../context/PreferencesContext'

/** Vista privada /admin: accesible para superadmin y admin. */
export default function AdminPage() {
  const { usuario } = useAuth()
  const { t } = usePreferences()
  const firstName = (usuario?.nombre || usuario?.email || '').split(' ')[0]

  return (
    <div className="flex min-h-screen flex-col bg-mist">
      <PrivateTopbar />

      <main className="container-page flex-1 py-6 sm:py-10">
        <div className="mb-6 flex flex-col justify-between gap-2 sm:mb-8 sm:flex-row sm:items-end animate-fade-up">
          <div>
            <p className="eyebrow">{t('dash.adminEyebrow')}</p>
            <h1 className="mt-2 text-2xl font-extrabold sm:text-3xl">{t('dash.greeting', { name: firstName })}</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted">{t('dash.adminSubtitle')}</p>
          </div>
          <p className="hidden text-xs text-muted sm:block">{t('common.motto')}</p>
        </div>

        <AdminPanel />
      </main>

      <Footer compact />
    </div>
  )
}
