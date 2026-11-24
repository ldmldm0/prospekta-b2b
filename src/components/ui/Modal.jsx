import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'
import { usePreferences } from '../../context/PreferencesContext'

/**
 * Modal accesible: cierra con ESC / clic en fondo y bloquea scroll.
 * Nota: usa un ref para `onClose` y NO re-enfoca el contenedor en cada pulsación de tecla
 * para que los inputs internos nunca pierdan el foco al escribir.
 */
export default function Modal({ open, onClose, children, labelledBy, maxWidth = 'max-w-md' }) {
  const panelRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const { t } = usePreferences()

  useEffect(() => {
    onCloseRef.current = onClose
  }, [onClose])

  useEffect(() => {
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') onCloseRef.current?.()
    }
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.addEventListener('keydown', onKey)
    // Solo enfoca el contenedor al abrir si ningún elemento interno tiene ya el foco
    if (panelRef.current && !panelRef.current.contains(document.activeElement)) {
      panelRef.current.focus()
    }
    return () => {
      document.body.style.overflow = prevOverflow
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" role="presentation">
      <div className="absolute inset-0 bg-navy/45 backdrop-blur-sm animate-[fade-up_0.2s_ease-out_both]" onClick={() => onCloseRef.current?.()} />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={`relative w-full ${maxWidth} max-h-[92vh] overflow-y-auto rounded-3xl bg-surface shadow-lift border border-line outline-none animate-pop`}
      >
        <button
          type="button"
          onClick={() => onCloseRef.current?.()}
          className="absolute right-4 top-4 z-10 grid h-9 w-9 place-items-center rounded-full text-muted transition hover:bg-mist hover:text-ink cursor-pointer"
          aria-label={t('common.close')}
          id="modal-close-btn"
        >
          <X className="h-4.5 w-4.5" />
        </button>
        {children}
      </div>
    </div>,
    document.body,
  )
}
