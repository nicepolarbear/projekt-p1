import { useState } from 'react'
import { Share2, UserCheck, UserPlus, Users } from 'lucide-react'
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
import { useAppContext } from '../context/AppContext'
import { canDelegate, canShare } from '../data/mockData'

/**
 * ShareOrDelegateDialog - modal do przekazywania (re-delegacji) lub udostępniania
 * istniejącego zadania innym pracownikom zgodnie z regułami hierarchii stanowisk.
 *
 * Reguły:
 * 1. Delegowanie (Zlecenie dalej) -> tylko pracownikom o niższym szczeblu (wyższe priority w positions).
 * 2. Udostępnienie (Współpraca) -> pracownikom na tym samym szczeblu.
 */
export function ShareOrDelegateDialog({ task, trigger }) {
  const { currentUserId, users, assignTask, assignments, priorities } = useAppContext()
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('share') // 'share' | 'delegate'
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('2') // Domyślnie normalny

  // Kto jest już przypisany do tego zadania
  const alreadyAssignedUserIds = assignments
    .filter(a => a.task_id === task.id)
    .map(a => a.employee_id)

  // Dostępni do delegacji (niższy szczebel, jeszcze nieprzypisani)
  const delegatableUsers = users.filter(
    u => u.id !== currentUserId &&
         !alreadyAssignedUserIds.includes(u.id) &&
         canDelegate(currentUserId, u.id)
  )

  // Dostępni do udostępnienia (ten sam szczebel, jeszcze nieprzypisani)
  const sharableUsers = users.filter(
    u => u.id !== currentUserId &&
         !alreadyAssignedUserIds.includes(u.id) &&
         canShare(currentUserId, u.id)
  )

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!selectedUser) return

    const targetUserId = parseInt(selectedUser, 10)
    const priorityId = parseInt(selectedPriority, 10)

    if (mode === 'delegate') {
      // Zlecenie niżej -> status pending (czeka na akceptację przez pracownika)
      assignTask(task.id, targetUserId, priorityId, 'pending')
    } else {
      // Udostępnienie na tym samym poziomie -> accepted (wspólna praca nad zadaniem)
      assignTask(task.id, targetUserId, priorityId, 'accepted')
    }

    setSelectedUser('')
    setOpen(false)
  }

  const activeCandidates = mode === 'delegate' ? delegatableUsers : sharableUsers

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
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
          {/* Wybór akcji */}
          <div className="space-y-2">
            <Label>Wybierz formę przekazania</Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setMode('share')
                  setSelectedUser('')
                }}
                disabled={sharableUsers.length === 0}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors
                  ${mode === 'share'
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
                disabled={delegatableUsers.length === 0}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors
                  ${mode === 'delegate'
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

          {/* Wybór osoby */}
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
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę z listy..." />
                </SelectTrigger>
                <SelectContent>
                  {activeCandidates.map(user => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {/* Wybór priorytetu */}
          <div className="space-y-1.5">
            <Label>Priorytet dla nowej osoby</Label>
            <Select value={selectedPriority} onValueChange={setSelectedPriority}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">🟢 Niski</SelectItem>
                <SelectItem value="2">🔵 Normalny</SelectItem>
                <SelectItem value="3">🟠 Wysoki</SelectItem>
                <SelectItem value="4">🔴 Pilny</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={!selectedUser}
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" />
              Zatwierdź
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
