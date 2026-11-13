import { useEffect, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useDesktopLayout } from '../hooks/useDesktopLayout'
import { canAccessDashboard } from '../lib/permissions'
import { BootSplash } from './auth/BootSplash'
import { LoginPage } from './auth/LoginPage'
import { DashboardView } from './dashboard/DashboardView'
import { MainLayout } from './MainLayout'
import { ProfileView } from './profile/ProfileView'
import { AccessDeniedCard } from './shared/AccessDeniedCard'
import { TopBar } from './TopBar'

/**
 * AppShell - główna powłoka aplikacji zarządzająca stanem uwierzytelnienia
 * i aktywnym widokiem (pulpit zadań / dashboard zarządczy / profil).
 */
export function AppShell() {
  const { authStatus, user } = useAuth()
  const [activeView, setActiveView] = useState('workspace')
  const { resetLayout } = useDesktopLayout(user?.id ?? null)

  const hasDashboardAccess = canAccessDashboard(user)
  const prevAuthStatusRef = useRef(authStatus)
  const prevHadDashboardAccessRef = useRef(hasDashboardAccess)

  useEffect(() => {
    const prevAuthStatus = prevAuthStatusRef.current
    const prevHadDashboard = prevHadDashboardAccessRef.current

    if (authStatus !== 'authenticated' && prevAuthStatus === 'authenticated') {
      setActiveView('workspace')
    } else if (
      authStatus === 'authenticated' &&
      prevHadDashboard &&
      !hasDashboardAccess &&
      activeView === 'dashboard'
    ) {
      setActiveView('workspace')
    }

    prevAuthStatusRef.current = authStatus
    prevHadDashboardAccessRef.current = hasDashboardAccess
  }, [authStatus, hasDashboardAccess, activeView])

  if (authStatus === 'booting') {
    return <BootSplash />
  }

  if (authStatus === 'unauthenticated' || !user) {
    return <LoginPage />
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
      <TopBar activeView={activeView} onChangeView={setActiveView} />

      {activeView === 'workspace' && <MainLayout />}

      {activeView === 'dashboard' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          {hasDashboardAccess ? (
            <DashboardView onBackToWorkspace={() => setActiveView('workspace')} />
          ) : (
            <AccessDeniedCard onBack={() => setActiveView('workspace')} />
          )}
        </div>
      )}

      {activeView === 'profile' && (
        <div className="flex-1 min-h-0 overflow-y-auto">
          <ProfileView onResetDesktopLayout={resetLayout} />
        </div>
      )}
    </div>
  )
}
