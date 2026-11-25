import { useEffect, useRef, useState } from 'react'
import { Activity, AlertTriangle, Bell, CheckCircle2, Coins, LayoutDashboard, LogOut, Menu, PlusCircle, RefreshCw, Search, ShieldCheck, X } from 'lucide-react'
import Logo from '../brand/Logo'
import { LanguageToggle, MobilePreferences, ThemeToggle } from '../ui/PreferenceToggles'
import { useActivity } from '../../context/ActivityContext'
import { useAuth } from '../../context/AuthContext'
import { usePreferences } from '../../context/PreferencesContext'
import { usePublicModals } from '../../context/PublicModalContext'
import { useRouter } from '../../router'


/**
 * Barra superior privada: logo oficial, navegación entre Buscador (/dashboard) y Panel (/admin),
 * saldo de créditos real, botón de Actividad en Vivo, "Recargar Créditos", idioma, tema y Cerrar Sesión.
 */
export default function PrivateTopbar({ sections = [], active, onChange }) {
  const activity = useActivity()
  const { usuario, isAdmin, isSuperAdmin, logout } = useAuth()
  const { t, locale } = usePreferences()
  const { openRequestAccess } = usePublicModals()
  const { path, navigate } = useRouter()
  const [open, setOpen] = useState(false)
  const [activityOpen, setActivityOpen] = useState(false)
  const activityRef = useRef(null)

  useEffect(() => {
    if (!activityOpen) return undefined
    const onPointerDown = (e) => {
      if (activityRef.current && !activityRef.current.contains(e.target)) {
        setActivityOpen(false)
      }
    }
    const onKeyDown = (e) => {
      if (e.key === 'Escape') setActivityOpen(false)
    }
    document.addEventListener('mousedown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('mousedown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [activityOpen])

  const displayName = usuario?.nombre || usuario?.email || ''
  const initials = displayName
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase()

  const handleLogout = () => {
    setOpen(false)
    logout()
    navigate('/login', { replace: true })
  }

  const handleTopupCredits = () => {
    setOpen(false)
    openRequestAccess()
  }

  return (
    <header className="sticky top-0 z-40 border-b border-line bg-page/90 backdrop-blur-xl">
      <div className="container-page flex h-[76px] items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-4 sm:gap-6">
          <Logo size="sm" />

          {isAdmin && (
            <nav className="hidden items-center gap-1 rounded-xl bg-mist p-1 md:flex" aria-label="Vistas">
              <button
                type="button"
                onClick={() => navigate('/admin')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  path === '/admin' ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                <LayoutDashboard className={`h-3.5 w-3.5 ${path === '/admin' ? 'text-electric' : ''}`} />
                {t('dash.adminEyebrow')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition cursor-pointer ${
                  path === '/dashboard' ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
                }`}
              >
                <Search className={`h-3.5 w-3.5 ${path === '/dashboard' ? 'text-electric' : ''}`} />
                {t('dash.navSearch')}
              </button>
            </nav>
          )}

          {sections.length > 1 && (
            <nav className="hidden items-center gap-1 rounded-xl bg-mist p-1 lg:flex" aria-label="Secciones">
              {sections.map(({ id, labelKey, icon: Icon }) => (
                <button
                  key={id}
                  id={`section-${id}`}
                  type="button"
                  onClick={() => onChange(id)}
                  className={`inline-flex items-center gap-2 rounded-lg px-3.5 py-2 text-xs font-semibold transition cursor-pointer ${
                    active === id ? 'bg-surface text-ink shadow-card' : 'text-muted hover:text-ink'
                  }`}
                >
                  <Icon className={`h-4 w-4 ${active === id ? 'text-electric' : ''}`} />
                  {t(labelKey)}
                </button>
              ))}
            </nav>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isSuperAdmin && (
            <span className="hidden h-10 items-center gap-1.5 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 text-xs font-bold text-amber-400 sm:inline-flex">
              <ShieldCheck className="h-4 w-4 text-amber-400" />
              <span>Superadmin</span>
            </span>
          )}
          {(() => {
            const displayCredits = Number(usuario?.saldo_creditos ?? 0)
            const reservedMeta = activity?.isProcessing ? activity?.reservationMeta : null
            return (
              <div className="flex flex-col items-end">
                <span
                  className="inline-flex h-10 items-center gap-2 rounded-xl bg-navy px-3 text-white dark:bg-electric-50 dark:text-ink"
                  id="credits-balance"
                  title={
                    reservedMeta
                      ? `Reservando hasta ${reservedMeta} créditos — solo se descuentan los entregados al finalizar`
                      : t('dash.creditsTitle')
                  }
                >
                  <Coins className="h-4 w-4 text-electric" />
                  <span className="font-display text-sm font-bold">{displayCredits.toLocaleString(locale)}</span>
                  <span className="hidden text-[11px] opacity-75 sm:inline">{t('common.credits')}</span>
                </span>
                {reservedMeta > 0 && (
                  <span
                    id="topbar-credits-reservation"
                    className="mt-0.5 hidden text-[10px] font-medium text-amber-600 dark:text-amber-400 xl:inline"
                  >
                    Reservando hasta {reservedMeta} créditos — solo se descuentan los entregados al finalizar
                  </span>
                )}
              </div>
            )
          })()}

          {/* Indicador compacto en barra superior cuando hay búsqueda activa */}
          {activity?.hasRunning && (
            <span
              id="topbar-live-status"
              className="hidden items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-xs font-semibold text-emerald-600 dark:text-emerald-300 md:inline-flex"
            >
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-emerald-500" />
              <span>Búsqueda en curso · Verificando prospectos...</span>
            </span>
          )}

          {/* Botón desplegable de Actividad / Estado en Vivo */}
          <div className="relative" ref={activityRef}>
            {(() => {
              const latestError = !activity?.hasRunning
                ? activity?.errorMessage || activity?.activities?.find((a) => a.status === 'error')
                : null
              const hasError = Boolean(latestError)
              return (
                <button
                  type="button"
                  id="live-activity-btn"
                  onClick={() => setActivityOpen((v) => !v)}
                  aria-expanded={activityOpen}
                  aria-label="Actividad en vivo"
                  title="Actividad / Estado en Vivo"
                  className={`relative grid h-10 w-10 place-items-center rounded-xl border bg-surface text-ink transition hover:border-electric/50 hover:bg-mist cursor-pointer ${
                    hasError ? 'border-red-500/40' : 'border-line'
                  }`}
                >
                  <Bell
                    className={`h-4 w-4 ${
                      activity?.hasRunning ? 'text-emerald-500' : hasError ? 'text-red-500' : 'text-muted'
                    }`}
                  />
                  <span className="absolute right-2 top-2 flex h-2.5 w-2.5">
                    {activity?.hasRunning && (
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-80" />
                    )}
                    <span
                      className={`relative inline-flex h-2.5 w-2.5 rounded-full ${
                        activity?.hasRunning
                          ? 'bg-emerald-500'
                          : hasError
                            ? 'bg-red-500'
                            : 'bg-muted/40'
                      }`}
                    />
                  </span>
                </button>
              )
            })()}

            {activityOpen && (
              <div
                id="live-activity-popover"
                className="fixed right-4 top-[82px] z-50 w-[min(92vw,360px)] rounded-2xl border border-line bg-surface p-4 shadow-2xl sm:absolute sm:right-0 sm:top-12 animate-pop"
              >
                <div className="flex items-center justify-between border-b border-line pb-2.5">
                  <div className="flex items-center gap-2">
                    <Activity
                      className={`h-4 w-4 ${
                        activity?.hasRunning
                          ? 'text-emerald-500'
                          : activity?.errorMessage || activity?.activities?.[0]?.status === 'error'
                            ? 'text-red-500'
                            : 'text-electric'
                      }`}
                    />
                    <span className="text-xs font-bold text-ink">Actividad en Vivo</span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                      activity?.hasRunning
                        ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-300'
                        : activity?.errorMessage || activity?.activities?.[0]?.status === 'error'
                          ? 'bg-red-500/10 text-red-500 dark:text-red-300'
                          : 'bg-mist text-muted'
                    }`}
                  >
                    {activity?.hasRunning
                      ? 'En curso'
                      : activity?.errorMessage || activity?.activities?.[0]?.status === 'error'
                        ? 'Error en ejecución'
                        : activity?.completionMessage || activity?.activities?.some((a) => a.status === 'completed')
                          ? 'Búsqueda finalizada'
                          : 'Inactivo'}
                  </span>
                </div>

                <div className="mt-3 space-y-2.5">
                  {activity?.activeActivities?.length > 0 || activity?.isProcessing ? (
                    (activity?.activeActivities?.length
                      ? activity.activeActivities
                      : [
                          {
                            id: 'live-processing',
                            type: 'exploratoria',
                            registrosNuevos: 0,
                            metaSolicitada: activity?.reservationMeta ?? null,
                          },
                        ]
                    ).map((item) => {
                      const isExp = item.type === 'exploratoria'
                      const rawNuevos = item.registrosNuevos ?? 0
                      const meta = item.metaSolicitada
                      const nuevos = meta > 0 ? Math.min(rawNuevos, meta) : rawNuevos
                      const progressPct = meta > 0 ? Math.min(100, Math.round((nuevos / meta) * 100)) : null
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-emerald-500/25 bg-emerald-500/5 p-3"
                        >
                          <div className="flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 animate-pulse rounded-full bg-emerald-500" />
                            <p className="text-xs font-bold text-ink">
                              Búsqueda en curso · Verificando prospectos...
                            </p>
                          </div>
                          {(meta > 0 || nuevos > 0) && (
                            <div className="mt-2 pl-4">
                              <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-300">
                                {meta > 0
                                  ? `${nuevos} de ${meta} encontrados · Procesando...`
                                  : `${nuevos} encontrados · Procesando...`}
                              </p>
                              {progressPct !== null && (
                                <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-emerald-500/15">
                                  <div
                                    className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                                    style={{ width: `${progressPct}%` }}
                                  />
                                </div>
                              )}
                              {isExp && meta > 0 && (
                                <p className="mt-1.5 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                                  Reservando hasta {meta} créditos — solo se descuentan los entregados al finalizar
                                </p>
                              )}
                            </div>
                          )}
                          <p className="mt-1 pl-4 text-[11px] leading-relaxed text-muted">
                            {isExp
                              ? 'Procesando y verificando contactos. Se actualizará automáticamente al finalizar.'
                              : 'Analizando empresas cargadas. Se actualizará automáticamente al finalizar.'}
                          </p>
                        </div>
                      )
                    })
                  ) : (
                    <div className="rounded-xl border border-line bg-mist/40 p-3 text-center">
                      <p className="text-xs font-semibold text-ink">
                        {activity?.errorMessage ||
                          activity?.completionMessage ||
                          (activity?.activities?.some((a) => a.status === 'completed')
                            ? 'Búsqueda finalizada'
                            : 'Sin procesos en ejecución')}
                      </p>
                      <button
                        type="button"
                        id="activity-refresh-now"
                        onClick={() => activity?.triggerRefresh?.()}
                        disabled={activity?.manualRefreshing}
                        className="btn btn-ghost btn-sm mt-2.5 h-8 w-full justify-center text-xs"
                      >
                        <RefreshCw className={`h-3.5 w-3.5 text-electric ${activity?.manualRefreshing ? 'animate-spin' : ''}`} />
                        Actualizar datos ahora
                      </button>
                    </div>
                  )}

                  {(activity?.errorMessage || activity?.activities?.some((a) => a.status === 'error')) && (
                    <div className="space-y-2">
                      {(activity?.activities?.some((a) => a.status === 'error')
                        ? activity.activities.filter((a) => a.status === 'error').slice(0, 2)
                        : [{ id: 'db-error-state', type: 'exploratoria', errorMessage: activity.errorMessage }]
                      ).map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-red-500/30 bg-red-500/10 p-3"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="flex items-center gap-1.5 text-xs font-bold text-red-500 dark:text-red-300">
                              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
                              {item.type === 'exploratoria' ? 'Búsqueda Exploratoria' : 'Búsqueda Específica'}
                            </span>
                            <span className="rounded-full bg-red-500/20 px-2 py-0.5 text-[10px] font-semibold text-red-500 dark:text-red-200">
                              Error en ejecución
                            </span>
                          </div>
                          <p className="mt-1.5 text-[11px] leading-relaxed text-ink">
                            {item.errorMessage || 'Hubo un problema temporal con la búsqueda. Tus créditos no fueron descontados.'}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}

                  {activity?.activities?.some((a) => a.status === 'completed') && (
                    <div className="border-t border-line pt-2.5">
                      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted">Recientes en esta sesión</p>
                      <div className="space-y-1.5">
                        {activity.activities
                          .filter((a) => a.status === 'completed')
                          .slice(0, 3)
                          .map((item) => (
                            <div key={item.id} className="flex flex-col gap-1 rounded-lg bg-mist/40 px-2.5 py-1.5 text-[11px]">
                              <div className="flex items-center justify-between gap-2">
                                <span className="flex items-center gap-1.5 font-semibold text-ink">
                                  <CheckCircle2 className="h-3.5 w-3.5 shrink-0 text-emerald-500" />
                                  {item.type === 'exploratoria' ? 'Búsqueda Exploratoria' : 'Búsqueda Específica'}
                                </span>
                                <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-300">
                                  Finalizada
                                </span>
                              </div>
                              {(item.completionMessage || activity?.completionMessage) && (
                                <p className="pl-5 text-[10px] leading-relaxed text-muted">
                                  {item.completionMessage || activity?.completionMessage}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            id="topup-credits-btn"
            onClick={handleTopupCredits}
            className="btn btn-accent btn-sm h-10 px-3 text-xs"
          >
            <PlusCircle className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('dash.topupCredits')}</span>
          </button>

          <div className="hidden items-center gap-2 lg:flex">
            <LanguageToggle />
            <ThemeToggle />
            <div className="flex items-center gap-2.5 border-l border-line pl-3">
              <span className="grid h-9 w-9 place-items-center rounded-full bg-electric-50 text-xs font-bold text-electric">{initials || 'P'}</span>
              <div className="hidden leading-tight xl:block">
                <p className="text-sm font-semibold text-ink">{displayName}</p>
                {usuario?.empresa && <p className="text-[11px] text-muted">{usuario.empresa}</p>}
              </div>
            </div>
            <button type="button" id="logout-btn" onClick={handleLogout} className="btn btn-ghost btn-sm h-10">
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          </div>
          <button
            type="button"
            id="dash-mobile-toggle"
            className="icon-btn lg:hidden"
            onClick={() => setOpen((v) => !v)}
            aria-label={open ? t('nav.closeMenu') : t('nav.openMenu')}
            aria-expanded={open}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-line bg-page lg:hidden animate-pop">
          <div className="container-page space-y-4 py-4">
            <div className="flex items-center justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-electric-50 text-sm font-bold text-electric">
                  {initials || 'P'}
                </span>
                <div className="min-w-0 leading-tight">
                  <p className="truncate text-sm font-semibold text-ink">{displayName}</p>
                  {usuario?.empresa && <p className="truncate text-xs text-muted">{usuario.empresa}</p>}
                </div>
              </div>
              <button type="button" onClick={handleTopupCredits} className="btn btn-accent btn-sm shrink-0 text-xs">
                <PlusCircle className="h-3.5 w-3.5" />
                {t('dash.topupCredits')}
              </button>
            </div>

            {isAdmin && (
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate('/admin')
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer ${
                    path === '/admin' ? 'bg-electric-50 text-ink' : 'bg-mist text-muted'
                  }`}
                >
                  <LayoutDashboard className="h-4 w-4 text-electric" />
                  {t('dash.adminEyebrow')}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setOpen(false)
                    navigate('/dashboard')
                  }}
                  className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold cursor-pointer ${
                    path === '/dashboard' ? 'bg-electric-50 text-ink' : 'bg-mist text-muted'
                  }`}
                >
                  <Search className="h-4 w-4 text-electric" />
                  {t('dash.navSearch')}
                </button>
              </div>
            )}

            <MobilePreferences />

            <button type="button" id="logout-btn-mobile" onClick={handleLogout} className="btn btn-ghost w-full">
              <LogOut className="h-4 w-4" />
              {t('nav.logout')}
            </button>
          </div>
        </div>
      )}
    </header>
  )
}
