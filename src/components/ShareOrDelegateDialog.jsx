import { useState } from 'react'
import { Loader2, Share2, UserCheck, UserPlus, Users } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { canDelegate, canShare } from '../lib/permissions'
import { Button } from './ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from './ui/dialog'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

const PRIORITY_FALLBACK = [
  { id: 1, name: 'Niski' },
  { id: 2, name: 'Normalny' },
  { id: 3, name: 'Wysoki' },
  { id: 4, name: 'Pilny' },
]

const PRIORITY_DOTS = {
  1: '🟢',
  2: '🔵',
  3: '🟠',
  4: '🔴',
}

/**
 * ShareOrDelegateDialog - modal do przekazywania (re-delegacji) lub udostępniania
 * istniejącego zadania innym pracownikom zgodnie z regułami hierarchii stanowisk.
 */
export function ShareOrDelegateDialog({ task, trigger }) {
  const { currentUser, currentUserId, users, assignTask, assignments, priorities } =
    useAppContext()

  const activeUsers = users.filter((u) => u.is_active !== 0 && u.is_active !== false)
  const alreadyAssignedUserIds = assignments
    .filter((a) => a.task_id === task.id)
    .map((a) => a.employee_id)

  const delegatableUsers = activeUsers.filter(
    (u) =>
      u.id !== currentUserId &&
      !alreadyAssignedUserIds.includes(u.id) &&
      canDelegate(currentUser, u)
  )

  const sharableUsers = activeUsers.filter(
    (u) =>
      u.id !== currentUserId &&
      !alreadyAssignedUserIds.includes(u.id) &&
      canShare(currentUser, u)
  )

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState(() =>
    sharableUsers.length === 0 && delegatableUsers.length > 0 ? 'delegate' : 'share'
  )
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('2')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const priorityOptions = priorities.length > 0 ? priorities : PRIORITY_FALLBACK
  const activeCandidates = mode === 'delegate' ? delegatableUsers : sharableUsers

  const handleOpenChange = (nextOpen) => {
    if (isSubmitting) return
    if (nextOpen) {
      if (sharableUsers.length === 0 && delegatableUsers.length > 0) {
        setMode('delegate')
      } else if (delegatableUsers.length === 0 && sharableUsers.length > 0) {
        setMode('share')
      }
      setSelectedUser('')
    }
    setOpen(nextOpen)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedUser || isSubmitting) return

    setIsSubmitting(true)
    try {
      await assignTask(task.id, {
        employee_id: Number(selectedUser),
        priority_id: Number(selectedPriority),
        mode,
      })
      setSelectedUser('')
      setOpen(false)
    } catch {
      // Błąd jest obsługiwany przez AppContext (toast)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs text-zinc-400 hover:text-zinc-200 px-2 gap-1"
          >
            <Share2 className="h-3 w-3" />
            <span>Przekaż / Udostępnij</span>
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Przekaż lub udostępnij zadanie</DialogTitle>
          <DialogDescription>
            Zadanie: <span className="text-zinc-200 font-medium">{task.title}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Wybierz formę przekazania</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('share')
                  setSelectedUser('')
                }}
                disabled={sharableUsers.length === 0 || isSubmitting}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors
                  ${
                    mode === 'share'
                      ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <Users className="h-4 w-4" />
                <span className="font-medium">Udostępnij</span>
                <span className="text-[10px] text-zinc-500 text-center">
                  Ten sam szczebel ({sharableUsers.length} dostępnych)
                </span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('delegate')
                  setSelectedUser('')
                }}
                disabled={delegatableUsers.length === 0 || isSubmitting}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors
                  ${
                    mode === 'delegate'
                      ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <UserPlus className="h-4 w-4" />
                <span className="font-medium">Zleć dalej</span>
                <span className="text-[10px] text-zinc-500 text-center">
                  Niższy szczebel ({delegatableUsers.length} dostępnych)
                </span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label>
              {mode === 'delegate'
                ? 'Wybierz wykonawcę (niższy szczebel)'
                : 'Wybierz współpracownika (ten sam poziom)'}
            </Label>
            {activeCandidates.length === 0 ? (
              <div className="text-xs text-zinc-500 p-2.5 rounded border border-zinc-800 bg-zinc-950/40">
                Brak osób spełniających kryteria hierarchii dla tej akcji.
              </div>
            ) : (
              <Select
                value={selectedUser}
                onValueChange={setSelectedUser}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę z listy..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCandidates.map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.first_name} {user.last_name}
                      {user.position?.name ? ` (${user.position.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          <div className="space-y-1.5">
            <Label>Priorytet dla nowej osoby</Label>
            <Select
              value={selectedPriority}
              onValueChange={setSelectedPriority}
              disabled={isSubmitting}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {priorityOptions.map((priority) => (
                  <SelectItem key={priority.id} value={String(priority.id)}>
                    {PRIORITY_DOTS[priority.id] || '•'} {priority.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              disabled={isSubmitting}
              onClick={() => handleOpenChange(false)}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={!selectedUser || isSubmitting}
              className="gap-1.5"
            >
              {isSubmitting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              {isSubmitting ? 'Przekazywanie...' : 'Zatwierdź'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
