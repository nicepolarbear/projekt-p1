import {
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileEdit,
  PlusCircle,
  RotateCcw,
  Sparkles,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react'
import { useState } from 'react'
import { useLiveEvents } from '../../context/LiveEventsContext'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu'

function getRelativeTime(isoString) {
  if (!isoString) return ''
  const date = new Date(isoString)
  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffSec < 10) return 'przed chwilą'
  if (diffSec < 60) return `${diffSec} sek. temu`
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} min temu`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} godz. temu`
  return date.toLocaleDateString('pl-PL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getEventIcon(eventType) {
  switch (eventType) {
    case 'TASK_CREATED':
      return <PlusCircle className="h-4 w-4 text-blue-400 shrink-0" />
    case 'TASK_STATUS_CHANGED':
      return <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
    case 'TASK_ASSIGNED':
      return <UserPlus className="h-4 w-4 text-purple-400 shrink-0" />
    case 'TASK_DELETED':
      return <Trash2 className="h-4 w-4 text-red-400 shrink-0" />
    case 'TASK_RESTORED':
      return <RotateCcw className="h-4 w-4 text-cyan-400 shrink-0" />
    case 'ASSIGNMENT_ACCEPTED':
      return <Check className="h-4 w-4 text-emerald-400 shrink-0" />
    case 'ASSIGNMENT_REJECTED':
      return <X className="h-4 w-4 text-rose-400 shrink-0" />
    default:
      return <FileEdit className="h-4 w-4 text-indigo-400 shrink-0" />
  }
}

export function NotificationCenter() {
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    triggerOpenTask,
    permissionStatus,
    requestNotificationPermission,
  } = useLiveEvents()

  const [isOpen, setIsOpen] = useState(false)

  const handleItemClick = (item) => {
    markAsRead(item.id)
    if (item.taskId) {
      triggerOpenTask(item.taskId)
      setIsOpen(false)
    }
  }

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="relative h-9 w-9 p-0 rounded-lg text-zinc-300 hover:text-zinc-100 hover:bg-zinc-800/80 border border-zinc-800/80"
          title="Centrum powiadomień"
          aria-label="Centrum powiadomień"
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-blue-600 px-1 text-[10px] font-bold text-white shadow-sm ring-2 ring-zinc-950 animate-in zoom-in-75">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent
        align="end"
        sideOffset={8}
        className="w-80 sm:w-96 p-0 bg-zinc-900 border-zinc-800 text-zinc-100 shadow-2xl rounded-xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3.5 py-2.5 bg-zinc-950/70 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold tracking-wide text-zinc-200">
              Powiadomienia
            </span>
            {unreadCount > 0 ? (
              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 bg-blue-950 text-blue-300 border-blue-800">
                {unreadCount} nowe
              </Badge>
            ) : (
              <Badge variant="outline" className="text-[10px] px-1.5 py-0 text-zinc-500 border-zinc-800">
                Wszystkie przeczytane
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-1">
            {unreadCount > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={markAllAsRead}
                className="h-7 px-2 text-[11px] text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60"
                title="Oznacz wszystkie jako przeczytane"
              >
                <CheckCheck className="h-3.5 w-3.5 mr-1" />
                Przeczytane
              </Button>
            )}
            {notifications.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={clearAllNotifications}
                className="h-7 px-2 text-[11px] text-zinc-400 hover:text-red-400 hover:bg-zinc-800/60"
                title="Wyczyść całą historię"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Web Notifications permission prompt banner */}
        {permissionStatus === 'default' && (
          <div className="bg-blue-950/30 border-b border-blue-900/40 p-2.5 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 text-blue-400 shrink-0" />
              <span className="text-[11px] text-zinc-300 leading-tight">
                Włącz powiadomienia pulpitu, gdy pracujesz w innej karcie.
              </span>
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-6 px-2 text-[11px] border-blue-700 bg-blue-900/40 text-blue-200 hover:bg-blue-800/50 shrink-0"
              onClick={requestNotificationPermission}
            >
              Włącz
            </Button>
          </div>
        )}

        {/* List of notifications */}
        <div className="max-h-[380px] overflow-y-auto divide-y divide-zinc-800/60">
          {notifications.length === 0 ? (
            <div className="py-10 px-4 text-center">
              <div className="w-10 h-10 rounded-full bg-zinc-800/70 flex items-center justify-center mx-auto mb-2 text-zinc-500">
                <Bell className="h-5 w-5" />
              </div>
              <p className="text-xs font-medium text-zinc-300">Brak nowych powiadomień</p>
              <p className="text-[11px] text-zinc-500 mt-0.5">
                Zmiany statusów i przydziały zadań pojawią się tutaj na żywo.
              </p>
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleItemClick(item)
                  }
                }}
                role="button"
                tabIndex={0}
                className={cn(
                  'w-full text-left p-3 transition-colors flex items-start gap-3 cursor-pointer group hover:bg-zinc-800/60 focus:bg-zinc-800/70 focus:outline-none',
                  !item.read ? 'bg-zinc-900/90' : 'bg-transparent opacity-85'
                )}
              >
                <div className="mt-0.5">{getEventIcon(item.eventType)}</div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span
                      className={cn(
                        'text-xs truncate font-medium',
                        !item.read ? 'text-zinc-100 font-semibold' : 'text-zinc-300'
                      )}
                    >
                      {item.title}
                    </span>
                    <span className="text-[10px] text-zinc-500 whitespace-nowrap flex items-center gap-1 shrink-0">
                      <Clock className="h-2.5 w-2.5" />
                      {getRelativeTime(item.createdAt)}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-[11px] text-zinc-400 line-clamp-2 leading-relaxed">
                      {item.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between gap-2 mt-1.5 pt-0.5">
                    {item.actorName ? (
                      <span className="text-[10px] text-zinc-500 truncate">
                        Przez: <span className="text-zinc-400">{item.actorName}</span>
                      </span>
                    ) : (
                      <span />
                    )}

                    {item.taskId && (
                      <span className="text-[10px] text-blue-400 font-medium group-hover:underline inline-flex items-center gap-0.5 shrink-0">
                        Otwórz <ExternalLink className="h-2.5 w-2.5" />
                      </span>
                    )}
                  </div>
                </div>

                {!item.read && (
                  <span className="h-2 w-2 rounded-full bg-blue-500 shrink-0 mt-1" />
                )}
              </div>
            ))
          )}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
