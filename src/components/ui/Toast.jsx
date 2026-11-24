import { createContext, useCallback, useContext, useRef, useState } from 'react'
import { CheckCircle2, AlertCircle, Info } from 'lucide-react'

const ToastContext = createContext(() => {})

const ICONS = {
  success: <CheckCircle2 className="h-4.5 w-4.5 shrink-0 text-electric" />,
  error: <AlertCircle className="h-4.5 w-4.5 shrink-0 text-red-500" />,
  info: <Info className="h-4.5 w-4.5 shrink-0 text-electric" />,
}

export function ToastProvider({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef()

  const show = useCallback((message, type = 'success') => {
    clearTimeout(timer.current)
    setToast({ message, type, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), 3400)
  }, [])

  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="pointer-events-none fixed bottom-5 right-5 z-[120]" aria-live="polite">
        {toast && (
          <div key={toast.key} className="card flex max-w-sm items-center gap-3 px-4 py-3 text-sm text-ink animate-pop">
            {ICONS[toast.type]}
            <span>{toast.message}</span>
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useToast = () => useContext(ToastContext)
