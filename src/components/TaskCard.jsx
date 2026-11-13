import { useState } from 'react'
import { AlertTriangle, Calendar, CheckCircle2, Clock, Users2, XCircle } from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { priorityVariantMap, statusVariantMap } from '../lib/constants'
import { canChangeTaskStatus, canDeleteTask } from '../lib/permissions'
import { ShareOrDelegateDialog } from './ShareOrDelegateDialog'
import { ConfirmDialog } from './shared/ConfirmDialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from './ui/card'
import { Input } from './ui/input'

/**
 * TaskCard - karta reprezentująca jedno zadanie.
 */
export function TaskCard({ task, showActions = true, compact = false }) {
  const [expandedDesc, setExpandedDesc] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  const {
    taskStatuses,
    priorities,
    currentUser,
    currentUserId,
    updateTaskStatus,
    updateAssignmentStatus,
    deleteTask,
    getAssignees,
    assignments,
  } = useAppContext()

  const status = taskStatuses.find((s) => s.id === task.status_id)

  const myAssignment = assignments.find(
    (a) => a.task_id === task.id && a.employee_id === currentUserId
  )
  const myPriority = myAssignment
    ? priorities.find((p) => p.id === myAssignment.priority_id)
    : null

  const assignees = getAssignees(task.id)

  const [now] = useState(() => Date.now())
  const dueDate = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && dueDate.getTime() < now && task.status_id !== 3 && task.status_id !== 4

  const isPending = myAssignment?.assignment_status === 'pending'
  const isRejected = myAssignment?.assignment_status === 'rejected'
  const isCreator = task.creator_id === currentUserId
  const rejectedAssignments = assignees.filter((a) => a.assignment_status === 'rejected')

  const canChangeStatus = canChangeTaskStatus(currentUser, task, assignments)
  const canDelete = canDeleteTask(currentUser, task)
  const isPrivileged =
    isCreator || currentUser?.role === 'admin' || currentUser?.role === 'dyrektor'
  const hasBlockedAssignment = isPending || isRejected
  const isDraggable =
    task.deleted_at == null &&
    task.status_id === 1 &&
    canChangeStatus &&
    (!hasBlockedAssignment || isPrivileged)

  const canShareOrDelegate =
    canChangeStatus && !isPending && !isRejected && task.status_id !== 3 && task.status_id !== 4
  const confirmDeleteEnabled = currentUser?.preferences?.confirm_delete !== false

  const handleDeleteClick = () => {
    if (!canDelete) return
    if (confirmDeleteEnabled) {
      setConfirmDeleteOpen(true)
    } else {
      void deleteTask(task.id)
    }
  }

  const handleConfirmDelete = async () => {
    if (isDeleting) return
    setIsDeleting(true)
    try {
      await deleteTask(task.id)
      setConfirmDeleteOpen(false)
    } finally {
      setIsDeleting(false)
    }
  }

  const handleRejectSubmit = async (e) => {
    e.preventDefault()
    await updateAssignmentStatus(
      task.id,
      currentUserId,
      'rejected',
      rejectReason.trim() || null
    )
    setShowRejectInput(false)
    setRejectReason('')
  }

  return (
    <>
      <Card
        draggable={isDraggable}
        onDragStart={(e) => {
          if (!isDraggable) {
            e.preventDefault()
            return
          }
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
              {rejectedAssignments.map((ra) => (
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

          {isPending && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-yellow-400">
              <Clock className="h-3 w-3" />
              Oczekuje na Twoją decyzję
            </div>
          )}

          {isRejected && (
            <div className="flex items-center gap-1.5 mt-2 text-xs text-red-400">
              <XCircle className="h-3 w-3" />
              Odrzucone przez Ciebie
            </div>
          )}
        </CardHeader>

        {task.short_desc && (
          <CardContent className={compact ? 'px-3 pb-2.5 pt-0' : 'px-4 pb-3 pt-0'}>
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
          {dueDate && (
            <div
              className={`flex items-center gap-1.5 text-xs ${
                isOverdue ? 'text-red-400' : 'text-zinc-500'
              }`}
            >
              <Calendar className="h-3 w-3" />
              {isOverdue && 'Po terminie! '}
              {dueDate.toLocaleDateString('pl-PL', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </div>
          )}

          {assignees.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Users2 className="h-3 w-3" />
              <span>
                {assignees
                  .map((a) => `${a.user?.first_name ?? ''} ${a.user?.last_name ?? ''}`.trim())
                  .filter(Boolean)
                  .join(', ')}
              </span>
            </div>
          )}

          {showActions && (
            <div className="flex flex-wrap gap-2 mt-1 w-full">
              {isPending && (
                <div className="w-full space-y-2">
                  {!showRejectInput ? (
                    <div className="flex gap-2 w-full">
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        className="flex-1 text-green-400 hover:text-green-300"
                        onClick={() => updateAssignmentStatus(task.id, currentUserId, 'accepted')}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                        Akceptuj
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="flex-1 text-red-400 hover:text-red-300"
                        onClick={() => setShowRejectInput(true)}
                      >
                        <XCircle className="h-3.5 w-3.5 mr-1" />
                        Odrzuć
                      </Button>
                    </div>
                  ) : (
                    <form onSubmit={handleRejectSubmit} className="space-y-1.5 w-full">
                      <Input
                        type="text"
                        value={rejectReason}
                        onChange={(e) => setRejectReason(e.target.value)}
                        placeholder="Powód odrzucenia (opcjonalnie)..."
                        className="h-8 text-xs"
                        maxLength={200}
                        autoFocus
                      />
                      <div className="flex gap-1.5">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="flex-1 h-7 text-xs"
                          onClick={() => {
                            setShowRejectInput(false)
                            setRejectReason('')
                          }}
                        >
                          Anuluj
                        </Button>
                        <Button
                          type="submit"
                          size="sm"
                          variant="destructive"
                          className="flex-1 h-7 text-xs"
                        >
                          Potwierdź
                        </Button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {!isPending && !isRejected && canChangeStatus && task.status_id === 1 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-blue-400 border-blue-900 hover:bg-blue-900/30"
                  onClick={() => updateTaskStatus(task.id, 2)}
                >
                  <Clock className="h-3.5 w-3.5 mr-1" />
                  Zacznij
                </Button>
              )}

              {!isPending && !isRejected && canChangeStatus && task.status_id === 2 && (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="text-green-400 border-green-900 hover:bg-green-900/30"
                  onClick={() => updateTaskStatus(task.id, 3)}
                >
                  <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                  Oznacz jako zrobione
                </Button>
              )}

              {canDelete && task.status_id !== 4 && task.deleted_at == null && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="text-zinc-500 hover:text-red-400 ml-auto"
                  onClick={handleDeleteClick}
                  title="Przenieś zadanie do kosza"
                >
                  <XCircle className="h-3.5 w-3.5" />
                </Button>
              )}

              <div className="w-full flex items-center justify-between pt-1 border-t border-zinc-800 text-[11px] text-zinc-500">
                <span>{isCreator ? 'Jesteś twórcą' : 'Przypisane'}</span>
                {canShareOrDelegate && <ShareOrDelegateDialog task={task} />}
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      <ConfirmDialog
        open={confirmDeleteOpen}
        onOpenChange={(open) => {
          if (!open && !isDeleting) setConfirmDeleteOpen(false)
        }}
        title="Przenieść zadanie do kosza?"
        description={`Zadanie „${task.title}” zostanie przeniesione do kosza. Będzie można je później przywrócić.`}
        confirmLabel="Przenieś do kosza"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </>
  )
}
