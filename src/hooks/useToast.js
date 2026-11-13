import { useContext } from 'react'
import { ToastContext } from '../context/contextObjects'

export function useToast() {
  const context = useContext(ToastContext)
  if (context === undefined) {
    throw new Error('useToast musi być używany wewnątrz <ToastProvider>')
  }
  return context
}
