import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  Clock,
  Layers,
  RefreshCw,
  UserCheck,
  Users,
} from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { statusVariantMap } from '../../lib/constants'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { DashboardCharts } from './DashboardCharts'
import { formatDatePl, getDaysOverdue, getUserFullName } from './dashboardUtils'

function normalizeOverviewKpis(overview) {
  const kpis = overview?.kpis ?? overview ?? {}

  const todoTasks = Number(kpis.todo_tasks ?? kpis.todo ?? 0)
  const inProgressTasks = Number(kpis.in_progress_tasks ?? kpis.in_progress ?? 0)
  const completedTasks = Number(kpis.completed_tasks ?? kpis.done_tasks ?? kpis.done ?? 0)
  const activeTasks = Number(
    kpis.active_tasks ??
      kpis.total_active_tasks ??
      kpis.total_tasks ??
      todoTasks + inProgressTasks + completedTasks
  )
  const overdueTasksList = Array.isArray(overview?.overdue_tasks)
    ? overview.overdue_tasks
    : Array.isArray(overview?.overdueTasks)
      ? overview.overdueTasks
      : []

  const overdueCount = Number(
    kpis.overdue_tasks ?? kpis.overdue_count ?? kpis.overdue ?? overdueTasksList.length
  )

  const computedRate =
    activeTasks > 0 ? Math.round((completedTasks / activeTasks) * 100) : 0
  const completionRate = Number(
    kpis.completion_rate_pct ?? kpis.completion_rate ?? kpis.efficiency_rate ?? computedRate
  )

  const pendingAssignments = Number(
    kpis.pending_assignments ?? kpis.pending_count ?? 0
  )
  const rejectedAssignments = Number(
    kpis.rejected_assignments ?? kpis.rejected_count ?? 0
  )
  const attentionAssignments = Number(
    kpis.pending_or_rejected_assignments ?? pendingAssignments + rejectedAssignments
  )

  const activeEmployees = Number(
    kpis.active_employees ?? kpis.active_users ?? kpis.total_active_users ?? 0
  )
  const totalEmployees = Number(
    kpis.total_employees ?? kpis.total_users ?? 0
  )

  return {
    activeTasks,
    todoTasks,
    inProgressTasks,
    completedTasks,
    completionRate,
    overdueCount,
    pendingAssignments,
    rejectedAssignments,
    attentionAssignments,
    activeEmployees,
    totalEmployees,
    overdueTasksList,
  }
}

export function DashboardOverview({
  overview,
  isLoading,
  error,
  onRetry,
  onSelectEmployee,
  onInspectOverdue,
}) {
  const { taskStatuses, users } = useAppContext()

  if (isLoading && !overview) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, idx) => (
            <div
              key={idx}
              className="h-28 rounded-xl border border-zinc-800 bg-zinc-900/70 animate-pulse p-4"
            />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          <div className="lg:col-span-4 h-72 rounded-xl border border-zinc-800 bg-zinc-900/70 animate-pulse" />
          <div className="lg:col-span-4 h-72 rounded-xl border border-zinc-800 bg-zinc-900/70 animate-pulse" />
          <div className="lg:col-span-4 h-72 rounded-xl border border-zinc-800 bg-zinc-900/70 animate-pulse" />
        </div>
      </div>
    )
  }

  if (error && !overview) {
    return (
      <Card className="border-red-900/60 bg-red-950/20">
        <CardContent className="p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm font-semibold text-red-200">
                Nie udało się załadować przeglądu analitycznego
              </h3>
              <p className="text-xs text-red-300/80 mt-1">{error}</p>
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={onRetry} className="shrink-0 gap-2">
            <RefreshCw className="h-3.5 w-3.5" />
            Ponów próbę
          </Button>
        </CardContent>
      </Card>
    )
  }

  const stats = normalizeOverviewKpis(overview)

  return (
    <div className="space-y-6">
      {/* 6 Kart KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {/* 1. Wszystkie aktywne zadania */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-zinc-400">
              Aktywne zadania
            </CardDescription>
            <Layers className="h-4 w-4 text-zinc-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-zinc-100">{stats.activeTasks}</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              Do zrobienia: <span className="text-zinc-300">{stats.todoTasks}</span>
            </p>
          </CardContent>
        </Card>

        {/* 2. W trakcie */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-zinc-400">
              W trakcie
            </CardDescription>
            <Clock className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-blue-300">{stats.inProgressTasks}</div>
            <p className="text-[11px] text-zinc-500 mt-1">Aktualnie na pulpitach zespołu</p>
          </CardContent>
        </Card>

        {/* 3. Ukończone & Skuteczność (%) */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-zinc-400">
              Ukończone &amp; Skuteczność
            </CardDescription>
            <CheckCircle2 className="h-4 w-4 text-emerald-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-2xl font-bold text-emerald-300">{stats.completedTasks}</span>
              <Badge variant="status-done" className="text-[11px]">
                {stats.completionRate}%
              </Badge>
            </div>
            <div className="mt-2 h-1.5 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all duration-300"
                style={{ width: `${Math.min(100, Math.max(0, stats.completionRate))}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* 4. Po terminie */}
        <Card
          className={
            stats.overdueCount > 0
              ? 'border-red-800/80 bg-red-950/25 shadow-lg shadow-red-950/20'
              : 'border-zinc-800 bg-zinc-900'
          }
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription
              className={`text-xs font-medium ${
                stats.overdueCount > 0 ? 'text-red-300' : 'text-zinc-400'
              }`}
            >
              Po terminie
            </CardDescription>
            <AlertTriangle
              className={`h-4 w-4 ${
                stats.overdueCount > 0 ? 'text-red-400 animate-pulse' : 'text-zinc-500'
              }`}
            />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              className={`text-2xl font-bold ${
                stats.overdueCount > 0 ? 'text-red-400' : 'text-zinc-100'
              }`}
            >
              {stats.overdueCount}
            </div>
            <p
              className={`text-[11px] mt-1 ${
                stats.overdueCount > 0 ? 'text-red-300/80' : 'text-zinc-500'
              }`}
            >
              {stats.overdueCount > 0 ? 'Wymaga pilnej interwencji' : 'Wszystkie zadania w terminie'}
            </p>
          </CardContent>
        </Card>

        {/* 5. Oczekujące / Odrzucone przypisania */}
        <Card
          className={
            stats.attentionAssignments > 0
              ? 'border-amber-800/60 bg-amber-950/15'
              : 'border-zinc-800 bg-zinc-900'
          }
        >
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-zinc-400">
              Przypisania do reakcji
            </CardDescription>
            <UserCheck
              className={`h-4 w-4 ${
                stats.attentionAssignments > 0 ? 'text-amber-400' : 'text-zinc-500'
              }`}
            />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div
              className={`text-2xl font-bold ${
                stats.attentionAssignments > 0 ? 'text-amber-300' : 'text-zinc-100'
              }`}
            >
              {stats.attentionAssignments}
            </div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {stats.pendingAssignments} oczek. ·{' '}
              <span className={stats.rejectedAssignments > 0 ? 'text-red-400' : ''}>
                {stats.rejectedAssignments} odrzuc.
              </span>
            </p>
          </CardContent>
        </Card>

        {/* 6. Aktywni pracownicy */}
        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="p-4 pb-2 flex flex-row items-center justify-between space-y-0">
            <CardDescription className="text-xs font-medium text-zinc-400">
              Aktywni pracownicy
            </CardDescription>
            <Users className="h-4 w-4 text-sky-400" />
          </CardHeader>
          <CardContent className="p-4 pt-0">
            <div className="text-2xl font-bold text-zinc-100">{stats.activeEmployees}</div>
            <p className="text-[11px] text-zinc-500 mt-1">
              {stats.totalEmployees > 0
                ? `z ${stats.totalEmployees} kont w systemie`
                : 'Aktywne konta w organizacji'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Wykresy */}
      <DashboardCharts overview={overview} onSelectEmployee={onSelectEmployee} />

      {/* Panel Alertów Operacyjnych */}
      <Card className="border-zinc-800 bg-zinc-900">
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-sm font-semibold text-zinc-100 flex items-center gap-2">
                <AlertTriangle
                  className={`h-4 w-4 ${
                    stats.overdueTasksList.length > 0 ? 'text-red-400' : 'text-emerald-400'
                  }`}
                />
                Alerty operacyjne — zadania po terminie
                {stats.overdueTasksList.length > 0 && (
                  <Badge variant="destructive" className="ml-1">
                    {stats.overdueTasksList.length}
                  </Badge>
                )}
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500 mt-0.5">
                Lista zadań z przekroczonym terminem realizacji wymagających weryfikacji
              </CardDescription>
            </div>
            {stats.overdueTasksList.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onInspectOverdue?.()}
                className="gap-1.5 text-xs border-red-900/60 text-red-300 hover:bg-red-950/40 hover:text-red-200 self-start sm:self-auto"
              >
                Przejdź do nadzoru zadań
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {stats.overdueTasksList.length === 0 ? (
            <div className="flex items-center gap-3 rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 text-xs text-zinc-400">
              <CheckCircle2 className="h-5 w-5 text-emerald-500 shrink-0" />
              <span>
                Brak zadań po terminie. Wszystkie bieżące zadania mieszczą się w harmonogramie.
              </span>
            </div>
          ) : (
            <div className="divide-y divide-zinc-800 rounded-lg border border-zinc-800 bg-zinc-950/40">
              {stats.overdueTasksList.map((task) => {
                const creatorObj =
                  task.creator || users.find((u) => u.id === task.creator_id) || null
                const creatorName =
                  task.creator_name ||
                  (creatorObj ? getUserFullName(creatorObj) : `Użytkownik #${task.creator_id}`)
                const statusName =
                  task.status_name ||
                  task.status?.name ||
                  taskStatuses.find((s) => s.id === task.status_id)?.name ||
                  `Status #${task.status_id}`
                const daysOverdue = getDaysOverdue(task.due_date)

                return (
                  <div
                    key={task.id}
                    className="flex flex-col md:flex-row md:items-center justify-between gap-3 p-3.5 hover:bg-zinc-900/70 transition-colors"
                  >
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                        <span className="text-sm font-medium text-zinc-100 truncate">
                          {task.title}
                        </span>
                        <Badge variant={statusVariantMap[task.status_id] || 'secondary'}>
                          {statusName}
                        </Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-zinc-400 pl-4">
                        <span className="inline-flex items-center gap-1 text-red-400 font-medium">
                          <Calendar className="h-3.5 w-3.5" />
                          Termin: {formatDatePl(task.due_date)}
                          {daysOverdue > 0 && ` (+${daysOverdue} dni)`}
                        </span>
                        <span>
                          Twórca: <strong className="text-zinc-300 font-medium">{creatorName}</strong>
                        </span>
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onInspectOverdue?.(task)}
                      className="text-xs text-zinc-300 hover:text-white hover:bg-zinc-800 gap-1.5 shrink-0 self-end md:self-center"
                    >
                      Otwórz w nadzorze
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
