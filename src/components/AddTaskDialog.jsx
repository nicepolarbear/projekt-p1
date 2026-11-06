import { useState } from 'react'
import { Plus, User, Users } from 'lucide-react'
import { Button } from './ui/button'
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from './ui/dialog'
import { Input } from './ui/input'
import { Label } from './ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'
import { Textarea } from './ui/textarea'
import { useAppContext } from '../context/AppContext'
import { canDelegate, canShare } from '../data/mockData'

/**
 * AddTaskDialog - modal do tworzenia nowego zadania.
 * 
 * Dwa tryby przypisania:
 * 1. "self" - tworzę zadanie dla siebie (automatyczne przypisanie do mnie)
 * 2. "assign" - delegowanie (do osoby o niższym szczeblu)
 * 3. "share" - udostępnienie (do osoby o tym samym szczeblu)
 */
export function AddTaskDialog() {
  const { currentUserId, currentUser, addTask, assignTask, users, priorities } = useAppContext()

  // Stan formularza
  const [open, setOpen] = useState(false)
  const [mode, setMode] = useState('self') // 'self' | 'assign' | 'share'
  const [title, setTitle] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [selectedUser, setSelectedUser] = useState('')
  const [selectedPriority, setSelectedPriority] = useState('2') // Domyślnie Normalny

  // Filtrujemy użytkowników wg reguł hierarchii
  // canDelegate/canShare to funkcje z mockData.js
  const delegatableUsers = users.filter(u =>
    u.id !== currentUserId && canDelegate(currentUserId, u.id)
  )
  const sharableUsers = users.filter(u =>
    u.id !== currentUserId && canShare(currentUserId, u.id)
  )

  const handleSubmit = (e) => {
    e.preventDefault()

    // Walidacja (prosta, frontendowa)
    if (!title.trim()) return

    // Tworzymy zadanie
    const newTask = addTask({
      title: title.trim(),
      short_desc: shortDesc.trim() || null,
      full_desc: null,
      due_date: dueDate ? new Date(dueDate).toISOString() : null,
      status_id: 1, // "Do zrobienia"
    })

    // Przypisujemy wg wybranego trybu
    if (mode === 'self') {
      // Przypisuję sobie - automatycznie akceptowane
      assignTask(newTask.id, currentUserId, parseInt(selectedPriority), 'accepted')
    } else if (mode === 'assign' && selectedUser) {
      // Delegowanie - status 'pending' (czeka na akceptację)
      assignTask(newTask.id, parseInt(selectedUser), parseInt(selectedPriority), 'pending')
    } else if (mode === 'share' && selectedUser) {
      // Udostępnienie - automatycznie 'accepted' (obie strony mają to zadanie)
      assignTask(newTask.id, currentUserId, parseInt(selectedPriority), 'accepted')
      assignTask(newTask.id, parseInt(selectedUser), parseInt(selectedPriority), 'accepted')
    }

    // Reset formularza i zamknięcie modalu
    resetForm()
    setOpen(false)
  }

  const resetForm = () => {
    setTitle('')
    setShortDesc('')
    setDueDate('')
    setMode('self')
    setSelectedUser('')
    setSelectedPriority('2')
  }

  return (
    /*
     * Dialog - kontrolowany przez stan open/setOpen.
     * Gdy open=true, Radix renderuje DialogContent w portalu (poza drzewem DOM).
     * Gdy open=false, DialogContent jest odmontowany.
     */
    <Dialog open={open} onOpenChange={setOpen}>
      {/*
       * DialogTrigger - kliknięcie tego elementu ustawia open=true.
       * asChild - przekazuje obsługę kliknięcia do dziecka (Button)
       *           zamiast owijać go w dodatkowy div
       */}
      <DialogTrigger asChild>
        <Button className="gap-2">
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

        {/* onSubmit zamiast onClick na buttonie - obsługuje też Enter w polu */}
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Tytuł */}
          <div className="space-y-1.5">
            <Label htmlFor="task-title">Tytuł *</Label>
            <Input
              id="task-title"
              placeholder="Np. Naprawić błąd logowania..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              required
            />
          </div>

          {/* Krótki opis */}
          <div className="space-y-1.5">
            <Label htmlFor="task-desc">Krótki opis</Label>
            <Textarea
              id="task-desc"
              placeholder="Opisz zadanie w kilku zdaniach..."
              value={shortDesc}
              onChange={e => setShortDesc(e.target.value)}
              rows={3}
            />
          </div>

          {/* Deadline */}
          <div className="space-y-1.5">
            <Label htmlFor="task-due">Termin realizacji</Label>
            <Input
              id="task-due"
              type="date"
              value={dueDate}
              onChange={e => setDueDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
              className="[color-scheme:dark]" // Input date w dark mode
            />
          </div>

          {/* Tryb przypisania */}
          <div className="space-y-2">
            <Label>Kto wykonuje?</Label>
            <div className="grid grid-cols-3 gap-2">
              {/* Przycisk "Ja" */}
              <button
                type="button"
                onClick={() => setMode('self')}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors
                  ${mode === 'self'
                    ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }
                `}
              >
                <User className="h-4 w-4" />
                Ja
              </button>

              {/* Przycisk "Zlecam" - tylko gdy mamy komu zlecić */}
              <button
                type="button"
                onClick={() => delegatableUsers.length > 0 && setMode('assign')}
                disabled={delegatableUsers.length === 0}
                className={`
                  flex flex-col items-center gap-1.5 p-3 rounded-lg border text-xs transition-colors
                  ${mode === 'assign'
                    ? 'border-zinc-500 bg-zinc-800 text-zinc-100'
                    : 'border-zinc-800 text-zinc-500 hover:border-zinc-700'
                  }
                  disabled:opacity-40 disabled:cursor-not-allowed
                `}
              >
                <Users className="h-4 w-4" />
                Zlecam
              </button>

              {/* Przycisk "Udostępniam" */}
              <button
                type="button"
                onClick={() => sharableUsers.length > 0 && setMode('share')}
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
                Udostępniam
              </button>
            </div>
          </div>

          {/* Select użytkownika - tylko gdy tryb assign lub share */}
          {(mode === 'assign' || mode === 'share') && (
            <div className="space-y-1.5">
              <Label>
                {mode === 'assign' ? 'Zlecam komu:' : 'Udostępniam komu:'}
              </Label>
              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger>
                  <SelectValue placeholder="Wybierz osobę..." />
                </SelectTrigger>
                <SelectContent>
                  {(mode === 'assign' ? delegatableUsers : sharableUsers).map(user => (
                    <SelectItem key={user.id} value={String(user.id)}>
                      {user.first_name} {user.last_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Priorytet */}
          <div className="space-y-1.5">
            <Label>Priorytet</Label>
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
              onClick={() => { resetForm(); setOpen(false) }}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={!title.trim()}>
              Utwórz zadanie
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
