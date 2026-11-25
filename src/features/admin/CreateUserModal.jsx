import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Loader2, UserPlus } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { usePreferences } from '../../context/PreferencesContext'

const EMPTY = { nombre: '', empresa: '', email: '', password: '', rol: 'admin', saldo_creditos: 300 }

/**
 * Extrae automáticamente la cantidad de créditos del campo `paquete_interes` del lead
 * (ej. "Plan PyMEs / Inicio · 300 contactos verificados" → 300,
 * "Plan Crecimiento · 1.000 contactos verificados" → 1000,
 * "Volumen personalizado (+2.000 contactos)" → 2000).
 * Si no detecta un número, devuelve 0.
 */
export function extractCreditsFromPackage(paqueteText = '') {
  const raw = String(paqueteText || '').trim()
  if (!raw) return 0
  const match = raw.match(/(\d{1,3}(?:[.,]\d{3})+|\d+)/)
  if (!match) return 0
  const digitsOnly = match[1].replace(/[.,]/g, '')
  const parsed = Number(digitsOnly)
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
}

/**
 * Modal de creación de cliente/usuario:
 * - Si se abre desde el botón "Nuevo cliente" (`initialData = null`), usa el formulario vacío predeterminado (`EMPTY`).
 * - Si se abre al hacer clic en un lead de "Leads de contacto" (`initialData` presente), prellena:
 *   nombre, empresa, email, password: '', rol: 'cliente' (Cliente estándar) y saldo_creditos extraído del paquete de interés.
 */
export default function CreateUserModal({ open, onClose, onCreate, canAssignSuperAdmin = false, initialData = null }) {
  const { t } = usePreferences()
  const [form, setForm] = useState(EMPTY)
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const initKeyRef = useRef(null)

  useEffect(() => {
    if (!open) {
      initKeyRef.current = null
      return
    }
    const leadEmail = String(initialData?.email ?? initialData?.correo ?? '').trim().toLowerCase()
    const leadName = String(initialData?.nombre ?? initialData?.name ?? initialData?.contacto ?? '').trim()
    const key = initialData ? `lead:${leadEmail}:${leadName}:${initialData?.id ?? ''}` : 'manual'
    if (initKeyRef.current === key) return
    initKeyRef.current = key

    if (initialData && typeof initialData === 'object') {
      const paquete =
        initialData.paquete_interes ??
        initialData.plan ??
        initialData.paquete ??
        initialData.package ??
        ''
      const credits =
        initialData.saldo_creditos !== undefined && initialData.saldo_creditos !== null
          ? Math.max(0, Number(initialData.saldo_creditos) || 0)
          : extractCreditsFromPackage(paquete)

      setForm({
        nombre: leadName,
        empresa: String(initialData.empresa ?? initialData.company ?? '').trim(),
        email: leadEmail,
        password: '',
        rol: 'cliente',
        saldo_creditos: credits,
      })
    } else {
      setForm(EMPTY)
    }
    setError('')
  }, [open, initialData])

  const handleField = (key) => (e) => {
    const val = e.target.value
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const handleClose = useCallback(() => {
    if (saving) return
    initKeyRef.current = null
    setForm(EMPTY)
    setError('')
    onClose()
  }, [saving, onClose])

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const cleanEmail = form.email.trim().toLowerCase()
      await onCreate({
        id_cliente: cleanEmail,
        nombre: form.nombre.trim(),
        empresa: form.empresa.trim(),
        email: cleanEmail,
        password: form.password,
        rol: form.rol,
        saldo_creditos: Math.max(0, Number(form.saldo_creditos) || 0),
      })
      initKeyRef.current = null
      setForm(EMPTY)
      onClose()
    } catch (err) {
      setError(err.message || t('admin.errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={open} onClose={handleClose} labelledBy="create-user-title" maxWidth="max-w-lg">
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 pr-8">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric-50 text-electric">
            <UserPlus className="h-5 w-5" />
          </span>
          <div>
            <h3 id="create-user-title" className="text-lg font-bold text-ink">
              {t('admin.createUserTitle')}
            </h3>
            <p className="text-xs text-muted">{t('admin.createUserSubtitle')}</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="nu-nombre">
              {t('admin.fields.name')}
            </label>
            <input id="nu-nombre" className="field" required value={form.nombre} onChange={handleField('nombre')} placeholder={t('admin.fields.namePh')} />
          </div>
          <div>
            <label className="field-label" htmlFor="nu-empresa">
              {t('admin.fields.company')}
            </label>
            <input id="nu-empresa" className="field" required value={form.empresa} onChange={handleField('empresa')} placeholder={t('admin.fields.companyPh')} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="nu-email">
              {t('admin.fields.email')}
            </label>
            <input id="nu-email" type="email" className="field" required value={form.email} onChange={handleField('email')} placeholder="usuario@empresa.com" />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="nu-password">
              {t('admin.fields.password')}
            </label>
            <div className="relative">
              <input
                id="nu-password"
                type={showPwd ? 'text' : 'password'}
                className="field pr-11"
                required
                minLength={6}
                value={form.password}
                onChange={handleField('password')}
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
          <div>
            <label className="field-label" htmlFor="nu-rol">
              {t('admin.fields.role')}
            </label>
            <select id="nu-rol" className="field cursor-pointer" value={form.rol} onChange={handleField('rol')}>
              <option value="cliente">{t('admin.roles.cliente')}</option>
              <option value="admin">{t('admin.roles.admin')}</option>
              {canAssignSuperAdmin && <option value="superadmin">{t('admin.roles.superadmin')}</option>}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="nu-creditos">
              {t('admin.fields.credits')}
            </label>
            <input
              id="nu-creditos"
              type="number"
              min={0}
              step={1}
              className="field"
              required
              value={form.saldo_creditos}
              onChange={handleField('saldo_creditos')}
            />
          </div>

          {error && (
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-500 dark:text-red-300 sm:col-span-2" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2 flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={handleClose} disabled={saving} className="btn btn-ghost btn-sm">
              {t('common.cancel')}
            </button>
            <button type="submit" id="nu-submit" disabled={saving} className="btn btn-accent btn-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
              {saving ? t('admin.saving') : t('admin.createUserBtn')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
