import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  Loader2,
  RotateCcw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { useToast } from '../../hooks/useToast'
import { priorityVariantMap } from '../../lib/constants'
import { dashboardService } from '../../services/dashboardService'
import { tasksService } from '../../services/tasksService'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import { Input } from '../ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Avatar } from './DashboardShared'
import {
  extractArray,
  formatDatePl,
  getAssignmentStatusMeta,
  getUserFullName,
  isTaskOverdue,
} from './dashboardUtils'

const DEFAULT_STATUSES = [
  { id: 1, name: 'Do zrobienia' },
  { id: 2, name: 'W trakcie' },
  { id: 3, name: 'Zrobione' },
  { id: 4, name: 'Anulowane' },
]

const DEFAULT_PRIORITIES = [
  { id: 1, name: 'Niski', level: 1 },
  { id: 2, name: 'Normalny', level: 2 },
  { id: 3, name: 'Wysoki', level: 3 },
  { id: 4, name: 'Pilny', level: 4 },
]

export function TaskOversightPanel({ filterPreset, refreshSignal, onTaskMutated }) {
  const { taskStatuses, priorities, users, getAssignees } = useAppContext()
  const { toast } = useToast()

  const statusesList = taskStatuses.length > 0 ? taskStatuses : DEFAULT_STATUSES
  const prioritiesList = priorities.length > 0 ? priorities : DEFAULT_PRIORITIES

  const initialSearch = filterPreset?.search ?? ''
  const initialAssignee =
    filterPreset?.employeeId !== undefined &&
    filterPreset.employeeId !== 'all' &&
    filterPreset.employeeId != null
      ? String(filterPreset.employeeId)
      : 'all'

  const [search, setSearch] = useState(initialSearch)
  const [debouncedSearch, setDebouncedSearch] = useState(initialSearch)
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [assigneeFilter, setAssigneeFilter] = useState(initialAssignee)
  const [overdueOnly, setOverdueOnly] = useState(Boolean(filterPreset?.overdueOnly))
  const [inTrash, setInTrash] = useState(Boolean(filterPreset?.inTrash))

  const [tasks, setTasks] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [mutatingTaskIds, setMutatingTaskIds] = useState({})

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const loadTasks = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = {
        search: debouncedSearch || undefined,
        status_id: statusFilter !== 'all' ? Number(statusFilter) : undefined,
        priority_id: priorityFilter !== 'all' ? Number(priorityFilter) : undefined,
        assignee_id: assigneeFilter !== 'all' ? Number(assigneeFilter) : undefined,
        overdue_only: overdueOnly ? 'true' : undefined,
        in_trash: inTrash ? 'true' : undefined,
      }
      const res = await dashboardService.getDashboardTasks(params)
      const list = extractArray(res, ['tasks', 'items', 'data'])
      setTasks(list)
    } catch (err) {
      setError(err?.message || 'Nie udało się pobrać listy zadań.')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, statusFilter, priorityFilter, assigneeFilter, overdueOnly, inTrash])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (!cancelled) {
        await loadTasks()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadTasks, refreshSignal])

  const setTaskMutating = (taskId, active) => {
    setMutatingTaskIds((prev) => {
      const next = { ...prev }
      if (active) {
        next[taskId] = true
      } else {
        delete next[taskId]
      }
      return next
    })
  }

  const handleStatusChange = async (taskId, nextStatusStr) => {
    const nextStatusId = Number(nextStatusStr)
    const previousTasks = tasks
    setTaskMutating(taskId, true)
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status_id: nextStatusId } : t))
    )

    try {
      await tasksService.updateTaskStatus(taskId, nextStatusId)
      toast({
        title: 'Status zaktualizowany',
        description: 'Zmiana statusu zadania została zapisana.',
      })
      onTaskMutated?.()
      await loadTasks()
    } catch (err) {
      setTasks(previousTasks)
      toast({
        title: 'Błąd zmiany statusu',
        description: err?.message || 'Nie udało się zaktualizować statusu zadania.',
        variant: 'destructive',
      })
    } finally {
      setTaskMutating(taskId, false)
    }
  }

  const handleDeleteTask = async (taskId) => {
    setTaskMutating(taskId, true)
    try {
      await tasksService.deleteTask(taskId)
      toast({
        title: 'Zadanie przeniesione do kosza',
        description: 'Zadanie zostało oznaczone jako usunięte.',
      })
      onTaskMutated?.()
      await loadTasks()
    } catch (err) {
      toast({
        title: 'Błąd usuwania zadania',
        description: err?.message || 'Nie udało się przenieść zadania do kosza.',
        variant: 'destructive',
      })
    } finally {
      setTaskMutating(taskId, false)
    }
  }

  const handleRestoreTask = async (taskId) => {
    setTaskMutating(taskId, true)
    try {
      await tasksService.restoreTask(taskId)
      toast({
        title: 'Zadanie przywrócone',
        description: 'Zadanie zostało przywrócone z kosza.',
      })
      onTaskMutated?.()
      await loadTasks()
    } catch (err) {
      toast({
        title: 'Błąd przywracania zadania',
        description: err?.message || 'Nie udało się przywrócić zadania.',
        variant: 'destructive',
      })
    } finally {
      setTaskMutating(taskId, false)
    }
  }

  const hasActiveFilters = useMemo(
    () =>
      Boolean(
        search.trim() ||
          statusFilter !== 'all' ||
          priorityFilter !== 'all' ||
          assigneeFilter !== 'all' ||
          overdueOnly ||
          inTrash
      ),
    [search, statusFilter, priorityFilter, assigneeFilter, overdueOnly, inTrash]
  )

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setStatusFilter('all')
    setPriorityFilter('all')
    setAssigneeFilter('all')
    setOverdueOnly(false)
    setInTrash(false)
  }

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-zinc-100">
              Nadzór zadań w organizacji
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 mt-0.5">
              Globalny widok wszystkich zadań z możliwością szybkiej zmiany statusu, filtrowania i przywracania z kosza
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-400">
            <span>
              Wyników: <strong className="text-zinc-100">{tasks.length}</strong>
            </span>
          </div>
        </div>

        {/* Pasek filtrów */}
        <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
          <div className="relative lg:col-span-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Szukaj po tytule lub opisie..."
              className="pl-8 bg-zinc-950 border-zinc-800"
            />
          </div>

          <div className="lg:col-span-2">
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie statusy</SelectItem>
                {statusesList.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Priorytet" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie priorytety</SelectItem>
                {prioritiesList.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-2">
            <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Wykonawca" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy wykonawcy</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {getUserFullName(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="lg:col-span-3 flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant={overdueOnly ? 'destructive' : 'outline'}
              onClick={() => setOverdueOnly((v) => !v)}
              className={`h-9 text-xs gap-1.5 ${
                overdueOnly
                  ? 'bg-red-900/60 border-red-700 text-red-100 hover:bg-red-900/80'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-300'
              }`}
            >
              <AlertTriangle className="h-3.5 w-3.5" />
              Po terminie
            </Button>

            <Button
              type="button"
              size="sm"
              variant={inTrash ? 'secondary' : 'outline'}
              onClick={() => setInTrash((v) => !v)}
              className={`h-9 text-xs gap-1.5 ${
                inTrash
                  ? 'bg-zinc-700 text-zinc-100 border-zinc-600'
                  : 'border-zinc-800 bg-zinc-950 text-zinc-300'
              }`}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Kosz
            </Button>

            {hasActiveFilters && (
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={clearFilters}
                className="h-9 text-xs text-zinc-400 hover:text-zinc-100 px-2"
                title="Wyczyść wszystkie filtry"
              >
                <X className="h-3.5 w-3.5 mr-1" />
                Reset
              </Button>
            )}
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {error && (
          <div className="mb-4 rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-xs text-red-300 flex items-center justify-between gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadTasks} className="h-7 text-xs">
              Ponów
            </Button>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4">Zadanie</th>
                <th className="py-3 px-4">Twórca</th>
                <th className="py-3 px-4 min-w-[165px]">Status</th>
                <th className="py-3 px-4">Priorytet</th>
                <th className="py-3 px-4 min-w-[220px]">Przypisani wykonawcy</th>
                <th className="py-3 px-4 whitespace-nowrap">Termin</th>
                <th className="py-3 px-4 text-right">Akcje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Ładowanie zadań...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-zinc-500">
                    Brak zadań spełniających wybrane kryteria.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const isDeleted = task.deleted_at != null
                  const overdue = isTaskOverdue(task)
                  const isBusy = Boolean(mutatingTaskIds[task.id])

                  const creator =
                    task.creator || users.find((u) => u.id === task.creator_id) || null
                  const creatorName =
                    task.creator_name ||
                    (creator ? getUserFullName(creator) : `ID #${task.creator_id}`)

                  const rawAssignees = Array.isArray(task.assignments)
                    ? task.assignments
                    : getAssignees(task.id)

                  const resolvedAssignees = rawAssignees.map((a) => {
                    const emp =
                      a.user ||
                      a.employee ||
                      users.find((u) => u.id === (a.employee_id ?? a.user_id)) ||
                      null
                    const name =
                      a.employee_name ||
                      (emp ? getUserFullName(emp) : `Pracownik #${a.employee_id ?? '?'}`)
                    return {
                      ...a,
                      emp,
                      name,
                      statusMeta: getAssignmentStatusMeta(a.assignment_status),
                    }
                  })

                  const maxPriorityId =
                    task.priority_id ??
                    task.max_priority_id ??
                    resolvedAssignees.reduce(
                      (max, a) => Math.max(max, Number(a.priority_id) || 0),
                      0
                    )
                  const priorityObj = prioritiesList.find((p) => p.id === maxPriorityId) || null

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-zinc-900/60 transition-colors ${
                        isDeleted ? 'opacity-75' : ''
                      }`}
                    >
                      {/* Zadanie */}
                      <td className="py-3 px-4 max-w-[280px]">
                        <div className="flex items-start gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-100 truncate">
                                {task.title}
                              </span>
                              {isDeleted && (
                                <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
                                  Kosz
                                </Badge>
                              )}
                            </div>
                            {task.short_desc && (
                              <p className="text-[11px] text-zinc-500 line-clamp-1 mt-0.5">
                                {task.short_desc}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Twórca */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Avatar user={creator || { id: task.creator_id, first_name: creatorName }} size="xs" />
                          <span className="text-zinc-300">{creatorName}</span>
                        </div>
                      </td>

                      {/* Inline status Select */}
                      <td className="py-3 px-4">
                        <Select
                          value={String(task.status_id)}
                          disabled={isBusy || isDeleted}
                          onValueChange={(val) => handleStatusChange(task.id, val)}
                        >
                          <SelectTrigger className="h-8 text-xs bg-zinc-900 border-zinc-700">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statusesList.map((s) => (
                              <SelectItem key={s.id} value={String(s.id)}>
                                {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>

                      {/* Priorytet */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {priorityObj ? (
                          <Badge variant={priorityVariantMap[priorityObj.id] || 'secondary'}>
                            {priorityObj.name}
                          </Badge>
                        ) : (
                          <span className="text-zinc-500">—</span>
                        )}
                      </td>

                      {/* Przypisani wykonawcy */}
                      <td className="py-3 px-4">
                        {resolvedAssignees.length === 0 ? (
                          <span className="text-zinc-500 italic">Brak przypisań</span>
                        ) : (
                          <div className="flex flex-wrap gap-1.5">
                            {resolvedAssignees.map((a, idx) => (
                              <span
                                key={`${task.id}-${a.employee_id ?? idx}`}
                                title={
                                  a.assignment_status === 'rejected' && a.rejection_reason
                                    ? `Powód odrzucenia: ${a.rejection_reason}`
                                    : `${a.name} — ${a.statusMeta.label}`
                                }
                                className="inline-flex items-center gap-1 rounded-md border border-zinc-800 bg-zinc-900 px-1.5 py-0.5 text-[11px] text-zinc-300"
                              >
                                <span className="truncate max-w-[110px]">{a.name}</span>
                                <Badge
                                  variant={a.statusMeta.variant}
                                  className="text-[10px] px-1.5 py-0 leading-4"
                                >
                                  {a.statusMeta.label}
                                </Badge>
                              </span>
                            ))}
                          </div>
                        )}
                      </td>

                      {/* Termin */}
                      <td className="py-3 px-4 whitespace-nowrap">
                        {task.due_date ? (
                          <span
                            className={`inline-flex items-center gap-1.5 ${
                              overdue ? 'text-red-400 font-semibold' : 'text-zinc-400'
                            }`}
                          >
                            {overdue ? (
                              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                            ) : (
                              <Calendar className="h-3.5 w-3.5 text-zinc-500 shrink-0" />
                            )}
                            {formatDatePl(task.due_date)}
                          </span>
                        ) : (
                          <span className="text-zinc-500">Brak terminu</span>
                        )}
                      </td>

                      {/* Akcje */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {isDeleted ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={isBusy}
                            onClick={() => handleRestoreTask(task.id)}
                            className="h-7 px-2.5 text-xs border-emerald-800/70 text-emerald-300 hover:bg-emerald-950/50 hover:text-emerald-200 gap-1"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RotateCcw className="h-3.5 w-3.5" />
                            )}
                            Przywróć
                          </Button>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            disabled={isBusy}
                            onClick={() => handleDeleteTask(task.id)}
                            title="Przenieś zadanie do kosza"
                            className="h-7 px-2.5 text-xs text-zinc-400 hover:text-red-400 hover:bg-red-950/30 gap-1"
                          >
                            {isBusy ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="h-3.5 w-3.5" />
                            )}
                            Usuń
                          </Button>
                        )}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
