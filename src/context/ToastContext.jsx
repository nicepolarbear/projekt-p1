import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ToastContext } from './contextObjects'

const DEFAULT_DURATION = 4000
const MAX_TOASTS = 5

function createToastId() {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `toast-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const timersRef = useRef(new Map())

  const dismiss = useCallback((id) => {
    const timer = timersRef.current.get(id)
    if (timer) {
      clearTimeout(timer)
      timersRef.current.delete(id)
    }
    setToasts((prev) => prev.filter((item) => item.id !== id))
  }, [])

  const toast = useCallback(
    ({ title, description = '', variant = 'default', duration = DEFAULT_DURATION } = {}) => {
      const id = createToastId()
      const newToast = {
        id,
        title,
        description,
        variant,
        duration,
      }

      setToasts((prev) => {
        const next = [...prev, newToast]
        if (next.length > MAX_TOASTS) {
          const removed = next.slice(0, next.length - MAX_TOASTS)
          removed.forEach((item) => {
            const timer = timersRef.current.get(item.id)
            if (timer) {
              clearTimeout(timer)
              timersRef.current.delete(item.id)
            }
          })
          return next.slice(next.length - MAX_TOASTS)
        }
        return next
      })

      if (duration > 0) {
        const timer = setTimeout(() => {
          dismiss(id)
        }, duration)
        timersRef.current.set(id, timer)
      }

      return {
        id,
        dismiss: () => dismiss(id),
      }
    },
    [dismiss]
  )

  useEffect(() => {
    const timers = timersRef.current
    return () => {
      timers.forEach((timer) => clearTimeout(timer))
      timers.clear()
    }
  }, [])

  const value = useMemo(
    () => ({
      toasts,
      toast,
      dismiss,
    }),
    [toasts, toast, dismiss]
  )

  return <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
}
