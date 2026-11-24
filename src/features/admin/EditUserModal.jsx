import { useCallback, useEffect, useRef, useState } from 'react'
import { Eye, EyeOff, Loader2, Pencil } from 'lucide-react'
import Modal from '../../components/ui/Modal'
import { usePreferences } from '../../context/PreferencesContext'
import { toClientEmailId } from '../../services/api'

/**
 * Modal de edición de cliente/usuario en /admin:
 * - Permite modificar nombre, empresa, correo electrónico (id_cliente) y contraseña (opcional).
 * - Envía `correo_anterior` y `correo_nuevo` para actualizar la cuenta y migrar sus registros asociados sin perder historial ni saldo.
 * - Usa `initKeyRef` para que ningún re-renderizado externo reinicie el estado ni robe el foco mientras se escribe.
 */
export default function EditUserModal({ user, onClose, onSave, canAssignSuperAdmin = false, isTargetProtected = false }) {
  const { t } = usePreferences()
  const [form, setForm] = useState({
    nombre: '',
    empresa: '',
    email: '',
    rol: 'admin',
    password: '',
  })
  const [showPwd, setShowPwd] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const initKeyRef = useRef(null)

  useEffect(() => {
    if (!user) {
      initKeyRef.current = null
      return
    }
    const userKey = toClientEmailId(user.email || user.id_cliente) || String(user.id ?? '')
    if (initKeyRef.current === userKey) return
    initKeyRef.current = userKey
    setForm({
      nombre: user.nombre || '',
      empresa: user.empresa || '',
      email: toClientEmailId(user.email || user.id_cliente),
      rol: String(user.rol || 'admin').toLowerCase(),
      password: '',
    })
    setError('')
  }, [user])

  const handleClose = useCallback(() => {
    if (saving) return
    initKeyRef.current = null
    setError('')
    onClose()
  }, [saving, onClose])

  if (!user) return null

  const handleField = (key) => (e) => {
    const val = e.target.value
    setForm((prev) => ({ ...prev, [key]: val }))
  }

  const submit = async (e) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const correo_anterior = toClientEmailId(user.email || user.id_cliente)
      const correo_nuevo = toClientEmailId(form.email)
      const payload = {
        id_cliente: correo_anterior,
        correo_anterior,
        correo_nuevo,
        nuevo_id_cliente: correo_nuevo,
        email: correo_nuevo,
        nombre: form.nombre.trim(),
        empresa: form.empresa.trim(),
        rol: isTargetProtected ? String(user.rol || 'superadmin').toLowerCase() : form.rol,
      }
      if (form.password.trim()) {
        payload.password = form.password.trim()
      }
      await onSave(payload)
      initKeyRef.current = null
      onClose()
    } catch (err) {
      setError(err.message || t('admin.errorGeneric'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open={Boolean(user)} onClose={handleClose} labelledBy="edit-user-title" maxWidth="max-w-lg">
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 pr-8">
          <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-electric-50 text-electric">
            <Pencil className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h3 id="edit-user-title" className="text-lg font-bold text-ink">
              {t('admin.editUserTitle')}
            </h3>
            <p className="truncate font-mono text-xs text-muted">{toClientEmailId(user.email || user.id_cliente)}</p>
          </div>
        </div>

        <form onSubmit={submit} className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="eu-nombre">
              {t('admin.fields.name')}
            </label>
            <input id="eu-nombre" className="field" required value={form.nombre} onChange={handleField('nombre')} placeholder={t('admin.fields.namePh')} />
          </div>
          <div>
            <label className="field-label" htmlFor="eu-empresa">
              {t('admin.fields.company')}
            </label>
            <input id="eu-empresa" className="field" required value={form.empresa} onChange={handleField('empresa')} placeholder={t('admin.fields.companyPh')} />
          </div>
          <div className="sm:col-span-2">
            <label className="field-label" htmlFor="eu-email">
              {t('admin.fields.email')}
            </label>
            <input
              id="eu-email"
              type="email"
              className="field font-mono text-xs"
              required
              value={form.email}
              onChange={handleField('email')}
            />
            <p className="mt-1 text-[11px] text-muted">{t('admin.fields.emailMigrationHint')}</p>
          </div>
          <div>
            <label className="field-label" htmlFor="eu-rol">
              {t('admin.fields.role')}
            </label>
            <select
              id="eu-rol"
              className="field cursor-pointer disabled:opacity-50"
              value={form.rol}
              onChange={handleField('rol')}
              disabled={isTargetProtected}
            >
              <option value="admin">{t('admin.roles.admin')}</option>
              <option value="cliente">{t('admin.roles.cliente')}</option>
              {(canAssignSuperAdmin || isTargetProtected) && <option value="superadmin">{t('admin.roles.superadmin')}</option>}
            </select>
          </div>
          <div>
            <label className="field-label" htmlFor="eu-password">
              {t('admin.fields.newPasswordOptional')}
            </label>
            <div className="relative">
              <input
                id="eu-password"
                type={showPwd ? 'text' : 'password'}
                className="field pr-11"
                value={form.password}
                onChange={handleField('password')}
                placeholder={t('admin.fields.newPasswordPh')}
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
            <p className="rounded-xl border border-red-500/25 bg-red-500/10 px-4 py-3 text-xs text-red-500 dark:text-red-300 sm:col-span-2" role="alert">
              {error}
            </p>
          )}

          <div className="mt-2 flex flex-col-reverse gap-2 sm:col-span-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={handleClose} disabled={saving} className="btn btn-ghost btn-sm">
              {t('common.cancel')}
            </button>
            <button type="submit" id="eu-submit" disabled={saving} className="btn btn-accent btn-sm">
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Pencil className="h-4 w-4" />}
              {saving ? t('admin.saving') : t('admin.editUserSaveBtn')}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  )
}
