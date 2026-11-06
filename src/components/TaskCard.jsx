import { useState } from 'react'
import { AlertTriangle, Calendar, CheckCircle2, Clock, Users2, XCircle } from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'
import { ShareOrDelegateDialog } from './ShareOrDelegateDialog'
import { useAppContext } from '../context/AppContext'
import { priorityVariantMap, statusVariantMap } from '../data/mockData'

/**
 * TaskCard - karta reprezentująca jedno zadanie.
 * 
 * Props:
 * - task: obiekt zadania z mockData (lub z API)
 * - showActions: czy pokazywać przyciski akcji (zmiana statusu itp.)
 * - compact: tryb kompaktowy (mniej informacji) dla paneli bocznych
 */
export function TaskCard({ task, showActions = true, compact = false }) {
  const [expandedDesc, setExpandedDesc] = useState(false)

  const {
    taskStatuses,
    priorities,
    currentUserId,
    updateTaskStatus,
    updateAssignmentStatus,
    deleteTask,
    getAssignees,
    assignments,
  } = useAppContext()

  // Pobieramy słownikowe nazwy dla ID z bazy
  const status = taskStatuses.find(s => s.id === task.status_id)
  
  // Pobieramy przypisanie AKTUALNEGO użytkownika do tego zadania
  // (żeby pokazać jego indywidualny priorytet)
  const myAssignment = assignments.find(
    a => a.task_id === task.id && a.employee_id === currentUserId
  )
  const myPriority = myAssignment
    ? priorities.find(p => p.id === myAssignment.priority_id)
    : null

  // Wszystkie osoby przypisane do zadania (dla ikon avatarów)
  const assignees = getAssignees(task.id)

  // Formatowanie daty deadline
  const dueDate = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && dueDate < new Date() && task.status_id !== 3

  // Sprawdzamy status przypisania (pending = oczekuje na decyzję)
  const isPending = myAssignment?.assignment_status === 'pending'
  const isCreator = task.creator_id === currentUserId
  const rejectedAssignments = assignees.filter(a => a.assignment_status === 'rejected')
  const isDraggable = task.status_id === 1

  return (
    <Card
      draggable={isDraggable}
      onDragStart={(e) => {
        if (!isDraggable) return
        e.dataTransfer.setData('text/plain', String(task.id))
        e.dataTransfer.effectAllowed = 'move'
      }}
      className={`
        transition-all duration-200 hover:border-zinc-700
        ${isDraggable ? 'cursor-grab active:cursor-grabbing hover:border-blue-600/60' : ''}
        ${isPending ? 'border-yellow-900/50' : ''}
        ${isOverdue ? 'border-red-900/50' : ''}
      `}
    >
      <CardHeader className={compact ? 'p-3' : 'p-4'}>
        <div className="flex items-start justify-between gap-2">
          <CardTitle className={`${compact ? 'text-sm' : 'text-base'} leading-tight`}>
            {task.title}
          </CardTitle>
          {/* Badge statusu */}
          <Badge variant={statusVariantMap[task.status_id]} className="shrink-0">
            {status?.name}
          </Badge>
        </div>

        {/* Ostrzeżenie dla twórcy o odrzuceniu zlecenia */}
        {isCreator && rejectedAssignments.length > 0 && (
          <div className="mt-2 p-2 rounded bg-red-950/40 border border-red-900/60 text-xs text-red-300 space-y-1">
            <div className="flex items-center gap-1.5 font-medium">
              <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
              <span>Odrzucone przez pracownika:</span>
            </div>
            {rejectedAssignments.map(ra => (
              <p key={ra.employee_id} className="text-[11px] text-red-400/90 pl-5">
                • {ra.user?.first_name} {ra.user?.last_name}
                {ra.rejection_reason ? `: „${ra.rejection_reason}”` : ''}
              </p>
            ))}
          </div>
        )}

        

        {/* Badge priorytetu (indywidualny dla aktualnego usera) */}
        {myPriority && (
          <div className="flex items-center gap-1.5 mt-1">
            <span className="text-xs text-zinc-500">Twój priorytet:</span>
            <Badge variant={priorityVariantMap[myAssignment.priority_id]} className="text-xs">
              {myPriority.name}
            </Badge>
          </div>
        )}

        {/* Ostrzeżenie "Oczekuje na Twoją akceptację" */}
        {isPending && (
          <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
            <Clock className="h-3 w-3" />
            Oczekuje na Twoją decyzję
          </div>
        )}
      </CardHeader>

      {/* Krótki opis + opcjonalny pełny opis */}
      {task.short_desc && (
        <CardContent className="px-4 pb-3 pt-0">
          <p className="text-sm text-zinc-400">{task.short_desc}</p>
          {task.full_desc && (
            <div className="mt-1">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setExpandedDesc((v) => !v)
                }}
                className="text-xs text-zinc-500 hover:text-zinc-300 underline underline-offset-2 transition-colors cursor-pointer"
              >
                {expandedDesc ? 'Zwiń szczegóły' : 'Pokaż pełny opis'}
              </button>
              {expandedDesc && (
                <div className="mt-1.5 p-2 bg-zinc-950/70 rounded border border-zinc-800 text-xs text-zinc-400">
                  {task.full_desc}
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}

      <CardFooter className={`${compact ? 'p-3' : 'p-4'} pt-0 flex-col items-start gap-2`}>
        {/* Deadline */}
        {dueDate && (
          <div className={`flex items-center gap-1.5 text-xs ${isOverdue ? 'text-red-400' : 'text-zinc-500'}`}>
            <Calendar className="h-3 w-3" />
            {isOverdue && 'Po terminie! '}
            {dueDate.toLocaleDateString('pl-PL', {
              day: 'numeric', month: 'short', year: 'numeric'
            })}
          </div>
        )}

        {/* Ikony przypisanych użytkowników */}
        {assignees.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-zinc-500">
            <Users2 className="h-3 w-3" />
            <span>
              {assignees.map(a => `${a.user?.first_name} ${a.user?.last_name}`).join(', ')}
            </span>
          </div>
        )}

        {/* Przyciski akcji */}
        {showActions && (
          <div className="flex flex-wrap gap-2 mt-1 w-full">
            {/* Akcje dla zadań oczekujących na akceptację */}
            {isPending && (
              <>
                <Button
                  size="sm"
                  variant="secondary"
                  className="flex-1 text-green-400 hover:text-green-300"
                  onClick={() => updateAssignmentStatus(task.id, currentUserId, 'accepted')}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Akceptuj
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="flex-1 text-red-400 hover:text-red-300"
                  onClick={() => updateAssignmentStatus(task.id, currentUserId, 'rejected', 'Odrzucone przez wykonawcę')}
                >
                  <XCircle className="h-3.5 w-3.5 mr-1" />
                  Odrzuć
                </Button>
              </>
            )}
            
            {/* Zmiana statusu - "Zacznij" dla Do Zrobienia */}
            {!isPending && task.status_id === 1 && (
              <Button
                size="sm"
                variant="outline"
                className="text-blue-400 border-blue-900 hover:bg-blue-900/30"
                onClick={() => updateTaskStatus(task.id, 2)}
              >
                <Clock className="h-3.5 w-3.5 mr-1" />
                Zacznij
              </Button>
            )}

            {/* "Oznacz jako zrobione" dla W trakcie */}
            {!isPending && task.status_id === 2 && (
              <Button
                size="sm"
                variant="outline"
                className="text-green-400 border-green-900 hover:bg-green-900/30"
                onClick={() => updateTaskStatus(task.id, 3)}
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                Oznacz jako zrobione
              </Button>
            )}

            {/* Usuń (soft delete) - tylko twórca może usunąć */}
            {task.creator_id === currentUserId && task.status_id !== 4 && (
              <Button
                size="sm"
                variant="ghost"
                className="text-zinc-500 hover:text-red-400 ml-auto"
                onClick={() => deleteTask(task.id)}
              >
                <XCircle className="h-3.5 w-3.5" />
              </Button>
            )}

            {/* Przekaż / Udostępnij */}
            <div className="w-full flex items-center justify-between pt-1 border-t border-zinc-800 text-[11px] text-zinc-500">
              <span>{isCreator ? 'Jesteś twórcą' : 'Przypisane'}</span>
              <ShareOrDelegateDialog task={task} />
            </div>
          </div>
        )}
      </CardFooter>
    </Card>
  )
}
