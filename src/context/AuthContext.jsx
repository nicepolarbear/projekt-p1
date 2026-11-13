import { useCallback, useEffect, useMemo, useState } from 'react'
import { registerUnauthorizedHandler } from '../lib/api'
import { authService } from '../services/authService'
import { profileService } from '../services/profileService'
import { AuthContext } from './contextObjects'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [authStatus, setAuthStatus] = useState('booting')
  const [sessionExpiredMessage, setSessionExpiredMessage] = useState(null)

  const refreshMe = useCallback(async () => {
    try {
      const data = await authService.me()
      const resolvedUser = data?.user ?? data ?? null
      if (resolvedUser) {
        setUser(resolvedUser)
        setAuthStatus('authenticated')
        setSessionExpiredMessage(null)
      } else {
        setUser(null)
        setAuthStatus('unauthenticated')
      }
      return resolvedUser
    } catch (error) {
      if (error?.status === 401) {
        setUser(null)
        setAuthStatus('unauthenticated')
        return null
      }
      setUser(null)
      setAuthStatus('unauthenticated')
      throw error
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await authService.me()
        if (!active) return
        const resolvedUser = data?.user ?? data ?? null
        if (resolvedUser) {
          setUser(resolvedUser)
          setAuthStatus('authenticated')
        } else {
          setUser(null)
          setAuthStatus('unauthenticated')
        }
      } catch {
        if (!active) return
        setUser(null)
        setAuthStatus('unauthenticated')
      }
    })()

    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    const unregister = registerUnauthorizedHandler(() => {
      setUser(null)
      setAuthStatus('unauthenticated')
      setSessionExpiredMessage('Twoja sesja wygasła. Zaloguj się ponownie.')
    })
    return unregister
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authService.login(email, password)
    const resolvedUser = data?.user ?? data
    setUser(resolvedUser)
    setAuthStatus('authenticated')
    setSessionExpiredMessage(null)
    return resolvedUser
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
      setAuthStatus('unauthenticated')
      setSessionExpiredMessage(null)
    }
  }, [])

  const updateProfile = useCallback(async (data) => {
    const res = await profileService.updateProfile(data)
    const updatedUser = res?.user ?? res
    setUser((prev) => {
      if (!prev) return updatedUser
      return { ...prev, ...updatedUser }
    })
    return updatedUser
  }, [])

  const updatePreferences = useCallback(async (prefs) => {
    const res = await profileService.updatePreferences(prefs)
    const updatedUser = res?.user ?? null
    const updatedPrefs = res?.preferences ?? updatedUser?.preferences ?? prefs
    setUser((prev) => {
      if (!prev) return updatedUser
      if (updatedUser) {
        return {
          ...prev,
          ...updatedUser,
          preferences: {
            ...(prev.preferences || {}),
            ...(updatedUser.preferences || updatedPrefs || {}),
          },
        }
      }
      return {
        ...prev,
        preferences: {
          ...(prev.preferences || {}),
          ...updatedPrefs,
        },
      }
    })
    return res
  }, [])

  const changePassword = useCallback(async (current_password, new_password) => {
    return authService.changePassword(current_password, new_password)
  }, [])

  const value = useMemo(
    () => ({
      user,
      authStatus,
      sessionExpiredMessage,
      login,
      logout,
      refreshMe,
      updateProfile,
      updatePreferences,
      changePassword,
    }),
    [
      user,
      authStatus,
      sessionExpiredMessage,
      login,
      logout,
      refreshMe,
      updateProfile,
      updatePreferences,
      changePassword,
    ]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
