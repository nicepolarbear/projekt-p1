import { useEffect, useState } from 'react'
import {
  AlertTriangle,
  ArrowRightCircle,
  CheckSquare,
  Loader2,
  Sparkles,
} from 'lucide-react'
import { useToast } from '../../hooks/useToast'
import { bugService } from '../../services/bugService'
import { usersService } from '../../services/usersService'
import { Badge } from '../ui/badge'
import { Button } from '../ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog'
import { Input } from '../ui/input'
import { Label } from '../ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../ui/select'
import { Textarea } from '../ui/textarea'

const PRIORITIES = [
  { id: 1, label: '1 - Pilny (Krytyczny)', color: 'text-red-400' },
  { id: 2, label: '2 - Wysoki', color: 'text-amber-400' },
  { id: 3, label: '3 - Średni (Normalny)', color: 'text-blue-400' },
  { id: 4, label: '4 - Niski', color: 'text-zinc-400' },
]

function mapSeverityToPriority(severity) {
  switch (severity) {
    case 'critical':
      return 1
    case 'high':
      return 2
    case 'normal':
      return 3
    case 'low':
      return 4
    default:
      return 2
  }
}

export function ConvertBugToTaskDialog({
  open,
  onOpenChange,
  bug,
  onConverted,
}) {
  const { toast } = useToast()

  const [title, setTitle] = useState('')
  const [shortDesc, setShortDesc] = useState('')
  const [fullDesc, setFullDesc] = useState('')
  const [priorityId, setPriorityId] = useState('2')
  const [dueDate, setDueDate] = useState('')
  const [employeeId, setEmployeeId] = useState('none')

  const [employees, setEmployees] = useState([])
  const [isLoadingEmployees, setIsLoadingEmployees] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!open || !bug) return

    setTitle(`[${bug.tracking_code}] ${bug.title}`)
    setShortDesc(`Zgłoszenie błędu ${bug.tracking_code}`)

    let initialDesc = `Zgłoszenie błędu: ${bug.tracking_code}\n\nOpis zgłoszony przez użytkownika:\n${bug.description}`
    if (bug.custom_url) {
      initialDesc += `\n\nAdres URL: ${bug.custom_url}`
    }
    if (bug.guest_email || bug.guest_name) {
      initialDesc += `\n\nZgłaszający: ${bug.guest_name || 'Gość'} (${bug.guest_email || 'brak e-maila'})`
    }
    setFullDesc(initialDesc)

    setPriorityId(String(mapSeverityToPriority(bug.severity)))
    setDueDate('')
    setEmployeeId('none')
    setError(null)

    // Load active employees in organization
    setIsLoadingEmployees(true)
    usersService
      .getAdminUsers({ limit: 100 })
      .then((data) => {
        setEmployees(data.users || [])
      })
      .catch(() => {
        // silent fallback
      })
      .finally(() => {
        setIsLoadingEmployees(false)
      })
  }, [open, bug])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!bug) return

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = {
        title: title.trim(),
        short_desc: shortDesc.trim() || undefined,
        full_desc: fullDesc.trim() || undefined,
        priority_id: Number(priorityId),
        due_date: dueDate ? dueDate : null,
        employee_id: employeeId !== 'none' ? Number(employeeId) : null,
      }

      const res = await bugService.convertBugToTask(bug.id, payload)

      toast({
        title: 'Przekształcono w zadanie TaskFlow!',
        description: `Utworzono zadanie #${res.task.id}: "${res.task.title}". Status zgłoszenia ustawiono na "W trakcie naprawy".`,
      })

      onConverted?.(res)
      onOpenChange?.(false)
    } catch (err) {
      setError(err?.message || 'Nie udało się przekształcić zgłoszenia w zadanie.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!bug) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl bg-zinc-950 border-zinc-800 text-zinc-100 p-0 overflow-hidden shadow-2xl">
        {/* macOS style header */}
        <div className="flex items-center justify-between border-b border-zinc-800/80 bg-zinc-900/60 px-5 py-3">
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="h-3 w-3 rounded-full bg-red-500/80" />
              <span className="h-3 w-3 rounded-full bg-yellow-500/80" />
              <span className="h-3 w-3 rounded-full bg-green-500/80" />
            </div>
            <span className="text-xs font-semibold text-zinc-400 pl-2">
              Konwersja zgłoszenia w zadanie robocze
            </span>
          </div>

          <Badge variant="outline" className="font-mono text-xs bg-sky-950 text-sky-400 border-sky-800 font-bold">
            {bug.tracking_code}
          </Badge>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[82vh] overflow-y-auto">
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-base sm:text-lg font-bold text-zinc-100 flex items-center gap-2">
              <ArrowRightCircle className="h-5 w-5 text-indigo-400" />
              Przekształć w zadanie TaskFlow
            </DialogTitle>
            <DialogDescription className="text-xs text-zinc-400">
              Zgłoszenie błędu zostanie powiązane z nowym zadaniem na tablicy. Po ukończeniu zadania w TaskFlow (status: "Zrobione"), błąd automatycznie zmieni status na "Naprawione"!
            </DialogDescription>
          </DialogHeader>

          {error && (
            <div className="p-3.5 rounded-xl border border-red-800/80 bg-red-950/40 text-xs text-red-200 flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Form Fields */}
          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="task-title" className="text-xs text-zinc-300">
                Tytuł zadania w TaskFlow <span className="text-red-400">*</span>
              </Label>
              <Input
                id="task-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                required
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="task-priority" className="text-xs text-zinc-300">
                  Priorytet zadania:
                </Label>
                <Select value={priorityId} onValueChange={setPriorityId}>
                  <SelectTrigger id="task-priority" className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100">
                    <SelectValue placeholder="Wybierz priorytet" />
                  </SelectTrigger>
                  <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p.id} value={String(p.id)} className={p.color}>
                        {p.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label htmlFor="task-due-date" className="text-xs text-zinc-300">
                  Termin realizacji (due date):
                </Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
                />
              </div>
            </div>

            {/* Przypisanie programisty */}
            <div className="space-y-1">
              <Label htmlFor="task-assignee" className="text-xs text-zinc-300">
                Przypisz pracownika / programistę:
              </Label>
              <Select value={employeeId} onValueChange={setEmployeeId}>
                <SelectTrigger id="task-assignee" className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100">
                  <SelectValue placeholder={isLoadingEmployees ? 'Ładowanie...' : 'Wybierz pracownika'} />
                </SelectTrigger>
                <SelectContent className="bg-zinc-900 border-zinc-800 text-zinc-200">
                  <SelectItem value="none">Nie przypisuj (do wzięcia z kolejki)</SelectItem>
                  {employees.map((emp) => (
                    <SelectItem key={emp.id} value={String(emp.id)}>
                      {emp.first_name} {emp.last_name} ({emp.position?.name || 'Pracownik'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-short-desc" className="text-xs text-zinc-300">
                Krótkie podsumowanie zadania:
              </Label>
              <Input
                id="task-short-desc"
                value={shortDesc}
                onChange={(e) => setShortDesc(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="task-full-desc" className="text-xs text-zinc-300">
                Pełny opis techniczny zadania:
              </Label>
              <Textarea
                id="task-full-desc"
                rows={5}
                value={fullDesc}
                onChange={(e) => setFullDesc(e.target.value)}
                className="bg-zinc-900 border-zinc-800 text-xs text-zinc-100 resize-none font-mono"
              />
            </div>
          </div>

          {/* Podgląd auto-synchronizacji */}
          <div className="rounded-xl border border-indigo-900/60 bg-indigo-950/20 p-3 flex items-start gap-2.5 text-xs text-indigo-200">
            <Sparkles className="h-4 w-4 text-indigo-400 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              Utworzone zadanie trafi na tablicę TaskFlow z statusem <strong>"Do zrobienia"</strong>. Zgłoszenie błędu otrzyma status <strong>"W trakcie naprawy"</strong>, a w czacie zgłoszenia pojawi się automatyczny wpis dla zgłaszającego.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800/80">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange?.(false)}
              className="border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs"
            >
              Anuluj
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs gap-1.5"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Tworzenie zadania...
                </>
              ) : (
                <>
                  <CheckSquare className="h-3.5 w-3.5" />
                  Przekształć w zadanie
                </>
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
