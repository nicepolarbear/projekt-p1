import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Briefcase,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  ShieldAlert,
  UserCheck,
  UserX,
  Users,
  X,
} from 'lucide-react'
import { useAppContext } from '../../context/AppContext'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../hooks/useToast'
import { ROLE_META } from '../../lib/constants'
import { canEditEmployeePosition, canManageUsers } from '../../lib/permissions'
import { usersService } from '../../services/usersService'
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '../ui/tooltip'
import { CreateEditUserDialog } from './CreateEditUserDialog'
import { Avatar, RoleBadge } from './DashboardShared'
import {
  extractArray,
  formatDatePl,
  isUserActive,
  resolveUserRole,
} from './dashboardUtils'

const DEFAULT_ROLES = [
  { id: 1, name: 'admin' },
  { id: 2, name: 'dyrektor' },
  { id: 3, name: 'kierownik' },
  { id: 4, name: 'pracownik' },
]

export function UserManagementPanel({ refreshSignal, onUserMutated }) {
  const { user: authUser } = useAuth()
  const {
    currentUser: ctxUser,
    roles,
    positions,
    departments,
  } = useAppContext()
  const { toast } = useToast()

  const currentUser = authUser || ctxUser
  const rolesList = roles.length > 0 ? roles : DEFAULT_ROLES

  const isAdmin = canManageUsers(currentUser)
  const isDirector = currentUser?.role === 'dyrektor'

  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [positionFilter, setPositionFilter] = useState('all')
  const [activeFilter, setActiveFilter] = useState('all')

  const [usersList, setUsersList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState(null)
  const [togglingId, setTogglingId] = useState(null)

  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingUser, setEditingUser] = useState(null)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search.trim())
    }, 250)
    return () => clearTimeout(timer)
  }, [search])

  const loadUsers = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const params = {
        search: debouncedSearch || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
        position_id: positionFilter !== 'all' ? Number(positionFilter) : undefined,
        is_active: activeFilter !== 'all' ? activeFilter : undefined,
      }
      const res = await usersService.getAdminUsers(params)
      const list = extractArray(res, ['users', 'items', 'data'])
      setUsersList(list)
    } catch (err) {
      setError(err?.message || 'Nie udało się pobrać listy użytkowników.')
    } finally {
      setIsLoading(false)
    }
  }, [debouncedSearch, roleFilter, positionFilter, activeFilter])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      await Promise.resolve()
      if (!cancelled) {
        await loadUsers()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [loadUsers, refreshSignal])

  const metrics = useMemo(() => {
    const total = usersList.length
    const active = usersList.filter((u) => isUserActive(u)).length
    const inactive = total - active
    const managers = usersList.filter((u) => {
      const r = resolveUserRole(u, rolesList)
      return r === 'admin' || r === 'dyrektor' || r === 'kierownik'
    }).length
    return { total, active, inactive, managers }
  }, [usersList, rolesList])

  const handleOpenCreate = () => {
    setEditingUser(null)
    setDialogOpen(true)
  }

  const handleOpenEdit = (targetUser) => {
    setEditingUser(targetUser)
    setDialogOpen(true)
  }

  const handleToggleActive = async (targetUser) => {
    if (!isAdmin || targetUser.id === currentUser?.id) return
    const currentlyActive = isUserActive(targetUser)
    setTogglingId(targetUser.id)
    try {
      if (currentlyActive) {
        await usersService.deactivateUser(targetUser.id)
        toast({
          title: 'Konto dezaktywowane',
          description: `${targetUser.first_name} ${targetUser.last_name} nie może się już logować.`,
        })
      } else {
        await usersService.updateUser(targetUser.id, { is_active: true })
        toast({
          title: 'Konto aktywowane',
          description: `Przywrócono dostęp dla ${targetUser.first_name} ${targetUser.last_name}.`,
        })
      }
      await loadUsers()
      onUserMutated?.()
    } catch (err) {
      toast({
        title: 'Błąd zmiany statusu konta',
        description: err?.message || 'Nie udało się zaktualizować statusu użytkownika.',
        variant: 'destructive',
      })
    } finally {
      setTogglingId(null)
    }
  }

  const hasActiveFilters = Boolean(
    search.trim() || roleFilter !== 'all' || positionFilter !== 'all' || activeFilter !== 'all'
  )

  const clearFilters = () => {
    setSearch('')
    setDebouncedSearch('')
    setRoleFilter('all')
    setPositionFilter('all')
    setActiveFilter('all')
  }

  return (
    <TooltipProvider delayDuration={150}>
      <div className="space-y-4">
        {/* Mini-metryki zespołu */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zinc-400">Widocznych kont</p>
              <p className="text-xl font-bold text-zinc-100 mt-0.5">{metrics.total}</p>
            </div>
            <Users className="h-5 w-5 text-zinc-500" />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zinc-400">Aktywnych</p>
              <p className="text-xl font-bold text-emerald-300 mt-0.5">{metrics.active}</p>
            </div>
            <UserCheck className="h-5 w-5 text-emerald-500/80" />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zinc-400">Nieaktywnych</p>
              <p className="text-xl font-bold text-zinc-300 mt-0.5">{metrics.inactive}</p>
            </div>
            <UserX className="h-5 w-5 text-zinc-500" />
          </div>
          <div className="rounded-xl border border-zinc-800 bg-zinc-900 p-3.5 flex items-center justify-between">
            <div>
              <p className="text-[11px] text-zinc-400">Kadra zarządzająca</p>
              <p className="text-xl font-bold text-amber-300 mt-0.5">{metrics.managers}</p>
            </div>
            <Briefcase className="h-5 w-5 text-amber-500/80" />
          </div>
        </div>

        <Card className="border-zinc-800 bg-zinc-900">
          <CardHeader className="pb-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base font-semibold text-zinc-100">
                  Zespół i zarządzanie użytkownikami
                </CardTitle>
                <CardDescription className="text-xs text-zinc-400 mt-0.5">
                  {isAdmin
                    ? 'Pełna administracja kontami, rolami, stanowiskami oraz bezpieczeństwem dostępu.'
                    : 'Podgląd zespołu i edycja stanowisk/działów dla kierowników oraz pracowników.'}
                </CardDescription>
              </div>

              {isAdmin ? (
                <Button onClick={handleOpenCreate} size="sm" className="gap-1.5 shrink-0">
                  <Plus className="h-4 w-4" />
                  Dodaj użytkownika
                </Button>
              ) : (
                <div className="inline-flex items-center gap-1.5 rounded-lg border border-amber-900/60 bg-amber-950/30 px-3 py-1.5 text-xs text-amber-300">
                  <ShieldAlert className="h-3.5 w-3.5 shrink-0" />
                  Tryb Dyrektora — tworzenie kont i zmiana ról wymaga Administratora
                </div>
              )}
            </div>

            {/* Filtry */}
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-2.5">
              <div className="relative lg:col-span-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-zinc-500" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Szukaj po imieniu, nazwisku lub e-mailu..."
                  className="pl-8 bg-zinc-950 border-zinc-800"
                />
              </div>

              <div className="lg:col-span-3">
                <Select value={roleFilter} onValueChange={setRoleFilter}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Rola" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie role</SelectItem>
                    {rolesList.map((r) => (
                      <SelectItem key={r.id} value={r.name}>
                        {ROLE_META[r.name]?.label || r.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-3">
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Stanowisko" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie stanowiska</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)}>
                        {p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="lg:col-span-2 flex items-center gap-2">
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="bg-zinc-950 border-zinc-800">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Wszystkie konta</SelectItem>
                    <SelectItem value="true">Aktywne</SelectItem>
                    <SelectItem value="false">Nieaktywne</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    type="button"
                    size="icon"
                    variant="ghost"
                    onClick={clearFilters}
                    title="Wyczyść filtry"
                    className="h-9 w-9 shrink-0 text-zinc-400 hover:text-zinc-100"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                )}
              </div>
            </div>
          </CardHeader>

          <CardContent>
            {error && (
              <div className="mb-4 rounded-lg border border-red-900/70 bg-red-950/30 p-3 text-xs text-red-300 flex items-center justify-between gap-2">
                <span>{error}</span>
                <Button size="sm" variant="outline" onClick={loadUsers} className="h-7 text-xs">
                  Ponów
                </Button>
              </div>
            )}

            <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950/50">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-zinc-800 bg-zinc-900/80 text-[11px] font-semibold uppercase tracking-wider text-zinc-400">
                    <th className="py-3 px-4">Użytkownik</th>
                    <th className="py-3 px-4">Rola</th>
                    <th className="py-3 px-4">Stanowisko i dział</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 whitespace-nowrap">Ostatnie logowanie</th>
                    <th className="py-3 px-4 text-right">Akcje</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80 text-xs">
                  {isLoading ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        <Loader2 className="h-5 w-5 animate-spin mx-auto mb-2 text-zinc-400" />
                        Ładowanie listy użytkowników...
                      </td>
                    </tr>
                  ) : usersList.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-12 text-center text-zinc-500">
                        Brak użytkowników pasujących do wybranych filtrów.
                      </td>
                    </tr>
                  ) : (
                    usersList.map((u) => {
                      const roleName = resolveUserRole(u, rolesList)
                      const active = isUserActive(u)
                      const isSelf = u.id === currentUser?.id
                      const posName =
                        u.position?.name ||
                        u.position_name ||
                        positions.find((p) => p.id === u.position_id)?.name ||
                        '—'
                      const deptObj =
                        u.department || departments.find((d) => d.id === u.department_id) || null
                      const deptLabel = deptObj
                        ? `${deptObj.name} (${deptObj.code})`
                        : u.department_name || '—'

                      const directorCanEditRow =
                        isDirector && canEditEmployeePosition(currentUser, { ...u, role: roleName })

                      return (
                        <tr key={u.id} className="hover:bg-zinc-900/60 transition-colors">
                          {/* Użytkownik */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-3">
                              <Avatar user={u} size="sm" />
                              <div className="min-w-0">
                                <div className="flex items-center gap-2">
                                  <span className="font-medium text-zinc-100 truncate">
                                    {u.first_name} {u.last_name}
                                  </span>
                                  {isSelf && (
                                    <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-zinc-700 text-zinc-400">
                                      To Ty
                                    </Badge>
                                  )}
                                </div>
                                <p className="text-[11px] text-zinc-500 truncate">{u.email}</p>
                              </div>
                            </div>
                          </td>

                          {/* Rola */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="inline-flex items-center gap-1.5">
                              <RoleBadge role={roleName} />
                              {!isAdmin && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span className="text-zinc-600 cursor-help">
                                      <Lock className="h-3 w-3" />
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    Zmiana roli wymaga roli Administratora
                                  </TooltipContent>
                                </Tooltip>
                              )}
                            </div>
                          </td>

                          {/* Stanowisko i dział */}
                          <td className="py-3 px-4">
                            <p className="text-zinc-200 font-medium">{posName}</p>
                            <p className="text-[11px] text-zinc-500">{deptLabel}</p>
                          </td>

                          {/* Status */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            {active ? (
                              <Badge variant="assign-accepted" className="text-[11px]">
                                Aktywny
                              </Badge>
                            ) : (
                              <Badge variant="assign-rejected" className="text-[11px]">
                                Nieaktywny
                              </Badge>
                            )}
                          </td>

                          {/* Ostatnie logowanie */}
                          <td className="py-3 px-4 whitespace-nowrap text-zinc-400">
                            {formatDatePl(u.last_login_at)}
                          </td>

                          {/* Akcje */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="inline-flex items-center justify-end gap-1.5">
                              {isAdmin ? (
                                <>
                                  <Button
                                    type="button"
                                    size="sm"
                                    variant="outline"
                                    onClick={() => handleOpenEdit(u)}
                                    className="h-7 px-2.5 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 gap-1"
                                  >
                                    <Pencil className="h-3 w-3" />
                                    Edytuj
                                  </Button>

                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span tabIndex={isSelf ? 0 : undefined}>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="ghost"
                                          disabled={isSelf || togglingId === u.id}
                                          onClick={() => handleToggleActive(u)}
                                          className={`h-7 px-2.5 text-xs gap-1 ${
                                            active
                                              ? 'text-zinc-400 hover:text-red-400 hover:bg-red-950/30'
                                              : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-950/30'
                                          }`}
                                        >
                                          {togglingId === u.id ? (
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                          ) : active ? (
                                            <UserX className="h-3 w-3" />
                                          ) : (
                                            <UserCheck className="h-3 w-3" />
                                          )}
                                          {active ? 'Dezaktywuj' : 'Aktywuj'}
                                        </Button>
                                      </span>
                                    </TooltipTrigger>
                                    {isSelf && (
                                      <TooltipContent>
                                        Nie możesz dezaktywować własnego konta
                                      </TooltipContent>
                                    )}
                                  </Tooltip>
                                </>
                              ) : directorCanEditRow ? (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={() => handleOpenEdit(u)}
                                  className="h-7 px-2.5 text-xs border-zinc-700 bg-zinc-900 hover:bg-zinc-800 gap-1"
                                >
                                  <Pencil className="h-3 w-3" />
                                  Stanowisko / dział
                                </Button>
                              ) : (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <span tabIndex={0}>
                                      <Button
                                        type="button"
                                        size="sm"
                                        variant="outline"
                                        disabled
                                        className="h-7 px-2.5 text-xs border-zinc-800 text-zinc-500 gap-1"
                                      >
                                        <Lock className="h-3 w-3" />
                                        Zablokowane
                                      </Button>
                                    </span>
                                  </TooltipTrigger>
                                  <TooltipContent>Wymaga roli Administratora</TooltipContent>
                                </Tooltip>
                              )}
                            </div>
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

        <CreateEditUserDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          user={editingUser}
          currentUser={currentUser}
          roles={rolesList}
          positions={positions}
          departments={departments}
          onSaved={() => {
            loadUsers()
            onUserMutated?.()
          }}
        />
      </div>
    </TooltipProvider>
  )
}
