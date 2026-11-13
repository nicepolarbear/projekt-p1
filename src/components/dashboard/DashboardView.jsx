import { useCallback, useEffect, useState } from 'react'
import {
  ArrowLeft,
  Bug,
  LayoutDashboard,
  ListChecks,
  RefreshCw,
  ScrollText,
  ShieldAlert,
  ShieldCheck,
  UserCheck,
  Users,
} from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import {
  canAccessDashboard,
  canApproveJoinRequests,
  canGenerateInvites,
  canManagePermissions,
  canTriageBugs,
} from '../../lib/permissions'
import { dashboardService } from '../../services/dashboardService'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs'
import { AuditLogPanel } from './AuditLogPanel'
import { BugTriagePanel } from './BugTriagePanel'
import { DashboardOverview } from './DashboardOverview'
import { Avatar, RoleBadge } from './DashboardShared'
import { JoinRequestsPanel } from './JoinRequestsPanel'
import { PermissionsMatrixPanel } from './PermissionsMatrixPanel'
import { TaskOversightPanel } from './TaskOversightPanel'
import { UserManagementPanel } from './UserManagementPanel'
import { formatDateTimePl, getUserFullName, resolveUserRole } from './dashboardUtils'

export function DashboardView({ onBackToWorkspace, onBack }) {
  const { user: authUser } = useAuth()
  const { currentUser: ctxUser, roles, refreshTasks } = useAppContext()
  const { toast } = useToast()

  const currentUser = authUser || ctxUser
  const hasAccess = canAccessDashboard(currentUser)
  const handleBack = onBackToWorkspace || onBack

  const [activeTab, setActiveTab] = useState('overview')
  const [overview, setOverview] = useState(null)
  const [isLoadingOverview, setIsLoadingOverview] = useState(true)
  const [overviewError, setOverviewError] = useState(null)
  const [lastUpdatedAt, setLastUpdatedAt] = useState(null)
  const [refreshSignal, setRefreshSignal] = useState(0)

  const [taskFilterPreset, setTaskFilterPreset] = useState({
    key: 0,
    employeeId: 'all',
    overdueOnly: false,
  })

  const loadOverview = useCallback(
    async ({ silent = false } = {}) => {
      if (!hasAccess) return
      setIsLoadingOverview(true)
      setOverviewError(null)
      try {
        const data = await dashboardService.getOverview()
        setOverview(data)
        setLastUpdatedAt(new Date().toISOString())
      } catch (err) {
        const msg = err?.message || 'Nie udało się pobrać danych analitycznych.'
        setOverviewError(msg)
        if (!silent) {
          toast({
            title: 'Błąd odświeżania dashboardu',
            description: msg,
            variant: 'destructive',
          })
        }
      } finally {
        setIsLoadingOverview(false)
      }
    },
    [hasAccess, toast]
  )

  useEffect(() => {
    if (!hasAccess) return
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (!cancelled) {
        await loadOverview({ silent: true })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [hasAccess, loadOverview])

  const handleRefreshAll = useCallback(async () => {
    await loadOverview()
    setRefreshSignal((s) => s + 1)
  }, [loadOverview])

  const handleDataMutated = useCallback(() => {
    loadOverview({ silent: true })
    refreshTasks?.()
  }, [loadOverview, refreshTasks])

  const handleSelectEmployeeFromChart = useCallback((employeeId) => {
    setTaskFilterPreset({
      key: Date.now(),
      employeeId: employeeId ?? 'all',
      overdueOnly: false,
      inTrash: false,
      search: '',
    })
    setActiveTab('tasks')
  }, [])

  const handleInspectOverdue = useCallback((task = null) => {
    setTaskFilterPreset({
      key: Date.now(),
      employeeId: 'all',
      overdueOnly: true,
      inTrash: false,
      search: task?.title || '',
    })
    setActiveTab('tasks')
  }, [])

  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex items-center justify-center p-6">
        <Card className="max-w-md w-full border-zinc-800 bg-zinc-900 shadow-2xl">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full border border-red-900/60 bg-red-950/40 text-red-400">
              <ShieldAlert className="h-6 w-6" />
            </div>
            <CardTitle className="text-lg text-zinc-100">
              Brak dostępu do panelu zarządczego
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 mt-1 leading-relaxed">
              Widok analityki, nadzoru zadań oraz zarządzania użytkownikami jest dostępny
              wyłącznie dla Administratorów oraz Dyrektorów.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4 flex justify-center">
            {handleBack ? (
              <Button onClick={handleBack} className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Powrót do pulpitu roboczego
              </Button>
            ) : (
              <p className="text-xs text-zinc-500">
                Skontaktuj się z administratorem, jeśli potrzebujesz wyższych uprawnień.
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  const overdueCount = Number(
    overview?.kpis?.overdue_tasks ??
      overview?.kpis?.overdue_count ??
      overview?.overdue_tasks?.length ??
      0
  )
  const currentUserRole = resolveUserRole(currentUser, roles)

  const showBugsTab = canTriageBugs(currentUser)
  const showJoinRequestsTab =
    canApproveJoinRequests(currentUser) || canGenerateInvites(currentUser)
  const showPermissionsTab = canManagePermissions(currentUser)

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 py-6 space-y-6">
        {/* Nagłówek */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border border-zinc-800 bg-zinc-900 p-4 sm:p-5">
          <div className="flex items-start sm:items-center gap-3.5">
            {handleBack && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleBack}
                className="border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-200 gap-1.5 shrink-0"
              >
                <ArrowLeft className="h-4 w-4" />
                Pulpit
              </Button>
            )}
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h1 className="text-lg sm:text-xl font-bold tracking-tight text-zinc-100">
                  Panel Zarządczy TaskFlow
                </h1>
                <RoleBadge role={currentUserRole} />
              </div>
              <p className="text-xs text-zinc-400 mt-0.5">
                Nadzór operacyjny, analityka efektywności zespołu, zarządzanie użytkownikami i audyt
                {lastUpdatedAt && (
                  <span className="text-zinc-500">
                    {' '}
                    · Aktualizacja: {formatDateTimePl(lastUpdatedAt)}
                  </span>
                )}
              </p>
            </div>
          </div>

          <div className="flex items-center justify-between md:justify-end gap-3">
            <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-950/70 px-2.5 py-1.5">
              <Avatar user={currentUser} size="xs" />
              <span className="text-xs font-medium text-zinc-200">
                {getUserFullName(currentUser)}
              </span>
            </div>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleRefreshAll}
              disabled={isLoadingOverview}
              className="gap-1.5 border-zinc-700 bg-zinc-950 hover:bg-zinc-800 text-zinc-200"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoadingOverview ? 'animate-spin' : ''}`}
              />
              Odśwież dane
            </Button>
          </div>
        </header>

        {/* Zakładki */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <TabsList className="h-auto flex flex-wrap justify-start gap-1 bg-zinc-900 border border-zinc-800 p-1.5 w-full sm:w-auto">
            <TabsTrigger value="overview" className="gap-2 py-2 px-3 text-xs sm:text-sm">
              <LayoutDashboard className="h-4 w-4" />
              Przegląd i analityka
            </TabsTrigger>
            <TabsTrigger value="tasks" className="gap-2 py-2 px-3 text-xs sm:text-sm">
              <ListChecks className="h-4 w-4" />
              Nadzór zadań
              {overdueCount > 0 && (
                <Badge variant="destructive" className="ml-0.5 px-1.5 py-0 text-[10px]">
                  {overdueCount}
                </Badge>
              )}
            </TabsTrigger>
            {showBugsTab && (
              <TabsTrigger value="bugs" className="gap-2 py-2 px-3 text-xs sm:text-sm">
                <Bug className="h-4 w-4" />
                Zgłoszenia błędów
              </TabsTrigger>
            )}
            <TabsTrigger value="users" className="gap-2 py-2 px-3 text-xs sm:text-sm">
              <Users className="h-4 w-4" />
              Zespół i użytkownicy
            </TabsTrigger>
            {showJoinRequestsTab && (
              <TabsTrigger value="join-requests" className="gap-2 py-2 px-3 text-xs sm:text-sm">
                <UserCheck className="h-4 w-4" />
                Wnioski i kody
              </TabsTrigger>
            )}
            {showPermissionsTab && (
              <TabsTrigger value="permissions" className="gap-2 py-2 px-3 text-xs sm:text-sm">
                <ShieldCheck className="h-4 w-4" />
                Matryca uprawnień
              </TabsTrigger>
            )}
            <TabsTrigger value="audit" className="gap-2 py-2 px-3 text-xs sm:text-sm">
              <ScrollText className="h-4 w-4" />
              Dziennik audytu
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-4">
            <DashboardOverview
              overview={overview}
              isLoading={isLoadingOverview}
              error={overviewError}
              onRetry={() => loadOverview()}
              onSelectEmployee={handleSelectEmployeeFromChart}
              onInspectOverdue={handleInspectOverdue}
            />
          </TabsContent>

          <TabsContent value="tasks" className="mt-4">
            <TaskOversightPanel
              key={taskFilterPreset.key}
              filterPreset={taskFilterPreset}
              refreshSignal={refreshSignal}
              onTaskMutated={handleDataMutated}
            />
          </TabsContent>

          {showBugsTab && (
            <TabsContent value="bugs" className="mt-4">
              <BugTriagePanel
                refreshSignal={refreshSignal}
                onTaskCreated={handleDataMutated}
              />
            </TabsContent>
          )}

          <TabsContent value="users" className="mt-4">
            <UserManagementPanel
              refreshSignal={refreshSignal}
              onUserMutated={handleDataMutated}
            />
          </TabsContent>

          {showJoinRequestsTab && (
            <TabsContent value="join-requests" className="mt-4">
              <JoinRequestsPanel refreshSignal={refreshSignal} />
            </TabsContent>
          )}

          {showPermissionsTab && (
            <TabsContent value="permissions" className="mt-4">
              <PermissionsMatrixPanel refreshSignal={refreshSignal} />
            </TabsContent>
          )}

          <TabsContent value="audit" className="mt-4">
            <AuditLogPanel refreshSignal={refreshSignal} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
