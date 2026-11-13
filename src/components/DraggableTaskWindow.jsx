import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  ArrowLeft,
  Calendar,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  Minus,
  Users2,
  X,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { priorityVariantMap, statusVariantMap } from '../lib/constants'
import { canChangeTaskStatus, canDeleteTask } from '../lib/permissions'
import { ShareOrDelegateDialog } from './ShareOrDelegateDialog'
import { ConfirmDialog } from './shared/ConfirmDialog'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Tooltip, TooltipContent, TooltipTrigger } from './ui/tooltip'

/**
 * DraggableTaskWindow - Okno zadania w stylu macOS.
 */
export function DraggableTaskWindow({
  task,
  position,
  zIndex,
  onDragMove,
  onDragEnd,
  onFocus,
}) {
  const {
    priorities,
    taskStatuses,
    currentUser,
    currentUserId,
    updateTaskStatus,
    updateAssignmentStatus,
    deleteTask,
    getAssignees,
    assignments,
  } = useAppContext()

  const windowRef = useRef(null)
  const posRef = useRef(position)
  const isDraggingRef = useRef(false)
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [expandedDesc, setExpandedDesc] = useState(false)
  const [showRejectInput, setShowRejectInput] = useState(false)
  const [rejectReason, setRejectReason] = useState('')
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    if (!windowRef.current || isDraggingRef.current) return
    windowRef.current.style.left = `${position.x}px`
    windowRef.current.style.top = `${position.y}px`
    posRef.current = position
  }, [position])

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || !windowRef.current) return

      const newX = e.clientX - dragOffsetRef.current.x
      const newY = Math.max(8, e.clientY - dragOffsetRef.current.y)

      windowRef.current.style.left = `${newX}px`
      windowRef.current.style.top = `${newY}px`

      posRef.current = { x: newX, y: newY }
      onDragMove?.(e.clientX, e.clientY, task.id)
    }

    const handleMouseUp = (e) => {
      if (!isDraggingRef.current || !windowRef.current) return
      isDraggingRef.current = false

      windowRef.current.style.transition = ''
      windowRef.current.style.zIndex = ''
      windowRef.current.style.boxShadow = ''
      windowRef.current.style.transform = ''

      onDragEnd?.(task.id, posRef.current, e.clientX, e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [task.id, onDragMove, onDragEnd])

  const handleTitleBarMouseDown = useCallback(
    (e) => {
      if (e.button !== 0 || e.target.closest('button') || maximized) return

      onFocus?.()
      isDraggingRef.current = true

      dragOffsetRef.current = {
        x: e.clientX - posRef.current.x,
        y: e.clientY - posRef.current.y,
      }

      if (windowRef.current) {
        windowRef.current.style.zIndex = '9999'
        windowRef.current.style.transition = 'box-shadow 0.1s, transform 0.1s'
        windowRef.current.style.boxShadow = '0 24px 80px rgba(0,0,0,0.9)'
        windowRef.current.style.transform = 'scale(1.02)'
      }

      onDragMove?.(e.clientX, e.clientY, task.id)
      e.preventDefault()
    },
    [onFocus, onDragMove, maximized, task.id]
  )

  const myAssignment = assignments.find(
    (a) => a.task_id === task.id && a.employee_id === currentUserId
  )
  const myPriority = myAssignment
    ? priorities.find((p) => p.id === myAssignment.priority_id)
    : null
  const taskStatus = taskStatuses.find((s) => s.id === task.status_id)
  const assignees = getAssignees(task.id)
  const [now] = useState(() => Date.now())
  const dueDate = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && dueDate.getTime() < now && task.status_id !== 3 && task.status_id !== 4
  const isPending = myAssignment?.assignment_status === 'pending'
  const isRejected = myAssignment?.assignment_status === 'rejected'
  const isCreator = task.creator_id === currentUserId
  const rejectedAssignments = assignees.filter((a) => a.assignment_status === 'rejected')

  const canDelete = canDeleteTask(currentUser, task)
  const canChangeStatus = canChangeTaskStatus(currentUser, task, assignments)
  const canShareOrDelegate =
    canChangeStatus && !isPending && !isRejected && task.status_id !== 3 && task.status_id !== 4
  const compactCards = Boolean(currentUser?.preferences?.compact_cards)
  const confirmDeleteEnabled = currentUser?.preferences?.confirm_delete !== false

  const handleDeleteClick = (e) => {
    e.stopPropagation()
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
      <div
        ref={windowRef}
        style={
          maximized
            ? {
                position: 'fixed',
                left: '50%',
                top: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 99999,
                width: 440,
                maxWidth: '92vw',
                userSelect: 'none',
              }
            : {
                position: 'absolute',
                left: position.x,
                top: position.y,
                zIndex,
                width: 300,
                userSelect: 'none',
              }
        }
        className={`rounded-xl overflow-hidden border border-zinc-700/80 bg-zinc-900/95 backdrop-blur-sm shadow-[0_8px_32px_rgba(0,0,0,0.6)] ${
          maximized ? 'ring-2 ring-zinc-500/30' : ''
        }`}
        onMouseDown={() => onFocus?.()}
      >
        {/* TITLEBAR */}
        <div
          className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-800/90 border-b border-zinc-700/60 cursor-grab hover:cursor-grab active:cursor-grabbing select-none"
          onMouseDown={handleTitleBarMouseDown}
        >
          {/* Sygnalizatory macOS */}
          <div className="flex items-center gap-1.5 shrink-0">
            {canDelete ? (
              <button
                type="button"
                className="relative h-3 w-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors group"
                onClick={handleDeleteClick}
                title="Usuń zadanie (przeniesie do kosza)"
              >
                <X className="absolute inset-0 m-auto h-2 w-2 text-red-900 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ) : (
              <Tooltip>
                <TooltipTrigger asChild>
                  <span className="inline-flex items-center">
                    <button
                      type="button"
                      disabled
                      className="relative h-3 w-3 rounded-full bg-zinc-600/60 opacity-60 cursor-not-allowed"
                      aria-label="Brak uprawnień do usunięcia"
                    />
                  </span>
                </TooltipTrigger>
                <TooltipContent side="bottom">
                  Tylko twórca, dyrektor lub administrator może usunąć zadanie
                </TooltipContent>
              </Tooltip>
            )}

            <button
              type="button"
              className="relative h-3 w-3 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-colors group"
              onClick={(e) => {
                e.stopPropagation()
                setMinimized((v) => !v)
              }}
              title={minimized ? 'Rozwiń okno' : 'Minimalizuj okno'}
            >
              <Minus className="absolute inset-0 m-auto h-2 w-2 text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>

            <button
              type="button"
              className="relative h-3 w-3 rounded-full bg-green-500 hover:bg-green-400 transition-colors group"
              onClick={(e) => {
                e.stopPropagation()
                setMaximized((v) => !v)
              }}
              title={maximized ? 'Przywróć standardowy rozmiar' : 'Powiększ i wyśrodkuj'}
            >
              {maximized ? (
                <Minimize2 className="absolute inset-0 m-auto h-2 w-2 text-green-950 opacity-0 group-hover:opacity-100 transition-opacity" />
              ) : (
                <Maximize2 className="absolute inset-0 m-auto h-2 w-2 text-green-950 opacity-0 group-hover:opacity-100 transition-opacity" />
              )}
            </button>
          </div>

          <span className="text-xs font-medium text-zinc-200 flex-1 truncate">{task.title}</span>

          {isPending ? (
            <Badge variant="assign-pending" className="text-[11px] py-0 h-4 shrink-0">
              Oczekuje
            </Badge>
          ) : (
            taskStatus && (
              <Badge
                variant={statusVariantMap[task.status_id] || 'secondary'}
                className="text-[11px] py-0 h-4 shrink-0"
              >
                {taskStatus.name}
              </Badge>
            )
          )}
        </div>

        {/* BODY */}
        {!minimized && (
          <div className={compactCards ? 'p-2.5 space-y-2' : 'p-3 space-y-2.5'}>
            {myPriority && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-zinc-500">Priorytet:</span>
                <Badge variant={priorityVariantMap[myAssignment.priority_id]}>
                  {myPriority.name}
                </Badge>
              </div>
            )}

            {isPending && (
              <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-900/20 rounded-md px-2 py-1.5">
                <Clock className="h-3 w-3 shrink-0" />
                Oczekuje na Twoją decyzję
              </div>
            )}

            {isRejected && (
              <div className="flex items-center gap-1.5 text-xs text-red-400 bg-red-950/30 rounded-md px-2 py-1.5">
                <AlertTriangle className="h-3 w-3 shrink-0" />
                Odrzuciłeś to przypisanie
              </div>
            )}

            {task.short_desc && (
              <div className="space-y-1">
                <p className="text-xs text-zinc-300 leading-relaxed">{task.short_desc}</p>
                {task.full_desc && (
                  <div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setExpandedDesc((v) => !v)
                      }}
                      className="text-[11px] text-zinc-400 hover:text-zinc-200 underline underline-offset-2 transition-colors cursor-pointer"
                    >
                      {expandedDesc ? 'Zwiń szczegóły' : 'Pokaż pełny opis'}
                    </button>
                    {expandedDesc && (
                      <div className="mt-1.5 p-2 bg-zinc-950/60 rounded border border-zinc-800 text-[11px] text-zinc-400 leading-normal">
                        {task.full_desc}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {dueDate && (
              <div
                className={`flex items-center gap-1.5 text-xs ${
                  isOverdue ? 'text-red-400' : 'text-zinc-500'
                }`}
              >
                <Calendar className="h-3 w-3 shrink-0" />
                {isOverdue && <span className="font-medium">Po terminie!</span>}
                {dueDate.toLocaleDateString('pl-PL', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            )}

            {assignees.length > 0 && (
              <div className="flex items-center gap-1.5 text-xs text-zinc-500">
                <Users2 className="h-3 w-3 shrink-0" />
                <span className="truncate">
                  {assignees
                    .map((a) => `${a.user?.first_name ?? ''} ${a.user?.last_name ?? ''}`.trim())
                    .filter(Boolean)
                    .join(', ')}
                </span>
              </div>
            )}

            {isCreator && rejectedAssignments.length > 0 && (
              <div className="p-2 rounded-lg bg-red-950/40 border border-red-900/60 text-xs text-red-300 space-y-1">
                <div className="flex items-center gap-1.5 font-medium">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                  <span>Zlecenie odrzucone przez pracownika:</span>
                </div>
                {rejectedAssignments.map((ra) => (
                  <p key={ra.employee_id} className="text-[11px] text-red-400/90 pl-5">
                    • {ra.user?.first_name} {ra.user?.last_name}
                    {ra.rejection_reason ? `: „${ra.rejection_reason}”` : ''}
                  </p>
                ))}
              </div>
            )}

            {/* Akcje zmiany statusu */}
            {!isPending && !isRejected && canChangeStatus && (
              <div className="flex gap-2 pt-0.5">
                {task.status_id === 1 && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="flex-1 h-7 text-xs text-blue-400 border-blue-900/80 hover:bg-blue-900/30"
                    onClick={() => updateTaskStatus(task.id, 2)}
                  >
                    <Clock className="h-3 w-3 mr-1" />
                    Zacznij
                  </Button>
                )}
                {task.status_id === 2 && (
                  <>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-7 text-xs text-zinc-300 border-zinc-700 hover:bg-zinc-800 px-2"
                      onClick={() => updateTaskStatus(task.id, 1)}
                      title="Cofnij do „Do zrobienia”"
                    >
                      <ArrowLeft className="h-3 w-3 mr-1" />
                      Do zrobienia
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs text-green-400 border-green-900/80 hover:bg-green-900/30"
                      onClick={() => updateTaskStatus(task.id, 3)}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Gotowe
                    </Button>
                  </>
                )}
              </div>
            )}

            {/* Akcje dla przypisania oczekującego */}
            {isPending && (
              <div className="space-y-2 pt-0.5">
                {!showRejectInput ? (
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="flex-1 h-7 text-xs text-green-400 border-green-900/80 hover:bg-green-900/30"
                      onClick={() => updateAssignmentStatus(task.id, currentUserId, 'accepted')}
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Akceptuj
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="flex-1 h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => setShowRejectInput(true)}
                    >
                      <X className="h-3 w-3 mr-1" />
                      Odrzuć
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleRejectSubmit} className="space-y-1.5">
                    <Input
                      type="text"
                      value={rejectReason}
                      onChange={(e) => setRejectReason(e.target.value)}
                      placeholder="Powód odrzucenia (opcjonalnie)..."
                      className="h-7 text-xs"
                      maxLength={200}
                      autoFocus
                    />
                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        className="flex-1 h-6 text-[11px]"
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
                        className="flex-1 h-6 text-[11px]"
                      >
                        Potwierdź
                      </Button>
                    </div>
                  </form>
                )}
              </div>
            )}

            {/* Stopka z informacją o roli i opcją Przekaż / Udostępnij */}
            <div className="pt-2 flex items-center justify-between border-t border-zinc-800/70 text-[11px] text-zinc-500">
              <span>{isCreator ? 'Jesteś twórcą' : 'Zadanie przypisane'}</span>
              {canShareOrDelegate && <ShareOrDelegateDialog task={task} />}
            </div>
          </div>
        )}
      </div>

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
