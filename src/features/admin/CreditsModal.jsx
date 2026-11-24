import { useCallback, useState } from 'react'
import { Coins, Equal, Loader2, Minus, Plus } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { usePreferences } from '../../context/PreferencesContext'

const QUICK_AMOUNTS = [100, 300, 500, 1000]

/**
 * Modal de Gestión de Créditos intuitivo con 3 acciones explícitas:
 * 1) Sumar créditos (+)
 * 2) Restar créditos (-)
 * 3) Establecer saldo exacto (=)
 * Muestra la vista previa del saldo resultante antes de confirmar.
 */
export default function CreditsModal({ user, onClose, onSave }) {
  const { t, locale } = usePreferences()
  const current = Number(user?.saldo_creditos) || 0

  const [action, setAction] = useState('sumar') // 'sumar' | 'restar' | 'establecer'
  const [amount, setAmount] = useState('300')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleClose = useCallback(() => {
    if (saving) return
    setError('')
    onClose()
  }, [saving, onClose])

  if (!user) return null

  const numeric = Math.max(0, Number(amount) || 0)
  const valid = Number.isFinite(Number(amount)) && amount !== '' && (action === 'establecer' ? numeric >= 0 : numeric > 0)

  const nextTotal =
    action === 'sumar'
      ? current + numeric
      : action === 'restar'
        ? Math.max(0, current - numeric)
        : Math.max(0, numeric)

  const signedDelta = action === 'sumar' ? numeric : action === 'restar' ? -numeric : nextTotal - current

  const submit = async (e) => {
    e.preventDefault()
    if (!valid) return
    setSaving(true)
    setError('')
    try {
      const cleanEmailId = String(user.email || user.id_cliente || '').trim().toLowerCase()
      await onSave({
        id_cliente: cleanEmailId,
        email: cleanEmailId,
        modo: action === 'establecer' ? 'establecer' : 'sumar',
        operacion: action,
        cantidad: action === 'restar' ? -numeric : numeric,
        saldo_creditos: nextTotal,
      })
      onClose()
    } catch (err) {
      setError(err.message || t('admin.errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  const actions = [
    { id: 'sumar', label: t('admin.creditsModeAdd'), icon: Plus, tone: 'text-emerald-400' },
    { id: 'restar', label: t('admin.creditsModeSub'), icon: Minus, tone: 'text-amber-400' },
    { id: 'establecer', label: t('admin.creditsModeSet'), icon: Equal, tone: 'text-electric' },
  ]

  return (
    <Modal open={Boolean(user)} onClose={handleClose} labelledBy="credits-modal-title" maxWidth="max-w-lg">
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 pr-8">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric-50 text-electric">
            <Coins className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 id="credits-modal-title" className="text-lg font-bold text-ink">
              {t('admin.creditsModalTitle')}
            </h3>
            <p className="truncate text-xs text-muted">
              {user.nombre} · {user.empresa || user.email}
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {/* Tres botones explícitos: Sumar (+), Restar (-), Establecer saldo exacto */}
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {actions.map(({ id, label, icon: Icon, tone }) => {
              const on = action === id
              return (
                <button
                  key={id}
                  type="button"
                  id={`credits-mode-${id}`}
                  onClick={() => {
                    setAction(id)
                    setAmount(id === 'establecer' ? String(current) : '300')
                  }}
                  className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition cursor-pointer ${
                    on ? 'border-electric bg-electric-50 text-ink ring-2 ring-electric/20' : 'border-line bg-surface text-muted hover:text-ink'
                  }`}
                >
                  <Icon className={`h-4 w-4 shrink-0 ${on ? 'text-electric' : tone}`} />
                  <span>{label}</span>
                </button>
              )
            })}
          </div>

          <div>
            <label className="field-label" htmlFor="cr-amount">
              {action === 'sumar'
                ? t('admin.creditsAmountAdd')
                : action === 'restar'
                  ? t('admin.creditsAmountSub')
                  : t('admin.creditsAmountSet')}
            </label>
            <input
              id="cr-amount"
              type="number"
              step={1}
              min={0}
              required
              className="field font-mono text-base"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />
            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {QUICK_AMOUNTS.map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => setAmount(String(q))}
                  className="rounded-lg border border-line bg-mist/60 px-2.5 py-1 font-mono text-[11px] font-semibold text-muted transition hover:border-electric hover:text-electric cursor-pointer"
                >
                  {action === 'sumar' ? `+${q}` : action === 'restar' ? `-${q}` : q}
                </button>
              ))}
            </div>
          </div>

          {/* Vista previa clara del saldo resultante */}
          <div className="rounded-2xl border border-electric/25 bg-electric-50/60 p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted">{t('admin.creditsCurrent')}</span>
              <span className="font-mono font-semibold text-ink">{current.toLocaleString(locale)}</span>
            </div>
            <div className="mt-1.5 flex items-center justify-between text-xs">
              <span className="text-muted">{t('admin.creditsMovement')}</span>
              <span className={`font-mono font-semibold ${signedDelta >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                {signedDelta >= 0 ? `+${signedDelta.toLocaleString(locale)}` : signedDelta.toLocaleString(locale)}
              </span>
            </div>
            <div className="mt-2.5 flex items-center justify-between border-t border-line pt-2.5 text-sm">
              <span className="font-semibold text-ink">{t('admin.creditsPreview')}</span>
              <span className="font-mono text-base font-extrabold text-electric">{nextTotal.toLocaleString(locale)}</span>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-500 dark:text-red-300" role="alert">
              {error}
            </p>
          )}

          <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={handleClose} disabled={saving} className="btn btn-ghost btn-sm">
              {t('common.cancel')}
            </button>
            <button type="submit" id="cr-submit" disabled={saving || !valid} className="btn btn-accent btn-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Coins className="h-4 w-4" />}
              {saving ? t('admin.saving') : t('admin.creditsSaveBtn')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
