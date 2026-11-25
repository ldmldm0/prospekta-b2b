import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import {
  ArrowRight,
  Check,
  CheckCircle2,
  Code2,
  Coins,
  Compass,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Layers,
  Loader2,
  Send,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Target,
} from 'lucide-react'
import Modal from '../components/ui/Modal'
import { BRAND } from '../config/brand'
import { PACKAGES } from '../config/packages'
import { useAuth } from './AuthContext'
import { usePreferences } from './PreferencesContext'
import { leadsApi } from '../services/api'

const PublicModalContext = createContext(null)

const STEP_ICONS = [Filter, Sparkles, Download]
const MODE_ICONS = [Compass, Target]
const POLICY_ICONS = [Coins, ShieldCheck, SlidersHorizontal]
const EMPTY_FORM = { nombre: '', empresa: '', email: '', telefono: '', plan: '', mensaje: '' }
const FREE_DOMAINS = /@(gmail|hotmail|outlook|yahoo|live|icloud)\./i

export function PublicModalProvider({ children }) {
  const { t, lang, locale } = usePreferences()
  const { usuario } = useAuth()
  // null | 'how' | 'packages' | 'access' | 'credits' | 'terms'
  const [activeModal, setActiveModal] = useState(null)
  const [form, setForm] = useState(EMPTY_FORM)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')
  const firstInputRef = useRef(null)
  const submittingRef = useRef(false)

  const closeModal = useCallback(() => {
    if (status === 'sending' || submittingRef.current) return
    setActiveModal(null)
  }, [status])

  const prefillFromSession = useCallback(
    (planId = '') => {
      setForm((prev) => ({
        ...prev,
        nombre: prev.nombre || usuario?.nombre || '',
        empresa: prev.empresa || usuario?.empresa || '',
        email: prev.email || usuario?.email || usuario?.id_cliente || '',
        ...(typeof planId === 'string' && planId ? { plan: planId } : {}),
      }))
    },
    [usuario],
  )

  const openHowItWorks = useCallback(() => setActiveModal('how'), [])
  const openPackages = useCallback(() => {
    prefillFromSession()
    setActiveModal('packages')
  }, [prefillFromSession])
  const openCreditPolicy = useCallback(() => setActiveModal('credits'), [])
  const openTerms = useCallback(() => setActiveModal('terms'), [])

  const openRequestAccess = useCallback(
    (planId = '') => {
      prefillFromSession(planId)
      setStatus((s) => (s === 'sent' ? 'idle' : s))
      setError('')
      setActiveModal('access')
    },
    [prefillFromSession],
  )

  useEffect(() => {
    if (activeModal === 'access' && status !== 'sent') {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus({ preventScroll: true })
      }, 80)
      return () => clearTimeout(timer)
    }
  }, [activeModal, status])

  const planOptions = useMemo(
    () => [
      ...PACKAGES.map((p) => ({
        value: p.id,
        label: `${p[lang].name} · ${p.prefix || ''}${p.credits.toLocaleString(locale)} ${p[lang].unit}`,
      })),
      { value: 'personalizado', label: t('contact.planCustom') },
      { value: 'no-se', label: t('contact.planUnsure') },
    ],
    [lang, locale, t],
  )

  const setField = (k) => (e) => {
    const val = e.target.value
    setForm((prev) => ({ ...prev, [k]: val }))
  }

  const freeEmail = FREE_DOMAINS.test(form.email)

  const submitAccessForm = async (e) => {
    e.preventDefault()
    if (submittingRef.current || status === 'sending') return
    submittingRef.current = true
    setStatus('sending')
    setError('')
    try {
      const pkg = PACKAGES.find((p) => p.id === form.plan)
      const paquete_interes = pkg
        ? `${pkg.es.name} · ${pkg.prefix || ''}${pkg.credits.toLocaleString('es-CO')} ${pkg.es.unit}`
        : form.plan === 'personalizado'
          ? 'Volumen personalizado (+2.000 contactos)'
          : 'Aún no estoy seguro — necesito asesoría'

      await leadsApi.submitContact({
        nombre: form.nombre.trim(),
        empresa: form.empresa.trim(),
        email: form.email.trim(),
        telefono: form.telefono.trim(),
        paquete_interes,
        mensaje: form.mensaje.trim(),
      })
      setStatus('sent')
    } catch (err) {
      setError(err.message || t('contact.error'))
      setStatus('error')
    } finally {
      submittingRef.current = false
    }
  }

  const value = useMemo(
    () => ({
      activeModal,
      closeModal,
      openHowItWorks,
      openPackages,
      openRequestAccess,
      openCreditPolicy,
      openTerms,
    }),
    [activeModal, closeModal, openHowItWorks, openPackages, openRequestAccess, openCreditPolicy, openTerms],
  )

  const steps = t('how.steps') || []
  const modes = t('how.modes') || []
  const policyItems = t('footer.creditPolicyItems') || []
  const termsItems = t('footer.termsItems') || []

  return (
    <PublicModalContext.Provider value={value}>
      {children}

      {/* 1. MODAL: CÓMO FUNCIONA */}
      <Modal open={activeModal === 'how'} onClose={closeModal} labelledBy="how-modal-title" maxWidth="max-w-3xl">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 pr-8">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-electric-50 text-electric">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-electric">{t('how.eyebrow')}</p>
              <h3 id="how-modal-title" className="mt-0.5 text-lg font-extrabold text-ink sm:text-xl">
                {t('how.title')}
              </h3>
            </div>
          </div>

          <p className="mt-3 text-xs leading-relaxed text-muted sm:text-sm">{t('how.subtitle')}</p>

          <ol className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            {Array.isArray(steps) &&
              steps.map(({ title, text, tags }, i) => {
                const Icon = STEP_ICONS[i] || Sparkles
                return (
                  <li key={title} className="flex flex-col rounded-2xl border border-line bg-mist/50 p-5">
                    <div className="flex items-center justify-between">
                      <span className="grid h-10 w-10 place-items-center rounded-xl bg-electric-50 text-electric">
                        <Icon className="h-5 w-5" />
                      </span>
                      <span className="font-display text-2xl font-extrabold text-electric/70">
                        {String(i + 1).padStart(2, '0')}
                      </span>
                    </div>
                    <h4 className="mt-4 text-sm font-bold leading-snug text-ink">{title}</h4>
                    <p className="mt-2 flex-1 text-xs leading-relaxed text-muted">{text}</p>
                    <div className="mt-4 flex flex-wrap gap-1">
                      {Array.isArray(tags) &&
                        tags.map((tag) => (
                          <span key={tag} className="chip font-mono text-[10px]">
                            {tag}
                          </span>
                        ))}
                    </div>
                  </li>
                )
              })}
          </ol>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.isArray(modes) &&
              modes.map(({ title, text }, i) => {
                const Icon = MODE_ICONS[i] || Compass
                return (
                  <div key={title} className="flex items-start gap-3.5 rounded-2xl border border-line bg-mist/30 p-4">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-electric text-white">
                      <Icon className="h-4.5 w-4.5" />
                    </span>
                    <div className="min-w-0 text-xs leading-relaxed">
                      <p className="font-bold text-ink">{title}</p>
                      <p className="mt-0.5 text-muted">{text}</p>
                    </div>
                  </div>
                )
              })}
          </div>

          <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 border-t border-line pt-5 sm:flex-row">
            <button type="button" onClick={closeModal} className="btn btn-ghost btn-sm w-full sm:w-auto">
              {t('common.close')}
            </button>
            <button
              type="button"
              id="how-modal-cta"
              onClick={() => openRequestAccess()}
              className="btn btn-accent btn-sm w-full px-6 sm:w-auto"
            >
              {t('hero.ctaAccess')}
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      </Modal>

      {/* 2. MODAL: PAQUETES DE CRÉDITOS */}
      <Modal open={activeModal === 'packages'} onClose={closeModal} labelledBy="packages-modal-title" maxWidth="max-w-4xl">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 pr-8">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-electric-50 text-electric">
              <Layers className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-electric">{t('packages.eyebrow')}</p>
              <h3 id="packages-modal-title" className="mt-0.5 text-lg font-extrabold text-ink sm:text-xl">
                {t('packages.title')}
              </h3>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted sm:text-sm">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-electric/30 bg-electric-50 px-3 py-1 text-xs font-semibold text-electric">
              <Coins className="h-3.5 w-3.5" />
              {t('packages.creditRule')}
            </span>
            <span>{t('packages.subtitle')}</span>
          </div>

          <div className="mt-6 grid grid-cols-1 items-stretch gap-4 md:grid-cols-3">
            {PACKAGES.map((p) => {
              const c = p[lang]
              const f = p.featured
              return (
                <article
                  key={p.id}
                  className={`relative flex flex-col rounded-2xl border p-5 transition ${
                    f ? 'surface-navy border-electric/40 text-white shadow-lift' : 'border-line bg-mist/50 text-ink'
                  }`}
                >
                  {f && (
                    <span className="mb-3 inline-flex self-start rounded-full bg-electric px-2.5 py-0.5 text-[10px] font-semibold text-white">
                      {c.badge || t('packages.recommended')}
                    </span>
                  )}
                  <h4 className={`text-base font-bold ${f ? 'text-white' : 'text-ink'}`}>{c.name}</h4>
                  <p className={`mt-1 text-xs leading-relaxed ${f ? 'text-blue-100/80' : 'text-muted'}`}>{c.description}</p>

                  <div className="mt-5 flex flex-wrap items-baseline gap-x-1.5">
                    <span className={`font-display text-3xl font-extrabold tracking-tight ${f ? 'text-white' : 'text-ink'}`}>
                      {p.prefix}
                      {p.credits.toLocaleString(locale)}
                    </span>
                    <span className={`text-xs font-semibold ${f ? 'text-white' : 'text-ink'}`}>{c.unit}</span>
                  </div>
                  <p className={`mt-0.5 text-[11px] ${f ? 'text-blue-100/80' : 'text-muted'}`}>{c.creditSub}</p>

                  <ul className={`mt-5 flex-1 space-y-2 border-t pt-4 text-xs ${f ? 'border-white/15' : 'border-line'}`}>
                    {c.features.map((feat) => (
                      <li key={feat} className="flex items-start gap-2">
                        <span
                          className={`mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full ${
                            f ? 'bg-electric text-white' : 'bg-electric-50 text-electric'
                          }`}
                        >
                          <Check className="h-2.5 w-2.5" strokeWidth={3} />
                        </span>
                        <span className={f ? 'text-blue-50' : 'text-ink-soft'}>{feat}</span>
                      </li>
                    ))}
                  </ul>

                  <button
                    type="button"
                    id={`modal-plan-cta-${p.id}`}
                    onClick={() => openRequestAccess(p.id)}
                    className={`btn btn-sm mt-6 w-full ${f ? 'btn-accent' : 'btn-primary'}`}
                  >
                    {t('packages.cta')}
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </article>
              )
            })}
          </div>

          <div className="mt-6 flex flex-col-reverse items-center justify-between gap-3 border-t border-line pt-5 text-xs sm:flex-row">
            <p className="text-muted">
              {t('packages.customPre')}{' '}
              <button
                type="button"
                onClick={() => openRequestAccess('personalizado')}
                className="font-semibold text-electric hover:underline cursor-pointer"
              >
                {t('packages.customLink')}
              </button>
            </p>
            <button type="button" onClick={closeModal} className="btn btn-ghost btn-sm">
              {t('common.close')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 3. MODAL: SOLICITAR ACCESO / COTIZACIÓN */}
      <Modal open={activeModal === 'access'} onClose={closeModal} labelledBy="access-modal-title" maxWidth="max-w-xl">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 pr-8">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-electric-50 text-electric">
              <Send className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-electric">{t('contact.eyebrow')}</p>
              <h3 id="access-modal-title" className="mt-0.5 text-lg font-extrabold text-ink sm:text-xl">
                {t('contact.title')}
              </h3>
            </div>
          </div>

          {status === 'sent' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center animate-pop" role="status">
              <span className="grid h-14 w-14 place-items-center rounded-full bg-electric-50 text-electric">
                <CheckCircle2 className="h-7 w-7" />
              </span>
              <h4 className="mt-5 text-xl font-bold text-ink">
                {t('contact.sentTitle', { name: form.nombre.split(' ')[0] || t('contact.sentThanks') })}
              </h4>
              <p className="mt-2 max-w-md text-xs leading-relaxed text-muted sm:text-sm">
                {t('contact.sentText', { email: form.email })}
                {form.telefono && t('contact.sentPhone', { phone: form.telefono })}
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setForm(EMPTY_FORM)
                    setStatus('idle')
                  }}
                  className="btn btn-ghost btn-sm"
                >
                  {t('contact.sendAnother')}
                </button>
                <button type="button" onClick={closeModal} className="btn btn-accent btn-sm px-5">
                  {t('common.close')}
                </button>
              </div>
            </div>
          ) : (
            <>
              <p className="mt-3 text-xs leading-relaxed text-muted sm:text-sm">{t('contact.subtitle')}</p>

              <form onSubmit={submitAccessForm} className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="m-nombre">
                    {t('contact.name')}
                  </label>
                  <input
                    ref={firstInputRef}
                    id="m-nombre"
                    className="field"
                    required
                    autoComplete="name"
                    value={form.nombre}
                    onChange={setField('nombre')}
                    placeholder={t('contact.namePh')}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="m-empresa">
                    {t('contact.company')}
                  </label>
                  <input
                    id="m-empresa"
                    className="field"
                    required
                    autoComplete="organization"
                    value={form.empresa}
                    onChange={setField('empresa')}
                    placeholder={t('contact.companyPh')}
                  />
                </div>
                <div>
                  <label className="field-label" htmlFor="m-email">
                    {t('contact.email')}
                  </label>
                  <input
                    id="m-email"
                    type="email"
                    className="field"
                    required
                    autoComplete="email"
                    value={form.email}
                    onChange={setField('email')}
                    placeholder={t('contact.emailPh')}
                  />
                  {freeEmail && <p className="mt-1 text-[11px] text-electric">{t('contact.freeEmail')}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="m-tel">
                    {t('contact.phone')}
                  </label>
                  <input
                    id="m-tel"
                    type="tel"
                    className="field"
                    required
                    autoComplete="tel"
                    value={form.telefono}
                    onChange={setField('telefono')}
                    placeholder={t('contact.phonePh')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="m-plan">
                    {t('contact.plan')}
                  </label>
                  <select id="m-plan" className="field cursor-pointer" required value={form.plan} onChange={setField('plan')}>
                    <option value="" disabled>
                      {t('contact.planPh')}
                    </option>
                    {planOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="m-msg">
                    {t('contact.message')}
                  </label>
                  <textarea
                    id="m-msg"
                    rows={3}
                    className="field resize-none"
                    value={form.mensaje}
                    onChange={setField('mensaje')}
                    placeholder={t('contact.messagePh')}
                  />
                </div>

                {status === 'error' && (
                  <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-500 dark:text-red-300 sm:col-span-2" role="alert">
                    {error}
                  </p>
                )}

                <div className="mt-1 flex flex-col-reverse items-start gap-3 border-t border-line pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-[11px] text-muted">{t('contact.privacy')}</p>
                  <div className="flex w-full items-center justify-end gap-2 sm:w-auto">
                    <button type="button" onClick={closeModal} disabled={status === 'sending'} className="btn btn-ghost btn-sm">
                      {t('common.cancel')}
                    </button>
                    <button type="submit" id="modal-contact-submit" disabled={status === 'sending'} className="btn btn-accent btn-sm px-5">
                      {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                      {status === 'sending' ? t('contact.sending') : t('contact.submit')}
                    </button>
                  </div>
                </div>
              </form>
            </>
          )}
        </div>
      </Modal>

      {/* 4. MODAL: POLÍTICA DE CRÉDITOS */}
      <Modal open={activeModal === 'credits'} onClose={closeModal} labelledBy="credit-policy-modal-title" maxWidth="max-w-lg">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 pr-8">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-electric-50 text-electric">
              <ShieldCheck className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-electric">{t('footer.creditPolicyBadge')}</p>
              <h3 id="credit-policy-modal-title" className="mt-0.5 text-lg font-bold text-ink sm:text-xl">
                {t('footer.creditPolicyTitle')}
              </h3>
            </div>
          </div>

          <p className="mt-4 text-xs leading-relaxed text-muted sm:text-sm">{t('footer.creditPolicyIntro')}</p>

          <ul className="mt-5 space-y-3.5">
            {Array.isArray(policyItems) &&
              policyItems.map((item, idx) => {
                const Icon = POLICY_ICONS[idx] || CheckCircle2
                return (
                  <li key={item.title} className="flex items-start gap-3.5 rounded-2xl border border-line bg-mist/50 p-4">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-electric-50 text-electric">
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 text-xs leading-relaxed sm:text-sm">
                      <p className="font-bold text-ink">{item.title}</p>
                      <p className="mt-1 text-muted">{item.text}</p>
                    </div>
                  </li>
                )
              })}
          </ul>

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={closeModal} className="btn btn-accent btn-sm px-5">
              {t('footer.modalUnderstand')}
            </button>
          </div>
        </div>
      </Modal>

      {/* 5. MODAL: TÉRMINOS DEL SERVICIO (incluye apartado técnico sutil de Arquitectura y Desarrollo Tecnológico) */}
      <Modal open={activeModal === 'terms'} onClose={closeModal} labelledBy="terms-modal-title" maxWidth="max-w-lg">
        <div className="p-6 sm:p-8">
          <div className="flex items-center gap-3 pr-8">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-electric-50 text-electric">
              <FileText className="h-5 w-5" />
            </span>
            <div>
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.18em] text-electric">{t('footer.colLegal')}</p>
              <h3 id="terms-modal-title" className="mt-0.5 text-lg font-bold text-ink sm:text-xl">
                {t('footer.termsTitle')}
              </h3>
            </div>
          </div>

          <ul className="mt-5 space-y-3">
            {Array.isArray(termsItems) &&
              termsItems.map((item) => (
                <li key={item.title} className="rounded-2xl border border-line bg-mist/50 p-4 text-xs leading-relaxed sm:text-sm">
                  <p className="font-bold text-ink">{item.title}</p>
                  <p className="mt-1 text-muted">{item.text}</p>
                </li>
              ))}
          </ul>

          {/* Apartado técnico sutil: Arquitectura y Desarrollo Tecnológico */}
          <div className="mt-4 flex items-start gap-3 rounded-2xl border border-line/70 bg-mist/30 p-3.5 text-[11px] leading-relaxed text-muted">
            <span className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-electric-50 text-electric">
              <Code2 className="h-3.5 w-3.5" />
            </span>
            <div className="min-w-0">
              <p className="font-semibold text-ink-soft">{t('footer.techArchTitle')}</p>
              <p className="mt-0.5">
                {t('footer.techArchPrefix')}{' '}
                <a
                  href={BRAND.developerUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 font-semibold text-ink transition-colors hover:text-electric"
                >
                  {BRAND.developer}
                  <ExternalLink className="h-2.5 w-2.5 text-electric" />
                </a>
                .
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end">
            <button type="button" onClick={closeModal} className="btn btn-accent btn-sm px-5">
              {t('common.close')}
            </button>
          </div>
        </div>
      </Modal>
    </PublicModalContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export function usePublicModals() {
  const ctx = useContext(PublicModalContext)
  if (!ctx) throw new Error('usePublicModals debe usarse dentro de <PublicModalProvider>')
  return ctx
}
