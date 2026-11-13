import { Fragment, useCallback, useEffect, useMemo, useState } from 'react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Code2,
  Loader2,
  ScrollText,
  X,
} from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { dashboardService } from '../../services/dashboardService'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Avatar, RoleBadge } from './DashboardShared'
import {
  extractArray,
  formatDateTimePl,
  getUserFullName,
  parseDetailsJson,
  resolveUserRole,
} from './dashboardUtils'

const KNOWN_ACTIONS = [
  'LOGIN_SUCCESS',
  'LOGIN_FAILED',
  'LOGOUT',
  'TASK_CREATED',
  'TASK_UPDATED',
  'TASK_STATUS_CHANGED',
  'TASK_DELETED',
  'TASK_RESTORED',
  'TASK_ASSIGNED',
  'ASSIGNMENT_UPDATED',
  'USER_CREATED',
  'USER_UPDATED',
  'ROLE_CHANGED',
  'USER_DEACTIVATED',
  'PROFILE_UPDATED',
  'PREFERENCES_UPDATED',
  'PASSWORD_CHANGED',
]

function getActionBadgeClass(action = '') {
  const upper = String(action).toUpperCase()
  if (upper.includes('FAIL') || upper.includes('DELETE') || upper.includes('DEACTIVATE') || upper.includes('REJECT')) {
    return 'border-red-800/70 bg-red-950/50 text-red-300'
  }
  if (upper.includes('CREATE') || upper.includes('RESTORE') || upper.includes('SUCCESS') || upper.includes('ACCEPT')) {
    return 'border-emerald-800/70 bg-emerald-950/50 text-emerald-300'
  }
  if (upper.includes('UPDATE') || upper.includes('CHANGE') || upper.includes('STATUS') || upper.includes('ASSIGN')) {
    return 'border-sky-800/70 bg-sky-950/50 text-sky-300'
  }
  return 'border-zinc-700 bg-zinc-800 text-zinc-300'
}

const PAGE_LIMIT = 20

export function AuditLogPanel({ refreshSignal }) {
  const { users, roles } = useAppContext()

  const [actionFilter, setActionFilter] = useState('all')
  const [actorFilter, setActorFilter] = useState('all')
  const [page, setPage] = useState(1)

  const [logs, setLogs] = useState([])
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [expandedIds, setExpandedIds] = useState({})

  const loadLogs = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = {
        action: actionFilter !== 'all' ? actionFilter : undefined,
        actor_id: actorFilter !== 'all' ? Number(actorFilter) : undefined,
        page,
        limit: PAGE_LIMIT,
      }
      const res = await dashboardService.getAuditLogs(params)
      const list = extractArray(res, ['logs', 'audit_logs', 'items', 'data'])
      const totalCount = Number(
        res?.total ?? res?.pagination?.total ?? (Array.isArray(res) ? res.length : list.length)
      )
      const computedPages = Math.max(
        1,
        Number(res?.total_pages ?? res?.pagination?.total_pages ?? Math.ceil(totalCount / PAGE_LIMIT))
      )

      setLogs(list)
      setTotal(totalCount)
      setTotalPages(computedPages)
    } catch (err) {
      setError(err?.message || 'Nie udało się pobrać dziennika audytu.')
    } finally {
      setIsLoading(false)
    }
  }, [actionFilter, actorFilter, page])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (!cancelled) {
        await loadLogs()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadLogs, refreshSignal])

  const availableActions = useMemo(() => {
    const set = new Set(KNOWN_ACTIONS)
    logs.forEach((log) => {
      if (log.action) set.add(log.action)
    })
    return Array.from(set)
  }, [logs])

  const toggleDetails = (logId) => {
    setExpandedIds((prev) => ({
      ...prev,
      [logId]: !prev[logId],
    }))
  }

  const handleActionChange = (val) => {
    setActionFilter(val)
    setPage(1)
  }

  const handleActorChange = (val) => {
    setActorFilter(val)
    setPage(1)
  }

  const clearFilters = () => {
    setActionFilter('all')
    setActorFilter('all')
    setPage(1)
  }

  const hasFilters = actionFilter !== 'all' || actorFilter !== 'all'

  return (
    <Card className="border-zinc-800 bg-zinc-900">
      <CardHeader className="pb-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <CardTitle className="text-base font-semibold text-zinc-100 flex items-center gap-2">
              <ScrollText className="h-4 w-4 text-zinc-400" />
              Dziennik audytu bezpieczeństwa i operacji
            </CardTitle>
            <CardDescription className="text-xs text-zinc-400 mt-0.5">
              Historia zdarzeń systemowych, logowań, zmian zadań oraz operacji administracyjnych
            </CardDescription>
          </div>
          <span className="text-xs text-zinc-400">
            Łącznie wpisów: <strong className="text-zinc-100">{total}</strong>
          </span>
        </div>

        {/* Filtry */}
        <div className="mt-4 flex flex-wrap items-center gap-2.5">
          <div className="w-full sm:w-64">
            <Select value={actionFilter} onValueChange={handleActionChange}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Filtruj akcję..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszystkie akcje</SelectItem>
                {availableActions.map((act) => (
                  <SelectItem key={act} value={act}>
                    {act}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-64">
            <Select value={actorFilter} onValueChange={handleActorChange}>
              <SelectTrigger className="bg-zinc-950 border-zinc-800">
                <SelectValue placeholder="Filtruj aktora..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Wszyscy użytkownicy</SelectItem>
                {users.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {getUserFullName(u)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={clearFilters}
              className="h-9 text-xs text-zinc-400 hover:text-zinc-100 gap-1"
            >
              <X className="h-3.5 w-3.5" />
              Wyczyść filtry
            </Button>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {error && (
          <div className="rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-xs text-red-300 flex items-center justify-between gap-2">
            <span>{error}</span>
            <Button size="sm" variant="outline" onClick={loadLogs} className="h-7 text-xs">
              Ponów
            </Button>
          </div>
        )}

        <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                <th className="py-3 px-4 whitespace-nowrap">Data i czas</th>
                <th className="py-3 px-4">Aktor</th>
                <th className="py-3 px-4">Akcja</th>
                <th className="py-3 px-4 whitespace-nowrap">Encja</th>
                <th className="py-3 px-4 text-right">Szczegóły</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/80 text-xs">
              {isLoading ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                    Ładowanie wpisów audytu...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-zinc-500">
                    Brak wpisów w dzienniku audytu dla wybranych filtrów.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actorId = log.actor_user_id ?? log.actor_id ?? null
                  const actorObj =
                    log.actor || users.find((u) => u.id === actorId) || null
                  const actorName =
                    log.actor_name ||
                    (actorObj ? getUserFullName(actorObj) : actorId ? `Użytkownik #${actorId}` : 'System / Anonimowy')
                  const actorRole =
                    log.actor_role ||
                    (actorObj ? resolveUserRole(actorObj, roles) : null)

                  const isExpanded = Boolean(expandedIds[log.id])
                  const parsedDetails = parseDetailsJson(
                    log.details ?? log.details_json
                  )
                  const hasDetails =
                    parsedDetails &&
                    typeof parsedDetails === 'object' &&
                    Object.keys(parsedDetails).length > 0

                  return (
                    <Fragment key={log.id}>
                      <tr className="hover:bg-zinc-900/60 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-zinc-400">
                          {formatDateTimePl(log.created_at)}
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <div className="flex items-center gap-2.5">
                            <Avatar
                              user={actorObj || { id: actorId || 0, first_name: actorName }}
                              size="xs"
                            />
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-zinc-200">{actorName}</span>
                              {actorRole && (
                                <RoleBadge
                                  role={actorRole}
                                  className="text-[10px] px-1.5 py-0"
                                />
                              )}
                            </div>
                          </div>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge
                            variant="outline"
                            className={`font-mono text-[11px] ${getActionBadgeClass(log.action)}`}
                          >
                            {log.action}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 whitespace-nowrap font-mono text-[11px] text-zinc-400">
                          <span className="text-zinc-300">{log.entity_type}</span>
                          {log.entity_id != null && (
                            <span className="text-zinc-500"> #{log.entity_id}</span>
                          )}
                        </td>

                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => toggleDetails(log.id)}
                            className="h-7 px-2.5 text-xs text-zinc-300 hover:text-white gap-1"
                          >
                            <Code2 className="h-3.5 w-3.5 text-zinc-400" />
                            Szczegóły
                            {isExpanded ? (
                              <ChevronUp className="h-3.5 w-3.5" />
                            ) : (
                              <ChevronDown className="h-3.5 w-3.5" />
                            )}
                          </Button>
                        </td>
                      </tr>

                      {isExpanded && (
                        <tr className="bg-zinc-950/90">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="rounded-lg border border-zinc-800 bg-zinc-900/90 p-3 space-y-2">
                              <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-400">
                                <span>
                                  IP: <strong className="text-zinc-300 font-mono">{log.ip_address || '—'}</strong>
                                </span>
                                {log.user_agent && (
                                  <span className="truncate max-w-xl font-mono text-[10px] text-zinc-500">
                                    UA: {log.user_agent}
                                  </span>
                                )}
                              </div>
                              <pre className="overflow-x-auto rounded border border-zinc-800 bg-zinc-950 p-2.5 font-mono text-[11px] text-zinc-300 leading-relaxed">
                                {hasDetails
                                  ? JSON.stringify(parsedDetails, null, 2)
                                  : '{}'}
                              </pre>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Paginacja */}
        <div className="flex items-center justify-between pt-1 text-xs text-zinc-400">
          <span>
            Strona <strong className="text-zinc-200">{page}</strong> z{' '}
            <strong className="text-zinc-200">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page <= 1 || isLoading}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="h-8 text-xs border-zinc-800 bg-zinc-950 gap-1"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
              Poprzednia
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={page >= totalPages || isLoading}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="h-8 text-xs border-zinc-800 bg-zinc-950 gap-1"
            >
              Następna
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
