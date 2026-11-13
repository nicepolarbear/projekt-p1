import { useState } from 'react'
import { Loader2, Plus, User, Users } from 'lucide-react'
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
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'

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
 * AddTaskDialog - modal do tworzenia nowego zadania.
 *
 * Tryby przypisania:
 * 1. "self" - tworzę zadanie dla siebie
 * 2. "assign" - delegowanie (do osoby o niższym szczeblu)
 * 3. "share" - udostępnienie (do osoby o tym samym szczeblu)
 */
export function AddTaskDialog() {
  const { currentUserId, currentUser, addTask, users, priorities } = useAppContext()

  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('self') // 'self' | 'assign' | 'share'
  const [title, setTitle] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [fullDesc, setFullDesc] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('2')
  const [minDueDate] = useState(() => new Date().toISOString().split('T')[0])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const activeUsers = users.filter((u) => u.is_active !== 0 && u.is_active !== false)
  const delegatableUsers = activeUsers.filter(
    (u) => u.id !== currentUserId && canDelegate(currentUser, u)
  )
  const sharableUsers = activeUsers.filter(
    (u) => u.id !== currentUserId && canShare(currentUser, u)
  )

  const priorityOptions = priorities.length > 0 ? priorities : PRIORITY_FALLBACK

  const resetForm = () => {
    setTitle('')
    setShortDesc('')
    setFullDesc('')
    setDueDate('')
    setMode('self')
    setSelectedUser('')
    setSelectedPriority('2')
  }

  const handleOpenChange = (nextOpen) => {
    if (isSubmitting) return
    setOpen(nextOpen)
    if (!nextOpen) {
      resetForm()
    }
  }

  const handleModeChange = (nextMode) => {
    setMode(nextMode)
    setSelectedUser('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!title.trim() || isSubmitting) return
    if (mode !== 'self' && !selectedUser) return

    setIsSubmitting(true)
    try {
      await addTask({
        title: title.trim(),
        short_desc: shortDesc.trim() || null,
        full_desc: fullDesc.trim() || null,
        due_date: dueDate ? new Date(dueDate).toISOString() : null,
        assignment_mode: mode,
        assignee_id: mode !== 'self' && selectedUser ? Number(selectedUser) : undefined,
        priority_id: Number(selectedPriority),
      })
      resetForm()
      setOpen(false)
    } catch {
      // Błąd jest obsługiwany przez AppContext (toast)
    } finally {
      setIsSubmitting(false)
    }
  }

  const isSubmitDisabled =
    !title.trim() || (mode !== 'self' && !selectedUser) || isSubmitting

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          Nowe zadanie
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Utwórz nowe zadanie</DialogTitle>
          <DialogDescription>
            Wypełnij pola i wybierz kto ma wykonać zadanie.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Tytuł *</Label>
            <Input
              id="task-title"
              placeholder="Np. Naprawić błąd logowania..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={isSubmitting}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Krótki opis</Label>
            <Textarea
              id="task-desc"
              placeholder="Opisz zadanie w kilku zdaniach..."
              value={shortDesc}
              onChange={(e) => setShortDesc(e.target.value)}
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-full-desc">Szczegóły (opcjonalnie)</Label>
            <Textarea
              id="task-full-desc"
              placeholder="Dodatkowe wymagania, linki lub kryteria akceptacji..."
              value={fullDesc}
              onChange={(e) => setFullDesc(e.target.value)}
              disabled={isSubmitting}
              rows={2}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="task-due">Termin realizacji</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              min={minDueDate}
              disabled={isSubmitting}
              className="[color-scheme:dark]"
            />
          </div>

          <div className="space-y-2">
            <Label>Kto wykonuje?</Label>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleModeChange('self')}
                disabled={isSubmitting}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors
                  ${
                    mode === 'self'
                      ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }
                `}
              >
                <User className="h-4 w-4" />
                Ja
              </button>

              <button
                type="button"
                onClick={() => delegatableUsers.length > 0 && handleModeChange('assign')}
                disabled={delegatableUsers.length === 0 || isSubmitting}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors
                  ${
                    mode === 'assign'
                      ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                      : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <Users className="h-4 w-4" />
                Zlecam
              </button>

              <button
                type="button"
                onClick={() => sharableUsers.length > 0 && handleModeChange('share')}
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
                Udostępniam
              </button>
            </div>
          </div>

          {(mode === 'assign' || mode === 'share') && (
            <div className="space-y-1.5">
              <Label>{mode === 'assign' ? 'Zlecam komu:' : 'Udostępniam komu:'}</Label>
              <Select
                value={selectedUser}
                onValueChange={setSelectedUser}
                disabled={isSubmitting}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę..." />
                </SelectTrigger>
                <SelectContent>
                  {(mode === 'assign' ? delegatableUsers : sharableUsers).map((user) => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.first_name} {user.last_name}
                      {user.position?.name ? ` (${user.position.name})` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-1.5">
            <Label>Priorytet</Label>
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
            <Button type="submit" disabled={isSubmitDisabled} className="gap-1.5">
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isSubmitting ? 'Tworzenie...' : 'Utwórz zadanie'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
