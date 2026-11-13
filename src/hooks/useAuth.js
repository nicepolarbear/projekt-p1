import { useContext } from 'react'
import { AuthContext } from '../context/contextObjects'

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth musi być używany wewnątrz <AuthProvider>')
  }
  return context
}
