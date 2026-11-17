import { BarChart3, Bug, ChevronDown, LayoutGrid, LogOut, Settings, User } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { useLiveEvents } from '../context/LiveEventsContext'
import { canAccessDashboard } from '../lib/permissions'
import { cn } from '../lib/utils'
import { AddTaskDialog } from './AddTaskDialog'
import { NotificationCenter } from './notifications/NotificationCenter'
import { Avatar } from './shared/Avatar'
import { RoleBadge } from './shared/RoleBadge'
import { Button } from './ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu'

function LiveStatusBadge({ connectionStatus, onRefresh }) {
  let indicator
  let label
  let textColor

  if (connectionStatus === 'connected') {
    indicator = (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
      </span>
    )
    label = 'Na żywo'
    textColor = 'text-emerald-400'
  } else if (connectionStatus === 'connecting') {
    indicator = (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="inline-flex rounded-full h-2 w-2 bg-amber-400 animate-pulse" />
      </span>
    )
    label = 'Łączenie...'
    textColor = 'text-amber-400'
  } else {
    indicator = (
      <span className="relative flex h-2 w-2 shrink-0">
        <span className="inline-flex rounded-full h-2 w-2 bg-red-500" />
      </span>
    )
    label = 'Offline'
    textColor = 'text-red-400'
  }

  return (
    <button
      type="button"
      onClick={onRefresh}
      className="hidden sm:inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs bg-zinc-950/70 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer select-none"
      title="Status synchronizacji w czasie rzeczywistym. Kliknij, aby odświeżyć natychmiast."
    >
      {indicator}
      <span className={cn('text-[11px] font-medium', textColor)}>{label}</span>
    </button>
  )
}

/**
 * TopBar - górny pasek nawigacyjny aplikacji.
 */
export function TopBar({ activeView, onChangeView, onOpenBugReport }) {
  const { user: currentUser, logout } = useAuth()
  const { connectionStatus, refreshNow } = useLiveEvents()
  const showDashboardNav = canAccessDashboard(currentUser)
  const fullName = [currentUser?.first_name, currentUser?.last_name].filter(Boolean).join(' ')

  return (
    <header className="flex items-center justify-between gap-4 px-4 py-2 bg-zinc-900/95 border-b border-zinc-800 shrink-0 backdrop-blur-md">
      {/* Lewa strona: Logo + Nawigacja */}
      <div className="flex items-center gap-4 min-w-0">
        <button
          type="button"
          onClick={() => onChangeView('workspace')}
          className="flex items-center gap-2.5 rounded-lg px-1.5 py-1 hover:bg-zinc-800/70 transition-colors cursor-pointer shrink-0"
        >
          <div className="flex items-center gap-1" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-red-500/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-yellow-400/80" />
            <span className="h-2.5 w-2.5 rounded-full bg-green-500/80" />
          </div>
          <span className="text-sm font-semibold tracking-tight text-zinc-100">TaskFlow</span>
        </button>

        <nav className="flex items-center gap-1" aria-label="Nawigacja główna">
          <button
            type="button"
            onClick={() => onChangeView('workspace')}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
              activeView === 'workspace'
                ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/70'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
            )}
          >
            <LayoutGrid className="h-3.5 w-3.5" />
            <span>Pulpit zadań</span>
          </button>

          {showDashboardNav && (
            <button
              type="button"
              onClick={() => onChangeView('dashboard')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer',
                activeView === 'dashboard'
                  ? 'bg-zinc-800 text-zinc-100 shadow-sm border border-zinc-700/70'
                  : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/50 border border-transparent'
              )}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Dashboard zarządczy</span>
              <span className="sm:hidden">Dashboard</span>
            </button>
          )}
        </nav>
      </div>

      {/* Prawa strona: Wskaźnik na żywo + Powiadomienia + Nowe zadanie + Menu użytkownika */}
      <div className="flex items-center gap-2 shrink-0">
        <LiveStatusBadge connectionStatus={connectionStatus} onRefresh={refreshNow} />

        <NotificationCenter />

        {onOpenBugReport && (
          <Button
            type="button"
            variant="ghost"
            onClick={onOpenBugReport}
            className="h-9 px-2.5 gap-1.5 rounded-lg text-xs text-zinc-300 hover:text-emerald-400 hover:bg-zinc-800/80 border border-zinc-800"
            title="Zgłoś błąd w aplikacji"
          >
            <Bug className="h-3.5 w-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Zgłoś błąd</span>
          </Button>
        )}

        {(activeView === 'workspace' || activeView === 'dashboard') && <AddTaskDialog />}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="ghost"
              className="h-9 px-2 gap-2 rounded-lg hover:bg-zinc-800/80 border border-transparent hover:border-zinc-700/60"
            >
              <Avatar user={currentUser} size="sm" />
              <div className="hidden md:flex flex-col items-start text-left leading-tight">
                <span className="text-xs font-medium text-zinc-100 truncate max-w-[140px]">
                  {fullName || currentUser?.email}
                </span>
                {currentUser?.position?.name && (
                  <span className="text-[11px] text-zinc-400 truncate max-w-[140px]">
                    {currentUser.position.name}
                  </span>
                )}
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-zinc-400" />
            </Button>
          </DropdownMenuTrigger>

          <DropdownMenuContent align="end" className="w-64">
            <div className="px-2.5 py-2 space-y-2">
              <div className="flex items-center gap-2.5">
                <Avatar user={currentUser} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-zinc-100 truncate">
                    {fullName || 'Użytkownik'}
                  </p>
                  {currentUser?.position?.name && (
                    <p className="text-xs text-zinc-400 truncate">{currentUser.position.name}</p>
                  )}
                </div>
              </div>
              <div className="flex items-center justify-between gap-2">
                <RoleBadge role={currentUser?.role} className="text-[11px] px-2 py-0.5" />
                {currentUser?.department?.name && (
                  <span className="text-[11px] text-zinc-500 truncate">
                    {currentUser.department.name}
                  </span>
                )}
              </div>
            </div>

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => onChangeView('profile')}
              className="cursor-pointer gap-2"
            >
              {activeView === 'profile' ? (
                <Settings className="h-4 w-4 text-zinc-400" />
              ) : (
                <User className="h-4 w-4 text-zinc-400" />
              )}
              <span>Profil i ustawienia</span>
            </DropdownMenuItem>

            {showDashboardNav && (
              <DropdownMenuItem
                onSelect={() => onChangeView('dashboard')}
                className="cursor-pointer gap-2"
              >
                <BarChart3 className="h-4 w-4 text-zinc-400" />
                <span>Dashboard zarządczy</span>
              </DropdownMenuItem>
            )}

            {onOpenBugReport && (
              <DropdownMenuItem
                onSelect={onOpenBugReport}
                className="cursor-pointer gap-2"
              >
                <Bug className="h-4 w-4 text-emerald-400" />
                <span>Zgłoś błąd / problem</span>
              </DropdownMenuItem>
            )}

            <DropdownMenuSeparator />

            <DropdownMenuItem
              onSelect={() => {
                void logout()
              }}
              className="cursor-pointer gap-2 text-red-400 focus:text-red-300 focus:bg-red-950/40"
            >
              <LogOut className="h-4 w-4" />
              <span>Wyloguj się</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
