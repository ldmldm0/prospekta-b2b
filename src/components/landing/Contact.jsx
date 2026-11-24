import { useEffect, useState } from 'react'
import { CheckCircle2, Loader2, Mail, MessageCircle, Send, Clock } from 'lucide-react'
import { PACKAGES } from '../../config/packages'
import { CONTACT_CHANNELS } from '../../config/brand'
import { leadsApi } from '../../services/api'
import { usePreferences } from '../../context/PreferencesContext'

const EMPTY = { nombre: '', empresa: '', email: '', telefono: '', plan: '', mensaje: '' }
const FREE_DOMAINS = /@(gmail|hotmail|outlook|yahoo|live|icloud)\./i

function ChannelsPanel() {
  const { t } = usePreferences()
  const { email, whatsapp, whatsappLabel } = CONTACT_CHANNELS
  const hasChannels = Boolean(email || whatsapp)

  return (
    <aside className="surface-navy relative flex h-full flex-col justify-between overflow-hidden rounded-3xl p-7 text-white sm:p-10">
      <div>
        <p className="font-mono text-[11px] uppercase tracking-[0.18em] text-blue-200">{t('contact.panelEyebrow')}</p>
        <h3 className="mt-3 text-xl font-bold leading-snug text-white sm:text-2xl">{t('contact.panelTitle')}</h3>
        <ul className="mt-8 space-y-4 text-sm text-blue-50">
          {t('contact.panelBullets').map((b) => (
            <li key={b} className="flex items-start gap-3">
              <CheckCircle2 className="mt-0.5 h-4.5 w-4.5 shrink-0 text-electric" />
              {b}
            </li>
          ))}
        </ul>
      </div>

      {/* Contenedor de canales oficiales: se completa desde src/config/brand.js */}
      <div className="mt-10 rounded-2xl border border-white/10 bg-white/[0.06] p-5" id="official-channels">
        {hasChannels ? (
          <div className="space-y-3 text-sm">
            {email && (
              <a href={`mailto:${email}`} className="flex items-center gap-3 break-all hover:text-blue-200">
                <Mail className="h-4.5 w-4.5 shrink-0 text-electric" /> {email}
              </a>
            )}
            {whatsapp && (
              <a href={`https://wa.me/${whatsapp}`} target="_blank" rel="noreferrer" className="flex items-center gap-3 hover:text-blue-200">
                <MessageCircle className="h-4.5 w-4.5 shrink-0 text-electric" /> {whatsappLabel || `+${whatsapp}`}
              </a>
            )}
          </div>
        ) : (
          <div className="flex items-start gap-3 text-sm">
            <Clock className="mt-0.5 h-4.5 w-4.5 shrink-0 text-electric" />
            <p className="text-blue-100/90">{t('contact.soon')}</p>
          </div>
        )}
      </div>
    </aside>
  )
}

/** @param {{ planRequest?: { id: string, at: number } }} props */
export default function Contact({ planRequest }) {
  const { t, lang, locale } = usePreferences()
  const [form, setForm] = useState(EMPTY)
  const [status, setStatus] = useState('idle') // idle | sending | sent | error
  const [error, setError] = useState('')

  const planOptions = [
    ...PACKAGES.map((p) => ({
      value: p.id,
      label: `${p[lang].name} · ${p.prefix || ''}${p.credits.toLocaleString(locale)} ${p[lang].unit}`,
    })),
    { value: 'personalizado', label: t('contact.planCustom') },
    { value: 'no-se', label: t('contact.planUnsure') },
  ]

  // Preselección desde las tarjetas de Paquetes
  useEffect(() => {
    if (planRequest?.id) {
      setForm((f) => ({ ...f, plan: planRequest.id }))
      setStatus((s) => (s === 'sent' ? 'idle' : s))
    }
  }, [planRequest])

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))
  const freeEmail = FREE_DOMAINS.test(form.email)

  const submit = async (e) => {
    e.preventDefault()
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
    }
  }

  return (
    <section id="solicitar-acceso" className="bg-page py-20 sm:py-24 lg:py-32 scroll-mt-20">
      <span id="contactar" className="sr-only" aria-hidden="true" />
      <div className="container-page">
        <div className="reveal max-w-2xl">
          <p className="eyebrow">{t('contact.eyebrow')}</p>
          <h2 className="mt-3 text-[1.9rem] font-extrabold leading-tight sm:text-[2.6rem]">{t('contact.title')}</h2>
          <p className="mt-4 text-base text-muted sm:text-lg">{t('contact.subtitle')}</p>
        </div>

        <div className="reveal mt-10 grid grid-cols-1 gap-5 sm:mt-12 lg:grid-cols-5">
          <div className="card p-5 sm:p-10 lg:col-span-3">
            {status === 'sent' ? (
              <div className="flex h-full flex-col items-center justify-center py-12 text-center animate-pop" role="status">
                <span className="grid h-16 w-16 place-items-center rounded-full bg-electric-50 text-electric">
                  <CheckCircle2 className="h-8 w-8" />
                </span>
                <h3 className="mt-6 text-2xl font-bold">{t('contact.sentTitle', { name: form.nombre.split(' ')[0] || t('contact.sentThanks') })}</h3>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
                  {t('contact.sentText', { email: form.email })}
                  {form.telefono && t('contact.sentPhone', { phone: form.telefono })}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setForm(EMPTY)
                    setStatus('idle')
                  }}
                  className="btn btn-ghost mt-8"
                >
                  {t('contact.sendAnother')}
                </button>
              </div>
            ) : (
              <form onSubmit={submit} className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="field-label" htmlFor="c-nombre">{t('contact.name')}</label>
                  <input id="c-nombre" className="field" required autoComplete="name" value={form.nombre} onChange={set('nombre')} placeholder={t('contact.namePh')} />
                </div>
                <div>
                  <label className="field-label" htmlFor="c-empresa">{t('contact.company')}</label>
                  <input id="c-empresa" className="field" required autoComplete="organization" value={form.empresa} onChange={set('empresa')} placeholder={t('contact.companyPh')} />
                </div>
                <div>
                  <label className="field-label" htmlFor="c-email">{t('contact.email')}</label>
                  <input id="c-email" type="email" className="field" required autoComplete="email" value={form.email} onChange={set('email')} placeholder={t('contact.emailPh')} />
                  {freeEmail && <p className="mt-1.5 text-[11px] text-electric">{t('contact.freeEmail')}</p>}
                </div>
                <div>
                  <label className="field-label" htmlFor="c-tel">{t('contact.phone')}</label>
                  <input id="c-tel" type="tel" className="field" required autoComplete="tel" value={form.telefono} onChange={set('telefono')} placeholder={t('contact.phonePh')} />
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="c-plan">{t('contact.plan')}</label>
                  <select id="c-plan" className="field cursor-pointer" required value={form.plan} onChange={set('plan')}>
                    <option value="" disabled>{t('contact.planPh')}</option>
                    {planOptions.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <label className="field-label" htmlFor="c-msg">{t('contact.message')}</label>
                  <textarea id="c-msg" rows={4} className="field resize-none" value={form.mensaje} onChange={set('mensaje')} placeholder={t('contact.messagePh')} />
                </div>

                {status === 'error' && <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-500 sm:col-span-2">{error}</p>}

                <div className="flex flex-col-reverse items-start gap-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted">{t('contact.privacy')}</p>
                  <button type="submit" id="contact-submit" disabled={status === 'sending'} className="btn btn-accent w-full sm:w-auto">
                    {status === 'sending' ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    {status === 'sending' ? t('contact.sending') : t('contact.submit')}
                  </button>
                </div>
              </form>
            )}
          </div>

          <div className="lg:col-span-2">
            <ChannelsPanel />
          </div>
        </div>
      </div>
    </section>
  )
}
