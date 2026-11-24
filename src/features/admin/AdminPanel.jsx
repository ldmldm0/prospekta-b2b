import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Coins,
  Compass,
  Eye,
  EyeOff,
  Inbox,
  KeyRound,
  Loader2,
  Lock,
  PauseCircle,
  Pencil,
  PlayCircle,
  RefreshCw,
  Search,
  ShieldCheck,
  Target,
  Unlock,
  UserPlus,
  Users,
  X,
} from 'lucide-react'
import StatCard from '../../components/ui/StatCard'
import DataTable from '../../components/ui/DataTable'
import { isSuperAdminUser, useAuth } from '../../context/AuthContext'
import { usePreferences } from '../../context/PreferencesContext'
import { useToast } from '../../components/ui/Toast'
import { adminApi } from '../../services/api'
import CreateUserModal from './CreateUserModal'
import EditUserModal from './EditUserModal'
import CreditsModal from './CreditsModal'

const isSuspended = (u) => String(u?.estado || 'activo').toLowerCase() === 'suspendido'

/** Determina si una cuenta está protegida (superadmin o administrador maestro #1). */
const isProtectedAccount = (u) => {
  if (!u || typeof u !== 'object') return false
  if (isSuperAdminUser(u)) return true
  const uid = u.id_cliente ?? u.id
  if (uid === 1 || uid === '1') return true
  if (u.es_principal === true || u.protegido === true) return true
  return false
}

/**
 * Panel Administrador real conectado a POST admin-gestion:
 * - 4 tarjetas superiores con métricas reales (Total Clientes, Créditos Activos, Total Prospectos Exploratoria, Total Prospectos Específica)
 * - Gestión de usuarios (crear, editar, créditos +/-/=, cambiar_estado con protección de superadmin)
 * - Leads de contacto
 * - Bóveda Global de Datos ("Bóveda: Exploratoria" y "Bóveda: Específica") exclusiva para superadmin y protegida por Token Maestro de Licencia.
 */
export default function AdminPanel() {
  const { usuario, isSuperAdmin } = useAuth()
  const { t, locale } = usePreferences()
  const toast = useToast()
  const idAdmin = usuario?.id_cliente

  const [usuarios, setUsuarios] = useState([])
  const [leads, setLeads] = useState([])
  const [bovedaExp, setBovedaExp] = useState([])
  const [bovedaEsp, setBovedaEsp] = useState([])
  const [totalExpCount, setTotalExpCount] = useState(0)
  const [totalEspCount, setTotalEspCount] = useState(0)

  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [tab, setTab] = useState('usuarios') // 'usuarios' | 'leads' | 'boveda_exploratoria' | 'boveda_especifica'
  const [userQuery, setUserQuery] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const [createOpen, setCreateOpen] = useState(false)
  const [editUser, setEditUser] = useState(null)
  const [creditsUser, setCreditsUser] = useState(null)

  // Protección con Token Maestro de Licencia para la Bóveda Global
  const [vaultUnlocked, setVaultUnlocked] = useState(false)
  const [licenseToken, setLicenseToken] = useState('')
  const [showToken, setShowToken] = useState(false)
  const [verifyingToken, setVerifyingToken] = useState(false)
  const [tokenError, setTokenError] = useState('')

  // Si el usuario logueado tiene rol superadmin (o en la lista de usuarios su registro es superadmin/protegido), habilitamos las pestañas de Bóveda
  const hasSuperAdminAccess = useMemo(() => {
    if (isSuperAdmin) return true
    const selfRow = usuarios.find((u) => String(u.id_cliente ?? u.id) === String(idAdmin))
    if (selfRow && isProtectedAccount(selfRow)) return true
    return String(idAdmin) === '1'
  }, [isSuperAdmin, usuarios, idAdmin])

  const loadAll = useCallback(
    async ({ silent = false } = {}) => {
      if (silent) setRefreshing(true)
      else setLoading(true)
      setError('')
      try {
        const res = await adminApi.listarTodo(idAdmin)
        setUsuarios(res.usuarios)
        setLeads(res.leads)
        if (res.boveda_exploratoria?.length) setBovedaExp(res.boveda_exploratoria)
        if (res.boveda_especifica?.length) setBovedaEsp(res.boveda_especifica)
        setTotalExpCount(Number(res.total_exploratoria) || res.boveda_exploratoria?.length || 0)
        setTotalEspCount(Number(res.total_especifica) || res.boveda_especifica?.length || 0)
      } catch (err) {
        if (!silent) setError(err.message || t('admin.errorGeneric'))
        else toast(err.message || t('admin.errorGeneric'), 'error')
      } finally {
        setLoading(false)
        setRefreshing(false)
      }
    },
    [idAdmin, t, toast],
  )

  useEffect(() => {
    loadAll({ silent: false })
  }, [loadAll])

  const totalClients = useMemo(
    () => usuarios.filter((u) => !isSuperAdminUser(u)).length || usuarios.length,
    [usuarios],
  )
  const activeCredits = useMemo(
    () => usuarios.filter((u) => !isSuspended(u)).reduce((sum, u) => sum + (Number(u.saldo_creditos) || 0), 0),
    [usuarios],
  )

  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase()
    if (!q) return usuarios
    return usuarios.filter((u) =>
      [u.nombre, u.empresa, u.email, u.rol, u.estado, u.id_cliente].some((v) => String(v ?? '').toLowerCase().includes(q)),
    )
  }, [usuarios, userQuery])

  const handleCreateUser = useCallback(
    async (payload) => {
      await adminApi.run('crear_usuario', idAdmin, payload)
      toast(t('admin.toastCreated'))
      await loadAll({ silent: true })
    },
    [idAdmin, toast, t, loadAll],
  )

  const handleEditUser = useCallback(
    async (payload) => {
      await adminApi.run('editar_usuario', idAdmin, payload)
      toast(t('admin.toastEdited'))
      await loadAll({ silent: true })
    },
    [idAdmin, toast, t, loadAll],
  )

  const handleUpdateCredits = useCallback(
    async (payload) => {
      await adminApi.run('actualizar_creditos', idAdmin, payload)
      toast(t('admin.toastCredits'))
      await loadAll({ silent: true })
    },
    [idAdmin, toast, t, loadAll],
  )

  const handleToggleEstado = async (u) => {
    if (isProtectedAccount(u)) {
      toast(t('admin.cannotSuspendSuperadmin'), 'error')
      return
    }
    const idCliente = String(u.email || u.id_cliente || u.id || '').trim().toLowerCase()
    const nextEstado = isSuspended(u) ? 'activo' : 'suspendido'
    setTogglingId(idCliente)
    try {
      await adminApi.run('cambiar_estado', idAdmin, { id_cliente: idCliente, email: idCliente, estado: nextEstado })
      toast(nextEstado === 'activo' ? t('admin.toastActivated') : t('admin.toastSuspended'))
      await loadAll({ silent: true })
    } catch (err) {
      toast(err.message || t('admin.errorGeneric'), 'error')
    } finally {
      setTogglingId(null)
    }
  }

  const handleUnlockVault = async (e) => {
    e.preventDefault()
    const token = licenseToken.trim()
    if (!token) return
    setVerifyingToken(true)
    setTokenError('')
    try {
      const res = await adminApi.consultarBoveda(idAdmin, token)
      if (res.boveda_exploratoria?.length) {
        setBovedaExp(res.boveda_exploratoria)
        setTotalExpCount(res.boveda_exploratoria.length)
      }
      if (res.boveda_especifica?.length) {
        setBovedaEsp(res.boveda_especifica)
        setTotalEspCount(res.boveda_especifica.length)
      }
      setVaultUnlocked(true)
      toast(t('admin.vaultUnlockedToast'))
    } catch (err) {
      setTokenError(err.message || t('admin.vaultInvalidToken'))
    } finally {
      setVerifyingToken(false)
    }
  }

  const closeCreateModal = useCallback(() => setCreateOpen(false), [])
  const closeEditModal = useCallback(() => setEditUser(null), [])
  const closeCreditsModal = useCallback(() => setCreditsUser(null), [])

  if (loading) {
    return (
      <div className="card flex flex-col items-center justify-center gap-3 py-20 text-center">
        <Loader2 className="h-8 w-8 animate-spin text-electric" />
        <p className="text-sm font-semibold text-ink">{t('admin.loading')}</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="card flex flex-col items-center justify-center gap-4 px-6 py-16 text-center">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-red-500/10 text-red-500">
          <AlertTriangle className="h-6 w-6" />
        </span>
        <div>
          <p className="text-base font-bold text-ink">{t('admin.errorTitle')}</p>
          <p className="mt-1 max-w-md text-xs text-muted">{error}</p>
        </div>
        <button type="button" onClick={() => loadAll({ silent: false })} className="btn btn-accent btn-sm">
          <RefreshCw className="h-4 w-4" />
          {t('dash.retry')}
        </button>
      </div>
    )
  }

  const tabs = [
    { id: 'usuarios', label: t('admin.tabUsers'), count: usuarios.length, icon: Users },
    { id: 'leads', label: t('admin.tabLeads'), count: leads.length, icon: Inbox },
    ...(hasSuperAdminAccess
      ? [
          {
            id: 'boveda_exploratoria',
            label: t('admin.tabVaultExp'),
            count: totalExpCount || bovedaExp.length,
            icon: Compass,
            locked: !vaultUnlocked,
          },
          {
            id: 'boveda_especifica',
            label: t('admin.tabVaultEsp'),
            count: totalEspCount || bovedaEsp.length,
            icon: Target,
            locked: !vaultUnlocked,
          },
        ]
      : []),
  ]

  const isVaultTab = tab === 'boveda_exploratoria' || tab === 'boveda_especifica'

  return (
    <section className="space-y-6 animate-pop">
      {/* 4 Tarjetas superiores con métricas reales */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          tone="navy"
          icon={Users}
          label={t('admin.statClients')}
          value={totalClients.toLocaleString(locale)}
          hint={t('admin.statClientsHint')}
        />
        <StatCard
          icon={Coins}
          label={t('admin.statCredits')}
          value={activeCredits.toLocaleString(locale)}
          hint={t('admin.statCreditsHint')}
        />
        <StatCard
          icon={Compass}
          label={t('admin.statExploratoryTotal')}
          value={(totalExpCount || bovedaExp.length).toLocaleString(locale)}
          hint={t('admin.statExploratoryTotalHint')}
        />
        <StatCard
          icon={Target}
          label={t('admin.statSpecificTotal')}
          value={(totalEspCount || bovedaEsp.length).toLocaleString(locale)}
          hint={t('admin.statSpecificTotalHint')}
        />
      </div>

      <div className="card overflow-hidden">
        {/* Pestañas + acciones */}
        <div className="flex flex-col gap-3 border-b border-line bg-mist/50 p-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto" role="tablist">
            {tabs.map(({ id, label, count, icon: Icon, locked }) => {
              const on = tab === id
              return (
                <button
                  key={id}
                  id={`admin-tab-${id}`}
                  role="tab"
                  aria-selected={on}
                  type="button"
                  onClick={() => setTab(id)}
                  className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-3.5 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    on ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${on ? 'text-electric' : ''}`} />
                  <span>{label}</span>
                  {locked && <Lock className="h-3 w-3 text-amber-400" />}
                  <span className={`rounded-full px-2 py-0.5 font-mono text-[10px] ${on ? 'bg-electric text-white' : 'bg-line/60 text-muted'}`}>
                    {count.toLocaleString(locale)}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button type="button" onClick={() => loadAll({ silent: true })} disabled={refreshing} className="btn btn-ghost btn-sm">
              <RefreshCw className={`h-3.5 w-3.5 text-electric ${refreshing ? 'animate-spin' : ''}`} />
              {t('dash.refresh')}
            </button>
            <button type="button" id="admin-new-user" onClick={() => setCreateOpen(true)} className="btn btn-accent btn-sm">
              <UserPlus className="h-3.5 w-3.5" />
              {t('admin.newUser')}
            </button>
          </div>
        </div>

        {tab === 'usuarios' && (
          <div>
            {/* Buscador interno de usuarios */}
            <div className="border-b border-line bg-mist/30 px-4 py-3 sm:px-6">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
                <input
                  type="search"
                  value={userQuery}
                  onChange={(e) => setUserQuery(e.target.value)}
                  placeholder={t('admin.searchUsersPh')}
                  className="field h-10 pl-10 pr-9 text-xs"
                />
                {userQuery && (
                  <button
                    type="button"
                    onClick={() => setUserQuery('')}
                    aria-label={t('common.close')}
                    className="absolute right-2.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted hover:text-ink cursor-pointer"
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            </div>

            {!filteredUsers.length ? (
              <p className="px-6 py-12 text-center text-xs text-muted">{t('admin.emptyUsers')}</p>
            ) : (
              <div className="table-scroll">
                <table className="w-full min-w-[820px] border-collapse text-left text-xs">
                  <thead>
                    <tr className="border-b border-line bg-mist text-[10px] font-semibold uppercase tracking-wider text-muted">
                      <th className="px-4 py-3.5">{t('admin.cols.user')}</th>
                      <th className="px-4 py-3.5">{t('admin.cols.company')}</th>
                      <th className="px-4 py-3.5">{t('admin.cols.role')}</th>
                      <th className="px-4 py-3.5">{t('admin.cols.credits')}</th>
                      <th className="px-4 py-3.5">{t('admin.cols.status')}</th>
                      <th className="px-4 py-3.5 text-right">{t('table.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {filteredUsers.map((u, idx) => {
                      const uid = u.id_cliente ?? u.id ?? `u-${idx}`
                      const suspended = isSuspended(u)
                      const role = String(u.rol || 'admin').toLowerCase()
                      const isSuper = isSuperAdminUser(u)
                      const protectedUser = isProtectedAccount(u)
                      const isSelf = String(uid) === String(idAdmin)
                      return (
                        <tr key={uid} className="transition-colors hover:bg-electric-50/40">
                          <td className="px-4 py-3.5 align-middle">
                            <div className="flex items-center gap-2">
                              <p className="font-semibold text-ink">{u.nombre || '—'}</p>
                              {protectedUser && (
                                <span
                                  title={t('admin.protectedAccount')}
                                  className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-bold text-amber-400"
                                >
                                  <ShieldCheck className="h-3 w-3" />
                                  Master
                                </span>
                              )}
                            </div>
                            <p className="font-mono text-[11px] text-muted">{u.email}</p>
                          </td>
                          <td className="px-4 py-3.5 align-middle text-ink-soft">{u.empresa || '—'}</td>
                          <td className="px-4 py-3.5 align-middle">
                            <span
                              className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                isSuper
                                  ? 'border border-amber-500/30 bg-amber-500/10 text-amber-400'
                                  : role === 'admin'
                                    ? 'bg-electric-50 text-electric'
                                    : 'bg-mist text-ink-soft'
                              }`}
                            >
                              {isSuper ? t('admin.roles.superadmin') : role === 'admin' ? t('admin.roles.admin') : t('admin.roles.cliente')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 align-middle font-mono font-bold text-ink">
                            {(Number(u.saldo_creditos) || 0).toLocaleString(locale)}
                          </td>
                          <td className="px-4 py-3.5 align-middle">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold ${
                                suspended
                                  ? 'bg-red-500/10 text-red-500 dark:text-red-300'
                                  : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                              }`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${suspended ? 'bg-red-500' : 'bg-emerald-500'}`} />
                              {suspended ? t('admin.status.suspendido') : t('admin.status.activo')}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-right align-middle">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => setEditUser(u)}
                                className="btn btn-ghost btn-sm h-8 px-2.5 text-[11px]"
                                title={t('admin.editUserBtn')}
                              >
                                <Pencil className="h-3.5 w-3.5 text-electric" />
                                {t('admin.editUserBtn')}
                              </button>
                              <button
                                type="button"
                                onClick={() => setCreditsUser(u)}
                                className="btn btn-ghost btn-sm h-8 px-2.5 text-[11px]"
                              >
                                <Coins className="h-3.5 w-3.5 text-electric" />
                                {t('admin.editCredits')}
                              </button>
                              <button
                                type="button"
                                disabled={isSelf || protectedUser || togglingId === uid}
                                onClick={() => handleToggleEstado(u)}
                                title={
                                  protectedUser
                                    ? t('admin.cannotSuspendSuperadmin')
                                    : isSelf
                                      ? t('admin.cannotSuspendSelf')
                                      : undefined
                                }
                                className={`btn btn-sm h-8 px-2.5 text-[11px] disabled:opacity-35 ${
                                  suspended
                                    ? 'border border-emerald-500/30 bg-emerald-500/10 text-emerald-600 hover:bg-emerald-500/20 dark:text-emerald-300'
                                    : 'border border-red-500/30 bg-red-500/10 text-red-500 hover:bg-red-500/20 dark:text-red-300'
                                }`}
                              >
                                {togglingId === uid ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : suspended ? (
                                  <PlayCircle className="h-3.5 w-3.5" />
                                ) : (
                                  <PauseCircle className="h-3.5 w-3.5" />
                                )}
                                {suspended ? t('admin.activate') : t('admin.suspend')}
                              </button>
                            </div>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {tab === 'leads' && (
          <DataTable
            rows={leads}
            exportPrefix="prospekta_contacto_leads"
            emptyTitle={t('admin.emptyLeads')}
            emptySubtitle={t('admin.emptyLeadsSub')}
          />
        )}

        {isVaultTab && (
          <div>
            {!vaultUnlocked ? (
              <div className="flex flex-col items-center justify-center px-6 py-14 text-center">
                <span className="grid h-14 w-14 place-items-center rounded-2xl border border-amber-500/30 bg-amber-500/10 text-amber-400">
                  <KeyRound className="h-7 w-7" />
                </span>
                <h3 className="mt-4 text-lg font-bold text-ink">{t('admin.vaultLockTitle')}</h3>
                <p className="mt-1 max-w-md text-xs leading-relaxed text-muted">{t('admin.vaultLockSubtitle')}</p>

                <form onSubmit={handleUnlockVault} className="mt-6 w-full max-w-md space-y-3 text-left">
                  <label htmlFor="vault-master-token" className="field-label">
                    {t('admin.vaultTokenLabel')}
                  </label>
                  <div className="relative">
                    <input
                      id="vault-master-token"
                      type={showToken ? 'text' : 'password'}
                      required
                      value={licenseToken}
                      onChange={(e) => setLicenseToken(e.target.value)}
                      placeholder={t('admin.vaultTokenPh')}
                      className="field pr-11 font-mono text-xs"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      className="absolute right-2 top-1/2 grid h-8 w-8 -translate-y-1/2 place-items-center rounded-lg text-muted hover:text-ink cursor-pointer"
                      aria-label={showToken ? t('login.hidePwd') : t('login.showPwd')}
                    >
                      {showToken ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>

                  {tokenError && (
                    <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-3.5 py-2.5 text-xs text-red-500 dark:text-red-300" role="alert">
                      {tokenError}
                    </p>
                  )}

                  <button type="submit" id="vault-unlock-btn" disabled={verifyingToken || !licenseToken.trim()} className="btn btn-accent w-full">
                    {verifyingToken ? <Loader2 className="h-4 w-4 animate-spin" /> : <Unlock className="h-4 w-4" />}
                    {verifyingToken ? t('admin.vaultVerifying') : t('admin.vaultUnlockBtn')}
                  </button>
                </form>
              </div>
            ) : (
              <div>
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-amber-500/5 px-4 py-2.5 text-xs sm:px-6">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-amber-400">
                    <ShieldCheck className="h-4 w-4" />
                    {t('admin.vaultActiveBanner')}
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setVaultUnlocked(false)
                      setLicenseToken('')
                    }}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-muted hover:text-ink cursor-pointer"
                  >
                    <Lock className="h-3.5 w-3.5" />
                    {t('admin.vaultLockBtn')}
                  </button>
                </div>

                {tab === 'boveda_exploratoria' ? (
                  <DataTable
                    key="vault-exp"
                    rows={bovedaExp}
                    exportPrefix="prospekta_boveda_exploratoria"
                    emptyTitle={t('admin.emptyVaultExp')}
                    emptySubtitle={t('admin.emptyVaultSub')}
                  />
                ) : (
                  <DataTable
                    key="vault-esp"
                    rows={bovedaEsp}
                    exportPrefix="prospekta_boveda_especifica"
                    emptyTitle={t('admin.emptyVaultEsp')}
                    emptySubtitle={t('admin.emptyVaultSub')}
                  />
                )}
              </div>
            )}
          </div>
        )}
      </div>

      <CreateUserModal
        open={createOpen}
        onClose={closeCreateModal}
        onCreate={handleCreateUser}
        canAssignSuperAdmin={hasSuperAdminAccess}
      />
      <EditUserModal
        user={editUser}
        onClose={closeEditModal}
        onSave={handleEditUser}
        canAssignSuperAdmin={hasSuperAdminAccess}
        isTargetProtected={isProtectedAccount(editUser)}
      />
      <CreditsModal user={creditsUser} onClose={closeCreditsModal} onSave={handleUpdateCredits} />
    </section>
  )
}
