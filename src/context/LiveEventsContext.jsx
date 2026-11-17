import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { toast } from 'sonner'
import { useAuth } from '../hooks/useAuth'
import { eventsService } from '../services/eventsService'

// oxlint-disable-next-line react/only-export-components
export const LiveEventsContext = createContext(null)

const POLL_INTERVAL_MS = 3000
const MAX_NOTIFICATIONS_HISTORY = 100

function getStoredNotifications(userId) {
  if (!userId || typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(`taskflow_notifications_${userId}`)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function setStoredNotifications(userId, notifications) {
  if (!userId || typeof window === 'undefined') return
  try {
    localStorage.setItem(`taskflow_notifications_${userId}`, JSON.stringify(notifications))
  } catch {
    // Ignore localStorage quota errors
  }
}

export function LiveEventsProvider({ children, onTaskUpdated, onOpenTask }) {
  const { user, authStatus } = useAuth()
  const userId = user?.id

  const [connectionStatus, setConnectionStatus] = useState('connecting') // 'connected' | 'connecting' | 'offline'
  const [notifications, setNotifications] = useState([])
  const [conflicts, setConflicts] = useState({}) // { [taskId]: { actorName, title, updatedAt } }
  const [permissionStatus, setPermissionStatus] = useState(
    typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported'
  )

  const lastSeenIdRef = useRef(0)
  const isPollingRef = useRef(false)
  const pollTimerRef = useRef(null)
  const onTaskUpdatedRef = useRef(onTaskUpdated)
  const onOpenTaskRef = useRef(onOpenTask)

  useEffect(() => {
    onTaskUpdatedRef.current = onTaskUpdated
    onOpenTaskRef.current = onOpenTask
  }, [onTaskUpdated, onOpenTask])

  // Załaduj historię powiadomień dla danego użytkownika z localStorage
  useEffect(() => {
    if (userId) {
      const stored = getStoredNotifications(userId)
      setNotifications(stored)
    } else {
      setNotifications([])
      setConflicts({})
      lastSeenIdRef.current = 0
    }
  }, [userId])

  // Zapisz historię w localStorage przy zmianach
  useEffect(() => {
    if (userId) {
      setStoredNotifications(userId, notifications)
    }
  }, [userId, notifications])

  const requestNotificationPermission = useCallback(async () => {
    if (typeof window === 'undefined' || !('Notification' in window)) return 'unsupported'
    try {
      const res = await Notification.requestPermission()
      setPermissionStatus(res)
      return res
    } catch {
      return Notification.permission
    }
  }, [])

  const markAsRead = useCallback((notificationId) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
  }, [])

  const markAllAsRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAllNotifications = useCallback(() => {
    setNotifications([])
    if (userId) {
      setStoredNotifications(userId, [])
    }
  }, [userId])

  const clearConflict = useCallback((taskId) => {
    setConflicts((prev) => {
      if (!prev[taskId]) return prev
      const next = { ...prev }
      delete next[taskId]
      return next
    })
  }, [])

  const triggerOpenTask = useCallback((taskId) => {
    if (!taskId) return
    clearConflict(taskId)
    onOpenTaskRef.current?.(taskId)
  }, [clearConflict])

  // Główna funkcja wykonująca pojedyncze zapytanie sync
  const pollEvents = useCallback(async () => {
    if (!userId || authStatus !== 'authenticated' || isPollingRef.current) return
    isPollingRef.current = true

    try {
      // Inicjalizacja pointera przy pierwszym uruchomieniu
      if (lastSeenIdRef.current === 0) {
        const latestId = await eventsService.getLatestId()
        lastSeenIdRef.current = latestId
        setConnectionStatus('connected')
        isPollingRef.current = false
        return
      }

      const events = await eventsService.getEventsSince(lastSeenIdRef.current)
      setConnectionStatus('connected')

      if (Array.isArray(events) && events.length > 0) {
        let hasTaskChanges = false
        const newNotifications = []

        for (const ev of events) {
          lastSeenIdRef.current = Math.max(lastSeenIdRef.current, ev.id)
          hasTaskChanges = true

          const taskId = ev.payload?.taskId || ev.entity_id

          const item = {
            id: ev.id,
            eventType: ev.event_type,
            title: ev.title,
            description: ev.description,
            taskId,
            taskTitle: ev.payload?.taskTitle || null,
            actorId: ev.actor_id,
            actorName: ev.actor_name,
            isActor: Boolean(ev.is_actor),
            createdAt: ev.created_at,
            read: false,
          }

          newNotifications.push(item)

          // 1. Toast Sonner (prawy dolny róg, 10s, interaktywny przycisk)
          if (ev.is_actor) {
            // Potwierdzenie własnej akcji
            toast.success(ev.title, {
              description: ev.description || 'Pomyślnie zaktualizowano zadanie.',
              duration: 10000,
            })
          } else {
            // Powiadomienie na żywo od innego użytkownika
            toast.info(ev.title, {
              description: ev.description,
              duration: 10000,
              action: taskId
                ? {
                    label: 'Pokaż zadanie',
                    onClick: () => triggerOpenTask(taskId),
                  }
                : undefined,
            })

            // 2. Jeśli zadanie jest modyfikowane przez kogoś innego -> oznacz konflikt w otwartym oknie
            if (taskId) {
              setConflicts((prev) => ({
                ...prev,
                [taskId]: {
                  actorName: ev.actor_name,
                  title: ev.title,
                  updatedAt: ev.created_at,
                },
              }))
            }

            // 3. Powiadomienie systemowe przeglądarki (gdy karta w tle)
            if (
              typeof document !== 'undefined' &&
              document.hidden &&
              typeof window !== 'undefined' &&
              'Notification' in window &&
              Notification.permission === 'granted'
            ) {
              try {
                const notif = new Notification(`TaskFlow • ${ev.title}`, {
                  body: ev.description || '',
                  icon: '/favicon.ico',
                  tag: `task-${taskId}-${ev.id}`,
                })
                notif.onclick = () => {
                  window.focus()
                  if (taskId) triggerOpenTask(taskId)
                  notif.close()
                }
              } catch (notifErr) {
                console.warn('Błąd powiadomienia przeglądarki:', notifErr)
              }
            }
          }
        }

        // Dodaj do historii powiadomień
        if (newNotifications.length > 0) {
          setNotifications((prev) => {
            const combined = [...newNotifications.reverse(), ...prev]
            return combined.slice(0, MAX_NOTIFICATIONS_HISTORY)
          })
        }

        // Odśwież zadania w tle
        if (hasTaskChanges) {
          onTaskUpdatedRef.current?.()
        }
      }
    } catch {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        setConnectionStatus('offline')
      } else {
        setConnectionStatus('connecting')
      }
    } finally {
      isPollingRef.current = false
    }
  }, [userId, authStatus, triggerOpenTask])

  // Pętla odpytywania (smart polling co 3 sekundy)
  useEffect(() => {
    if (!userId || authStatus !== 'authenticated') {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      return
    }

    // Pierwsze wykonanie
    pollEvents()

    pollTimerRef.current = setInterval(pollEvents, POLL_INTERVAL_MS)

    // Natychmiastowe odpytanie po powrocie do karty
    const handleFocusOrVisibility = () => {
      if (!document.hidden) {
        pollEvents()
      }
    }

    const handleOnline = () => {
      setConnectionStatus('connecting')
      pollEvents()
    }

    const handleOffline = () => {
      setConnectionStatus('offline')
    }

    window.addEventListener('focus', handleFocusOrVisibility)
    document.addEventListener('visibilitychange', handleFocusOrVisibility)
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)

    return () => {
      if (pollTimerRef.current) {
        clearInterval(pollTimerRef.current)
        pollTimerRef.current = null
      }
      window.removeEventListener('focus', handleFocusOrVisibility)
      document.removeEventListener('visibilitychange', handleFocusOrVisibility)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [userId, authStatus, pollEvents])

  const unreadCount = notifications.filter((n) => !n.read).length

  const value = {
    connectionStatus,
    notifications,
    unreadCount,
    conflicts,
    clearConflict,
    markAsRead,
    markAllAsRead,
    clearAllNotifications,
    triggerOpenTask,
    permissionStatus,
    requestNotificationPermission,
    refreshNow: pollEvents,
  }

  return <LiveEventsContext.Provider value={value}>{children}</LiveEventsContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useLiveEvents() {
  const context = useContext(LiveEventsContext)
  if (!context) {
    throw new Error('useLiveEvents musi być używany wewnątrz <LiveEventsProvider>')
  }
  return context
}
