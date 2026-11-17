import { useMemo } from 'react'
import { toast as sonnerToast } from 'sonner'
import { ToastContext } from './contextObjects'

/**
 * ToastProvider - Globalny dostawca powiadomień oparty o bibliotekę Sonner.
 * Zapewnia 100% wsteczną kompatybilność z dotychczasowym API `toast({ title, description, variant })`
 * oraz udostępnia metody Sonner: toast.success, toast.error, toast.info, toast.warning.
 */
export function ToastProvider({ children }) {
  const toastWrapper = useMemo(() => {
    const fn = (optsOrTitle, maybeOpts) => {
      if (typeof optsOrTitle === 'string') {
        return sonnerToast(optsOrTitle, maybeOpts)
      }

      const { title, description, variant = 'default', duration = 10000, action, ...rest } =
        optsOrTitle || {}

      const options = {
        description,
        duration,
        action,
        ...rest,
      }

      switch (variant) {
        case 'success':
          return sonnerToast.success(title, options)
        case 'destructive':
        case 'error':
          return sonnerToast.error(title, options)
        case 'warning':
          return sonnerToast.warning(title, options)
        case 'info':
          return sonnerToast.info(title, options)
        default:
          return sonnerToast(title, options)
      }
    }

    fn.success = (title, opts) => sonnerToast.success(title, { duration: 10000, ...opts })
    fn.error = (title, opts) => sonnerToast.error(title, { duration: 10000, ...opts })
    fn.info = (title, opts) => sonnerToast.info(title, { duration: 10000, ...opts })
    fn.warning = (title, opts) => sonnerToast.warning(title, { duration: 10000, ...opts })
    fn.dismiss = (id) => sonnerToast.dismiss(id)
    fn.custom = sonnerToast.custom

    return fn
  }, [])

  const value = useMemo(
    () => ({
      toast: toastWrapper,
      dismiss: sonnerToast.dismiss,
      toasts: [],
    }),
    [toastWrapper]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
