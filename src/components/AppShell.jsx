import { useEffect, useRef, useState } from 'react'
import { ArrowLeft } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useAuth } from '../hooks/useAuth'
import { useDesktopLayout } from '../hooks/useDesktopLayout'
import { canAccessDashboard } from '../lib/permissions'
import { BootSplash } from './auth/BootSplash'
import { LoginPage } from './auth/LoginPage'
import { PublicBugTracker } from './bugs/PublicBugTracker'
import { ReportBugWizard } from './bugs/ReportBugWizard'
import { DashboardView } from './dashboard/DashboardView'
import { MainLayout } from './MainLayout'
import { ProfileView } from './profile/ProfileView'
import { ReporterPortal } from './reporter/ReporterPortal'
import { AccessDeniedCard } from './shared/AccessDeniedCard'
import { TopBar } from './TopBar'
import { Button } from './ui/button'

/**
 * AppShell - główna powłoka aplikacji zarządzająca stanem uwierzytelnienia
 * i aktywnym widokiem (pulpit zadań / dashboard zarządczy / portal zgłaszającego / profil).
 */
export function AppShell() {
  const { authStatus, user } = useAuth()
  const { focusedTaskId } = useAppContext()
  const [activeView, setActiveView] = useState('workspace')
  const [isPublicTracker, setIsPublicTracker] = useState(() => {
    if (typeof window === 'undefined') return false
    return (
      window.location.hash.startsWith('#track') ||
      window.location.pathname.startsWith('/track')
    )
  })
  const [isReportingBug, setIsReportingBug] = useState(false)
  const { resetLayout } = useDesktopLayout(user?.id ?? null)

  const isIndividualReporter = user?.account_type === 'individual_reporter'
  const hasDashboardAccess = canAccessDashboard(user)

  const prevAuthStatusRef = useRef(authStatus)
  const prevHadDashboardAccessRef = useRef(hasDashboardAccess)

  useEffect(() => {
    const handleHashChange = () => {
      if (
        window.location.hash.startsWith('#track') ||
        window.location.pathname.startsWith('/track')
      ) {
        setIsPublicTracker(true)
      }
    }
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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

  useEffect(() => {
    if (focusedTaskId && activeView !== 'workspace') {
      setActiveView('workspace')
    }
  }, [focusedTaskId, activeView])

  if (authStatus === 'booting') {
    return <BootSplash />
  }

  // Widok dla użytkowników niezalogowanych
  if (authStatus === 'unauthenticated' || !user) {
    if (isPublicTracker) {
      return (
        <PublicBugTracker
          onBackToLogin={() => {
            setIsPublicTracker(false)
            if (window.location.hash.startsWith('#track')) {
              window.location.hash = ''
            }
          }}
        />
      )
    }

    return (
      <>
        <LoginPage
          onOpenTracker={() => setIsPublicTracker(true)}
          onOpenBugReport={() => setIsReportingBug(true)}
        />
        {isReportingBug && (
          <div className="fixed inset-0 z-50 bg-zinc-950 overflow-y-auto">
            <ReportBugWizard
              onClose={() => setIsReportingBug(false)}
              onReturnToHome={() => setIsReportingBug(false)}
            />
          </div>
        )}
      </>
    )
  }

  // Dedykowany portal dla zgłaszających usterki (individual_reporter)
  if (isIndividualReporter) {
    if (activeView === 'profile') {
      return (
        <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">
          <header className="flex items-center justify-between gap-4 px-4 py-2.5 bg-zinc-900/95 border-b border-zinc-800 shrink-0 backdrop-blur-md">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setActiveView('workspace')}
              className="border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-300 text-xs gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Powrót do Portalu Zgłoszeń
            </Button>
          </header>
          <div className="flex-1 min-h-0 overflow-y-auto">
            <ProfileView onResetDesktopLayout={resetLayout} />
          </div>
        </div>
      )
    }

    return <ReporterPortal onOpenProfile={() => setActiveView('profile')} />
  }

  // Standardowy interfejs biznesowy TaskFlow (business_user)
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
