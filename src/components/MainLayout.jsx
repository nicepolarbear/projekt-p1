import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Archive,
  CheckCheck,
  ChevronLeft,
  ChevronRight,
  ClipboardList,
  Circle,
  LayoutGrid,
  ShieldBan,
  Trash2,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { useDesktopLayout } from '../hooks/useDesktopLayout'
import { useToast } from '../hooks/useToast'
import { statusVariantMap } from '../lib/constants'
import { canChangeTaskStatus, canDeleteTask, canRestoreTask } from '../lib/permissions'
import { DraggableTaskWindow } from './DraggableTaskWindow'
import { ConfirmDialog } from './shared/ConfirmDialog'
import { TaskCard } from './TaskCard'
import { Badge } from './ui/badge'
import { Button } from './ui/button'

/**
 * MainLayout - główna strefa robocza pulpitu zadań inspirowana macOS.
 */
export function MainLayout() {
  const {
    currentUser,
    currentUserId,
    myActiveTasks,
    myDeletedTasks,
    assignments,
    restoreTask,
    deleteTask,
    updateTaskStatus,
    focusedTaskId,
    clearFocusedTask,
  } = useAppContext()

  const { toast } = useToast()

  const {
    windowPositions,
    windowZIndices,
    bringToFront,
    updateWindowPosition,
    arrangeWindows,
  } = useDesktopLayout(currentUserId)

  const autoOpenTodo = Boolean(currentUser?.preferences?.auto_open_todo)
  const compactCards = Boolean(currentUser?.preferences?.compact_cards)
  const confirmDeleteEnabled = currentUser?.preferences?.confirm_delete !== false

  // Stan widoczności paneli bocznych
  const [leftPanelOpen, setLeftPanelOpen] = useState(autoOpenTodo)
  const [rightPanel, setRightPanel] = useState(null) // null | 'done' | 'trash'
  const prevUserIdRef = useRef(currentUserId)

  useEffect(() => {
    if (prevUserIdRef.current !== currentUserId) {
      prevUserIdRef.current = currentUserId
      setLeftPanelOpen(Boolean(currentUser?.preferences?.auto_open_todo))
    }
  }, [currentUserId, currentUser?.preferences?.auto_open_todo])

  // Stan pulpitu okien
  const desktopRef = useRef(null)
  const [draggingTaskId, setDraggingTaskId] = useState(null)
  const [hoveredDropZone, setHoveredDropZone] = useState(null) // null | 'todo' | 'done' | 'trash'
  const [isDesktopDragOver, setIsDesktopDragOver] = useState(false)
  const [pendingDeleteTask, setPendingDeleteTask] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // Zadania pogrupowane wg statusu
  const todoTasks = myActiveTasks.filter((t) => t.status_id === 1)
  const inProgressTasks = myActiveTasks.filter((t) => t.status_id === 2)
  const doneTasks = myActiveTasks.filter((t) => t.status_id === 3)

  const isDraggingTask = draggingTaskId !== null
  const draggedTask = isDraggingTask
    ? myActiveTasks.find((t) => t.id === draggingTaskId) || null
    : null
  const canDeleteDragged = draggedTask ? canDeleteTask(currentUser, draggedTask) : false
  const canChangeStatusDragged = draggedTask
    ? canChangeTaskStatus(currentUser, draggedTask, assignments)
    : false

  // Reagowanie na otwarcie / fokus zadania z powiadomienia na żywo lub Centrum Powiadomień
  useEffect(() => {
    if (!focusedTaskId) return
    const id = Number(focusedTaskId) || focusedTaskId

    const inProgress = inProgressTasks.some((t) => t.id === id)
    if (inProgress) {
      bringToFront(id)
    } else {
      const isTodo = todoTasks.some((t) => t.id === id)
      if (isTodo) {
        setLeftPanelOpen(true)
      } else {
        const isDone = doneTasks.some((t) => t.id === id)
        if (isDone) {
          setRightPanel('done')
        } else {
          const isDeleted = myDeletedTasks.some((t) => t.id === id)
          if (isDeleted) {
            setRightPanel('trash')
          }
        }
      }
    }
    clearFocusedTask()
  }, [
    focusedTaskId,
    inProgressTasks,
    todoTasks,
    doneTasks,
    myDeletedTasks,
    bringToFront,
    clearFocusedTask,
  ])

  // Obliczanie początkowej pozycji okna na pulpicie
  const getInitialPosition = useCallback(
    (taskId, index) => {
      if (windowPositions[taskId]) return windowPositions[taskId]
      const col = index % 3
      const row = Math.floor(index / 3)
      return {
        x: 60 + col * 330,
        y: 50 + row * 260,
      }
    },
    [windowPositions]
  )

  const autoArrangeWindows = useCallback(() => {
    arrangeWindows(inProgressTasks)
  }, [arrangeWindows, inProgressTasks])

  // Obsługa ruchu myszy podczas przeciągania okna
  const handleDragMove = useCallback((mouseX, mouseY, taskId) => {
    if (taskId != null) {
      setDraggingTaskId(taskId)
    }
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    if (mouseX < 200) {
      setHoveredDropZone('todo')
    } else if (mouseX > screenWidth - 220) {
      if (mouseY < screenHeight / 2) {
        setHoveredDropZone('done')
      } else {
        setHoveredDropZone('trash')
      }
    } else {
      setHoveredDropZone(null)
    }
  }, [])

  // Zakończenie przeciągania okna
  const handleDragEnd = useCallback(
    (taskId, finalPos, mouseX, mouseY) => {
      setDraggingTaskId(null)
      setHoveredDropZone(null)

      const task = myActiveTasks.find((t) => t.id === taskId) || null
      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight

      // Upuszczenie w strefie "Do zrobienia" (lewa krawędź)
      if (mouseX < 200) {
        if (!task || !canChangeTaskStatus(currentUser, task, assignments)) {
          toast({
            title: 'Brak uprawnień',
            description: 'Nie możesz zmienić statusu tego zadania.',
            variant: 'warning',
          })
          return
        }
        void updateTaskStatus(taskId, 1)
        return
      }

      // Upuszczenie w prawej strefie
      if (mouseX > screenWidth - 220) {
        if (mouseY < screenHeight / 2) {
          // Górna połowa: Zrobione
          if (!task || !canChangeTaskStatus(currentUser, task, assignments)) {
            toast({
              title: 'Brak uprawnień',
              description: 'Nie możesz ukończyć tego zadania.',
              variant: 'warning',
            })
            return
          }
          void updateTaskStatus(taskId, 3)
        } else {
          // Dolna połowa: Kosz
          if (!task || !canDeleteTask(currentUser, task)) {
            toast({
              title: 'Brak uprawnień',
              description: 'Tylko twórca, dyrektor lub administrator może usunąć zadanie.',
              variant: 'warning',
            })
            return
          }
          if (confirmDeleteEnabled) {
            setPendingDeleteTask(task)
          } else {
            void deleteTask(taskId)
          }
        }
        return
      }

      // Upuszczenie na pulpicie - zapamiętujemy nowe współrzędne
      updateWindowPosition(taskId, finalPos)
    },
    [
      myActiveTasks,
      currentUser,
      assignments,
      confirmDeleteEnabled,
      updateTaskStatus,
      deleteTask,
      updateWindowPosition,
      toast,
    ]
  )

  // Obsługa przeciągania karty z panelu "Do zrobienia" na pulpit
  const handleDesktopDragOver = (e) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (!isDesktopDragOver) setIsDesktopDragOver(true)
  }

  const handleDesktopDragLeave = (e) => {
    if (e.currentTarget.contains(e.relatedTarget)) return
    setIsDesktopDragOver(false)
  }

  const handleDesktopDrop = (e) => {
    e.preventDefault()
    setIsDesktopDragOver(false)
    const taskIdStr = e.dataTransfer.getData('text/plain')
    if (!taskIdStr) return

    const taskId = Number(taskIdStr)
    if (!taskId) return

    const task = myActiveTasks.find((t) => t.id === taskId)
    if (!task || task.deleted_at != null || task.status_id === 4) return

    const myAssignment = assignments.find(
      (a) => a.task_id === taskId && a.employee_id === currentUserId
    )
    const isPrivileged =
      task.creator_id === currentUserId ||
      currentUser?.role === 'admin' ||
      currentUser?.role === 'dyrektor'
    const isPendingOrRejected =
      myAssignment?.assignment_status === 'pending' ||
      myAssignment?.assignment_status === 'rejected'

    if (
      !canChangeTaskStatus(currentUser, task, assignments) ||
      (!isPrivileged && isPendingOrRejected)
    ) {
      toast({
        title: 'Nie można rozpocząć zadania',
        description: 'Zaakceptuj przypisanie lub uzyskaj uprawnienia przed rozpoczęciem.',
        variant: 'warning',
      })
      return
    }

    const rect = desktopRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    const x = Math.max(30, Math.min((rect.width || 800) - 340, e.clientX - rect.left - 150))
    const y = Math.max(50, Math.min((rect.height || 600) - 200, e.clientY - rect.top - 25))

    updateWindowPosition(taskId, { x, y })
    bringToFront(taskId)
    if (task.status_id !== 2) {
      void updateTaskStatus(taskId, 2)
    }
  }

  const handleConfirmDelete = async () => {
    if (!pendingDeleteTask || isDeleting) return
    setIsDeleting(true)
    try {
      await deleteTask(pendingDeleteTask.id)
      setPendingDeleteTask(null)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="flex flex-1 min-h-0 relative overflow-hidden">
      {/* ──────────────────────────────────────
          LEWY PANEL - "Do zrobienia"
          ────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setLeftPanelOpen((v) => !v)}
        className={`
          absolute left-0 top-0 bottom-0 z-30
          w-10 flex flex-col items-center justify-center gap-1
          bg-zinc-900/80 hover:bg-zinc-800/90 border-r border-zinc-800
          transition-colors group
          ${leftPanelOpen ? 'hidden' : ''}
        `}
        title="Zadania do zrobienia"
      >
        <ChevronRight className="h-4 w-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
        {todoTasks.length > 0 && (
          <Badge variant="status-todo" className="text-xs px-1.5 py-0.5 rotate-0">
            {todoTasks.length}
          </Badge>
        )}
        <span className="text-xs text-zinc-600 [writing-mode:vertical-rl] mt-1">
          Do zrobienia
        </span>
      </button>

      <div
        className={`
          absolute left-0 top-0 bottom-0 z-40
          w-72 bg-zinc-900 border-r border-zinc-700
          flex flex-col
          transition-transform duration-300 ease-in-out shadow-2xl
          ${leftPanelOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-zinc-400" />
            <span className="text-sm font-medium text-zinc-200">Do zrobienia</span>
            {todoTasks.length > 0 && (
              <Badge variant="status-todo">{todoTasks.length}</Badge>
            )}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setLeftPanelOpen(false)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {todoTasks.length === 0 ? (
            <div className="text-center py-8 text-zinc-600 text-sm">
              <Circle className="h-8 w-8 mx-auto mb-2 opacity-30" />
              Brak zadań do zrobienia
            </div>
          ) : (
            todoTasks.map((task) => (
              <TaskCard key={task.id} task={task} compact={compactCards} />
            ))
          )}
        </div>
      </div>

      {/* ──────────────────────────────────────
          ŚRODKOWY OBSZAR - "PULPIT ZADAŃ"
          ────────────────────────────────────── */}
      <main
        ref={desktopRef}
        onDragOver={handleDesktopDragOver}
        onDragLeave={handleDesktopDragLeave}
        onDrop={handleDesktopDrop}
        className={`
          flex-1 relative overflow-hidden bg-zinc-950 select-none
          ml-10 mr-10
          bg-[radial-gradient(#3f3f46_1px,transparent_1px)] [background-size:24px_24px]
          transition-colors duration-200
          ${isDesktopDragOver ? 'ring-2 ring-inset ring-blue-500/40 bg-zinc-900/50' : ''}
        `}
      >
        {/* Pasek statusu / nagłówek pulpitu */}
        <div className="absolute top-3 left-4 right-4 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex items-center gap-2 bg-zinc-900/80 backdrop-blur-md px-3 py-1.5 rounded-lg border border-zinc-800 text-xs text-zinc-400 pointer-events-auto shadow-sm">
            <span className="font-medium text-zinc-200">Pulpit zadań</span>
            <span className="text-zinc-600">•</span>
            <Badge variant={statusVariantMap[2]} className="text-[11px] py-0 px-2 h-4">
              {inProgressTasks.length} w trakcie
            </Badge>
            <span className="hidden md:inline text-zinc-500 text-[11px] ml-2">
              Chwyć okno za pasek tytułu, aby je przesunąć
            </span>
          </div>

          {inProgressTasks.length > 1 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={autoArrangeWindows}
              className="pointer-events-auto h-7 text-xs bg-zinc-900/80 backdrop-blur-md border-zinc-800 hover:bg-zinc-800 text-zinc-300 gap-1.5 shadow-sm"
              title="Ułóż wszystkie okna w kafelki"
            >
              <LayoutGrid className="h-3.5 w-3.5 text-zinc-400" />
              Uporządkuj okna
            </Button>
          )}
        </div>

        {/* Strefa upuszczenia: Lewa krawędź (Do zrobienia) */}
        <div
          className={`
            absolute left-0 top-0 bottom-0 w-44 z-20 pointer-events-none
            flex flex-col items-center justify-center gap-3 p-4
            border-r-2 border-dashed transition-all duration-200
            ${
              !isDraggingTask
                ? 'hidden'
                : !canChangeStatusDragged
                  ? 'bg-zinc-950/60 border-zinc-800 text-zinc-600 opacity-50 backdrop-blur-[2px]'
                  : hoveredDropZone === 'todo'
                    ? 'bg-blue-950/70 border-blue-400 text-blue-200 backdrop-blur-sm shadow-[inset_-20px_0_40px_rgba(30,58,138,0.3)]'
                    : 'bg-zinc-950/40 border-zinc-700/60 text-zinc-500 backdrop-blur-[2px]'
            }
          `}
        >
          <div
            className={`p-3 rounded-full transition-transform ${
              canChangeStatusDragged && hoveredDropZone === 'todo'
                ? 'bg-blue-500/25 scale-110'
                : 'bg-zinc-800'
            }`}
          >
            {canChangeStatusDragged ? (
              <ChevronLeft className="h-6 w-6" />
            ) : (
              <ShieldBan className="h-6 w-6" />
            )}
          </div>
          <div className="text-center">
            <p className="text-xs font-semibold">Do zrobienia</p>
            <p className="text-[10px] opacity-75">
              {canChangeStatusDragged ? 'Upuść, aby cofnąć status' : 'Brak uprawnień'}
            </p>
          </div>
        </div>

        {/* Strefa upuszczenia: Prawa krawędź (Zrobione / Kosz) */}
        <div
          className={`
            absolute right-0 top-0 bottom-0 w-48 z-20 pointer-events-none
            flex flex-col transition-all duration-200
            ${isDraggingTask ? 'flex' : 'hidden'}
          `}
        >
          {/* Górna połowa: Zrobione */}
          <div
            className={`
              flex-1 flex flex-col items-center justify-center gap-2 p-3
              border-l-2 border-b border-dashed transition-all duration-200
              ${
                !canChangeStatusDragged
                  ? 'bg-zinc-950/60 border-zinc-800 text-zinc-600 opacity-50 backdrop-blur-[2px]'
                  : hoveredDropZone === 'done'
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 backdrop-blur-sm shadow-[inset_20px_0_40px_rgba(6,95,70,0.3)]'
                    : 'bg-zinc-950/40 border-zinc-700/60 text-zinc-500 backdrop-blur-[2px]'
              }
            `}
          >
            <div
              className={`p-2.5 rounded-full transition-transform ${
                canChangeStatusDragged && hoveredDropZone === 'done'
                  ? 'bg-emerald-500/25 scale-110'
                  : 'bg-zinc-800'
              }`}
            >
              {canChangeStatusDragged ? (
                <CheckCheck className="h-5 w-5" />
              ) : (
                <ShieldBan className="h-5 w-5" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold">Zrobione</p>
              <p className="text-[10px] opacity-75">
                {canChangeStatusDragged ? 'Upuść, aby ukończyć' : 'Brak uprawnień'}
              </p>
            </div>
          </div>

          {/* Dolna połowa: Kosz */}
          <div
            className={`
              flex-1 flex flex-col items-center justify-center gap-2 p-3
              border-l-2 border-t border-dashed transition-all duration-200
              ${
                !canDeleteDragged
                  ? 'bg-zinc-950/60 border-zinc-800 text-zinc-600 opacity-50 backdrop-blur-[2px]'
                  : hoveredDropZone === 'trash'
                    ? 'bg-red-950/80 border-red-400 text-red-200 backdrop-blur-sm shadow-[inset_20px_0_40px_rgba(153,27,27,0.3)]'
                    : 'bg-zinc-950/40 border-zinc-700/60 text-zinc-500 backdrop-blur-[2px]'
              }
            `}
          >
            <div
              className={`p-2.5 rounded-full transition-transform ${
                canDeleteDragged && hoveredDropZone === 'trash'
                  ? 'bg-red-500/25 scale-110'
                  : 'bg-zinc-800'
              }`}
            >
              {canDeleteDragged ? (
                <Trash2 className="h-5 w-5" />
              ) : (
                <ShieldBan className="h-5 w-5" />
              )}
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold">Kosz</p>
              <p className="text-[10px] opacity-75">
                {canDeleteDragged ? 'Upuść, aby usunąć' : 'Brak uprawnień'}
              </p>
            </div>
          </div>
        </div>

        {/* Podpowiedź, gdy przeciągamy element z panelu lewego na pulpit */}
        {isDesktopDragOver && (
          <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
            <div className="bg-blue-950/80 border border-blue-500/80 text-blue-200 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-pulse">
              <ClipboardList className="h-5 w-5 text-blue-400" />
              <span className="text-sm font-medium">
                Upuść tutaj, aby rozpocząć realizację zadania na pulpicie
              </span>
            </div>
          </div>
        )}

        {/* Stan pusty - brak zadań w trakcie */}
        {inProgressTasks.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
            <div className="text-center max-w-md p-8 rounded-2xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur-sm pointer-events-auto">
              <div className="w-16 h-16 rounded-2xl bg-zinc-800/70 border border-zinc-700/50 flex items-center justify-center mx-auto mb-4 text-zinc-400 shadow-inner">
                <LayoutGrid className="h-8 w-8 text-zinc-400" />
              </div>
              <h2 className="text-base font-medium text-zinc-200">Pulpit jest pusty</h2>
              <p className="text-xs text-zinc-500 mt-1.5 leading-relaxed">
                Przeciągnij zadanie z panelu{' '}
                <span className="text-zinc-300 font-medium">„Do zrobienia”</span> po lewej na
                pulpit lub kliknij przycisk{' '}
                <span className="text-blue-400 font-medium">„Zacznij”</span>, aby otworzyć okno
                zadania.
              </p>
              {!leftPanelOpen && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="mt-4 text-xs"
                  onClick={() => setLeftPanelOpen(true)}
                >
                  <ChevronRight className="h-3.5 w-3.5 mr-1" />
                  Otwórz panel zadań
                </Button>
              )}
            </div>
          </div>
        ) : (
          inProgressTasks.map((task, index) => {
            const pos = getInitialPosition(task.id, index)
            const zIndex = windowZIndices[task.id] || 20 + index
            return (
              <DraggableTaskWindow
                key={task.id}
                task={task}
                position={pos}
                zIndex={zIndex}
                onFocus={() => bringToFront(task.id)}
                onDragMove={handleDragMove}
                onDragEnd={handleDragEnd}
              />
            )
          })
        )}
      </main>

      {/* ──────────────────────────────────────
          PRAWY PANEL - "Zrobione" i "Kosz"
          ────────────────────────────────────── */}
      <div
        className={`
          absolute right-0 top-0 bottom-0 z-30
          w-10 flex flex-col items-center justify-center gap-4
          bg-zinc-900/80 border-l border-zinc-800
          ${rightPanel !== null ? 'hidden' : ''}
        `}
      >
        <button
          type="button"
          onClick={() => setRightPanel('done')}
          className="flex flex-col items-center gap-1 group"
          title="Zrobione"
        >
          <CheckCheck className="h-4 w-4 text-zinc-500 group-hover:text-green-400 transition-colors" />
          {doneTasks.length > 0 && (
            <Badge variant="status-done" className="text-xs px-1.5 py-0.5">
              {doneTasks.length}
            </Badge>
          )}
          <span className="text-xs text-zinc-600 [writing-mode:vertical-rl]">Zrobione</span>
        </button>

        <button
          type="button"
          onClick={() => setRightPanel('trash')}
          className="flex flex-col items-center gap-1 group"
          title="Kosz"
        >
          <Trash2 className="h-4 w-4 text-zinc-500 group-hover:text-red-400 transition-colors" />
          {myDeletedTasks.length > 0 && (
            <Badge variant="destructive" className="text-xs px-1.5 py-0.5">
              {myDeletedTasks.length}
            </Badge>
          )}
          <span className="text-xs text-zinc-600 [writing-mode:vertical-rl]">Kosz</span>
        </button>
      </div>

      <div
        className={`
          absolute right-0 top-0 bottom-0 z-40
          w-72 bg-zinc-900 border-l border-zinc-700
          flex flex-col
          transition-transform duration-300 ease-in-out shadow-2xl
          ${rightPanel !== null ? 'translate-x-0' : 'translate-x-full'}
        `}
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            {rightPanel === 'done' ? (
              <>
                <CheckCheck className="h-4 w-4 text-green-500" />
                <span className="text-sm font-medium text-zinc-200">Zrobione</span>
                <Badge variant="status-done">{doneTasks.length}</Badge>
              </>
            ) : (
              <>
                <Trash2 className="h-4 w-4 text-red-500" />
                <span className="text-sm font-medium text-zinc-200">Kosz</span>
                <Badge variant="destructive">{myDeletedTasks.length}</Badge>
              </>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => setRightPanel(rightPanel === 'done' ? 'trash' : 'done')}
            >
              {rightPanel === 'done' ? 'Kosz' : 'Zrobione'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setRightPanel(null)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-3 space-y-2">
          {rightPanel === 'done' &&
            (doneTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">
                <CheckCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Brak ukończonych zadań
              </div>
            ) : (
              doneTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  compact={compactCards}
                  showActions={false}
                />
              ))
            ))}

          {rightPanel === 'trash' &&
            (myDeletedTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">
                <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Kosz jest pusty
              </div>
            ) : (
              myDeletedTasks.map((task) => {
                const allowRestore = canRestoreTask(currentUser, task)
                return (
                  <div key={task.id} className="space-y-1">
                    <TaskCard task={task} compact={compactCards} showActions={false} />
                    {allowRestore && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="w-full text-xs text-zinc-500 hover:text-green-400"
                        onClick={() => restoreTask(task.id)}
                      >
                        <Archive className="h-3 w-3 mr-1" />
                        Przywróć
                      </Button>
                    )}
                  </div>
                )
              })
            ))}
        </div>
      </div>

      <ConfirmDialog
        open={Boolean(pendingDeleteTask)}
        onOpenChange={(open) => {
          if (!open && !isDeleting) {
            setPendingDeleteTask(null)
          }
        }}
        title="Przenieść zadanie do kosza?"
        description={
          pendingDeleteTask
            ? `Zadanie „${pendingDeleteTask.title}” zostanie przeniesione do kosza. Będzie można je później przywrócić.`
            : ''
        }
        confirmLabel="Przenieś do kosza"
        variant="destructive"
        loading={isDeleting}
        onConfirm={handleConfirmDelete}
      />
    </div>
  )
}
