import { useCallback, useEffect, useState } from 'react'
import {
  AlertTriangle,
  Award,
  Briefcase,
  Building2,
  CheckCircle2,
  ClockAlert,
  FilePlus2,
  Loader2,
  Mail,
  RefreshCw,
} from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import { cn } from '../../lib/utils'
import { profileService } from '../../services/profileService'
import { Avatar } from '../shared/Avatar'
import { RoleBadge } from '../shared/RoleBadge'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import { Card, CardContent } from '../ui/card'
import { PasswordChangeForm } from './PasswordChangeForm'
import { ProfileInfoForm } from './ProfileInfoForm'
import { ProfilePreferencesCard } from './ProfilePreferencesCard'

function normalizeStats(data) {
  const raw = data?.stats ?? data ?? {}
  const created = Number(raw.created ?? raw.created_count ?? raw.tasks_created ?? 0) || 0
  const assigned = Number(raw.assigned ?? raw.assigned_count ?? raw.tasks_assigned ?? 0) || 0
  const completed = Number(raw.completed ?? raw.completed_count ?? raw.tasks_completed ?? 0) || 0
  const overdue = Number(raw.overdue ?? raw.overdue_count ?? raw.tasks_overdue ?? 0) || 0

  const rawRate = raw.completion_rate_pct ?? raw.completion_rate
  const completionRate =
    rawRate !== undefined && rawRate !== null
      ? Math.round(Number(rawRate) || 0)
      : assigned > 0
        ? Math.round((completed / assigned) * 100)
        : 0

  return {
    created,
    assigned,
    completed,
    overdue,
    completionRate,
  }
}

export function ProfileView({ onResetDesktopLayout }) {
  const { user } = useAuth()
  const [stats, setStats] = useState(null)
  const [loadingStats, setLoadingStats] = useState(true)
  const [statsError, setStatsError] = useState(null)

  const loadStats = useCallback(async () => {
    setLoadingStats(true)
    setStatsError(null)
    try {
      const data = await profileService.getStats()
      setStats(normalizeStats(data))
    } catch (error) {
      setStatsError(error?.message || 'Nie udało się pobrać statystyk profilu.')
    } finally {
      setLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    let active = true
    ;(async () => {
      try {
        const data = await profileService.getStats()
        if (!active) return
        setStats(normalizeStats(data))
      } catch (error) {
        if (!active) return
        setStatsError(error?.message || 'Nie udało się pobrać statystyk profilu.')
      } finally {
        if (active) {
          setLoadingStats(false)
        }
      }
    })()

    return () => {
      active = false
    }
  }, [])

  const isActive = user?.is_active !== 0 && user?.is_active !== false
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || 'Użytkownik'
  const positionName = user?.position?.name || user?.position_name || 'Brak stanowiska'
  const positionLevel = user?.position?.priority
  const departmentName = user?.department?.name || user?.department_name || 'Brak działu'

  const kpiCards = [
    {
      label: 'Utworzone',
      value: stats?.created ?? 0,
      subtitle: 'Zgłoszone zadania',
      icon: FilePlus2,
      iconClass: 'text-sky-400 bg-sky-950/50 border-sky-800/60',
    },
    {
      label: 'Przypisane',
      value: stats?.assigned ?? 0,
      subtitle: 'Zadania w realizacji i historii',
      icon: Briefcase,
      iconClass: 'text-indigo-400 bg-indigo-950/50 border-indigo-800/60',
    },
    {
      label: 'Ukończone',
      value: stats?.completed ?? 0,
      subtitle: `${stats?.completionRate ?? 0}% realizacji`,
      icon: CheckCircle2,
      iconClass: 'text-emerald-400 bg-emerald-950/50 border-emerald-800/60',
      badge: `${stats?.completionRate ?? 0}%`,
    },
    {
      label: 'Po terminie',
      value: stats?.overdue ?? 0,
      subtitle: (stats?.overdue ?? 0) > 0 ? 'Wymagają uwagi' : 'Wszystko na czas',
      icon: ClockAlert,
      iconClass:
        (stats?.overdue ?? 0) > 0
          ? 'text-red-400 bg-red-950/50 border-red-800/60'
          : 'text-zinc-400 bg-zinc-800/70 border-zinc-700/60',
      highlightDanger: (stats?.overdue ?? 0) > 0,
    },
  ]

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 p-4 sm:p-6">
      {/* Karta tożsamości użytkownika */}
      <Card className="border-zinc-800 bg-zinc-900/95 shadow-xl">
        <CardContent className="p-6">
          <div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
              <Avatar user={user} size="xl" />
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2.5">
                  <h1 className="text-xl font-semibold tracking-tight text-zinc-100">
                    {fullName}
                  </h1>
                  <Badge
                    variant="outline"
                    className={cn(
                      'gap-1.5 text-xs',
                      isActive
                        ? 'border-emerald-800/80 bg-emerald-950/50 text-emerald-300'
                        : 'border-red-800/80 bg-red-950/50 text-red-300'
                    )}
                  >
                    <span
                      className={cn(
                        'h-1.5 w-1.5 rounded-full',
                        isActive ? 'bg-emerald-400' : 'bg-red-400'
                      )}
                    />
                    {isActive ? 'Konto aktywne' : 'Konto nieaktywne'}
                  </Badge>
                </div>

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-zinc-400">
                  <span className="inline-flex items-center gap-1.5">
                    <Mail className="h-3.5 w-3.5 text-zinc-500" />
                    {user?.email}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-zinc-500" />
                    {departmentName}
                    {user?.department?.code ? ` (${user.department.code})` : ''}
                  </span>
                </div>

                {user?.bio && (
                  <p className="max-w-2xl text-xs leading-relaxed text-zinc-400">
                    {user.bio}
                  </p>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2 md:flex-col md:items-end">
              <RoleBadge role={user?.role} />
              <Badge
                variant="outline"
                className="gap-1.5 border-zinc-700 bg-zinc-800/80 text-zinc-200"
              >
                <Award className="h-3 w-3 text-amber-400" />
                <span>{positionName}</span>
                {typeof positionLevel === 'number' && (
                  <span className="text-zinc-400">• Poziom {positionLevel}</span>
                )}
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Statystyki osobiste KPI */}
      <section aria-label="Osobiste statystyki zadań" className="space-y-3">
        {statsError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-amber-800/70 bg-amber-950/30 px-4 py-2.5 text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-amber-400" />
              <span>{statsError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={loadStats}
              className="h-7 gap-1.5 border-amber-800/70 text-xs hover:bg-amber-900/40"
            >
              <RefreshCw className="h-3 w-3" />
              Ponów
            </Button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {kpiCards.map((card) => {
            const Icon = card.icon
            return (
              <Card
                key={card.label}
                className={cn(
                  'border-zinc-800 bg-zinc-900/95',
                  card.highlightDanger && 'border-red-900/70'
                )}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-zinc-400">{card.label}</p>
                      <div className="flex items-baseline gap-2">
                        {loadingStats ? (
                          <Loader2 className="my-1 h-5 w-5 animate-spin text-zinc-500" />
                        ) : (
                          <span
                            className={cn(
                              'text-2xl font-bold tracking-tight',
                              card.highlightDanger ? 'text-red-300' : 'text-zinc-100'
                            )}
                          >
                            {card.value}
                          </span>
                        )}
                        {!loadingStats && card.badge && (
                          <Badge
                            variant="outline"
                            className="border-emerald-800/70 bg-emerald-950/50 text-[11px] text-emerald-300"
                          >
                            {card.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-[11px] text-zinc-500">{card.subtitle}</p>
                    </div>

                    <div
                      className={cn(
                        'flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border',
                        card.iconClass
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </section>

      {/* Siatka 2-kolumnowa formularzy i preferencji */}
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <ProfileInfoForm />
        <div className="space-y-6">
          <ProfilePreferencesCard onResetDesktopLayout={onResetDesktopLayout} />
          <PasswordChangeForm />
        </div>
      </div>
    </div>
  )
}
