import { useCallback, useRef, useState } from 'react'
import {
  Archive, ChevronLeft, ChevronRight, CheckCheck, Trash2,
  ClipboardList, Circle, User2, ChevronDown, LayoutGrid,
} from 'lucide-react'
import { useAppContext } from '../context/AppContext'
import { TaskCard } from './TaskCard'
import { DraggableTaskWindow } from './DraggableTaskWindow'
import { AddTaskDialog } from './AddTaskDialog'
import { Button } from './ui/button'
import { Badge } from './ui/badge'

/**
 * MainLayout - główny układ aplikacji inspirowany macOS.
 * 
 * Struktura:
 * ┌────────────────────────────────────────────────────────┐
 * │  TopBar (pasek górny: logo, user, dev switcher, dodaj) │
 * ├────────────────────────────────────────────────────────┤
 * │  [<]  │     PULPIT ROBOCZY (W trakcie)         │  [>]  │
 * │       │     Pływające okna macOS               │       │
 * │ Btn   │     - Przeciąganie myszką po kanwie    │  Btn  │
 * │ todo  │     - Upuszczanie na lewo: Do zrobienia│ done/ │
 * │       │     - Upuszczanie na prawo: Zrobione   │ trash │
 * └────────────────────────────────────────────────────────┘
 */
export function MainLayout() {
  const {
    currentUser,
    currentUserId,
    setCurrentUserId,
    users,
    myActiveTasks,
    myDeletedTasks,
    restoreTask,
    deleteTask,
    updateTaskStatus,
  } = useAppContext()

  // Stan widoczności paneli bocznych
  const [leftPanelOpen, setLeftPanelOpen] = useState(false)
  const [rightPanel, setRightPanel] = useState(null) // null | 'done' | 'trash'

  // Stan pulpitu okien
  const desktopRef = useRef(null)
  const [windowPositions, setWindowPositions] = useState({})
  const [windowZIndices, setWindowZIndices] = useState({})
  const [, setTopZIndex] = useState(20)
  const [isDraggingTask, setIsDraggingTask] = useState(false)
  const [hoveredDropZone, setHoveredDropZone] = useState(null) // null | 'todo' | 'done' | 'trash'
  const [isDesktopDragOver, setIsDesktopDragOver] = useState(false)

  // Zadania pogrupowane wg statusu
  const todoTasks = myActiveTasks.filter(t => t.status_id === 1)
  const inProgressTasks = myActiveTasks.filter(t => t.status_id === 2)
  const doneTasks = myActiveTasks.filter(t => t.status_id === 3)

  // Przesunięcie okna na wierzch (najwyższy z-index)
  const bringToFront = useCallback((taskId) => {
    setTopZIndex((prev) => {
      const nextZ = prev + 1
      setWindowZIndices((map) => ({ ...map, [taskId]: nextZ }))
      return nextZ
    })
  }, [])

  // Obliczanie początkowej pozycji okna na pulpicie
  const getInitialPosition = useCallback((taskId, index) => {
    if (windowPositions[taskId]) return windowPositions[taskId]
    const col = index % 3
    const row = Math.floor(index / 3)
    return {
      x: 60 + col * 330,
      y: 50 + row * 260,
    }
  }, [windowPositions])

  // Automatyczne uporządkowanie okien w siatkę
  const autoArrangeWindows = useCallback(() => {
    const nextPositions = {}
    inProgressTasks.forEach((task, index) => {
      const col = index % 3
      const row = Math.floor(index / 3)
      nextPositions[task.id] = {
        x: 60 + col * 330,
        y: 50 + row * 260,
      }
    })
    setWindowPositions(nextPositions)
  }, [inProgressTasks])

  // Obsługa ruchu myszy podczas przeciągania okna
  const handleDragMove = useCallback((mouseX, mouseY) => {
    setIsDraggingTask(true)
    const screenWidth = window.innerWidth
    const screenHeight = window.innerHeight

    // Lewa strefa upuszczenia (Do zrobienia)
    if (mouseX < 200) {
      setHoveredDropZone('todo')
    }
    // Prawa strefa upuszczenia (Zrobione / Kosz)
    else if (mouseX > screenWidth - 220) {
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
      setIsDraggingTask(false)
      setHoveredDropZone(null)

      const screenWidth = window.innerWidth
      const screenHeight = window.innerHeight

      // Upuszczenie w strefie "Do zrobienia" (lewa krawędź)
      if (mouseX < 200) {
        updateTaskStatus(taskId, 1)
      }
      // Upuszczenie w prawej strefie
      else if (mouseX > screenWidth - 220) {
        if (mouseY < screenHeight / 2) {
          // Górna połowa: Zrobione
          updateTaskStatus(taskId, 3)
        } else {
          // Dolna połowa: Kosz
          deleteTask(taskId)
        }
      }
      // Upuszczenie na pulpicie - zapamiętujemy nowe współrzędne
      else {
        setWindowPositions((prev) => ({
          ...prev,
          [taskId]: finalPos,
        }))
      }
    },
    [updateTaskStatus, deleteTask]
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

    const rect = desktopRef.current?.getBoundingClientRect() || { left: 0, top: 0 }
    const x = Math.max(30, Math.min((rect.width || 800) - 340, e.clientX - rect.left - 150))
    const y = Math.max(50, Math.min((rect.height || 600) - 200, e.clientY - rect.top - 25))

    setWindowPositions((prev) => ({
      ...prev,
      [taskId]: { x, y },
    }))
    bringToFront(taskId)
    updateTaskStatus(taskId, 2)
  }

  return (
    <div className="flex flex-col h-screen bg-zinc-950 overflow-hidden">

      {/* ══════════════════════════════════════════
          TOP BAR - pasek górny w stylu macOS
          ══════════════════════════════════════════ */}
      <header className="flex items-center justify-between px-4 py-2.5 bg-zinc-900 border-b border-zinc-800 shrink-0">

        {/* Lewa strona: "Sygnalizatory" macOS + nazwa aplikacji */}
        <div className="flex items-center gap-3">
          
          <span className="text-sm font-medium text-zinc-300 ml-1">TaskFlow</span>
        </div>

        {/* Prawa strona: informacja o zalogowanym + przełącznik (dev mode) */}
        <div className="flex items-center gap-3">
          {/* Aktualny użytkownik */}
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-full bg-zinc-700 flex items-center justify-center">
              <User2 className="h-4 w-4 text-zinc-400" />
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-xs font-medium text-zinc-200 leading-none">
                {currentUser?.first_name} {currentUser?.last_name}
              </p>
              <p className="text-xs text-zinc-500 leading-none mt-0.5">
                {currentUser?.position?.name}
              </p>
            </div>
          </div>

          {/* Przełącznik użytkownika - TYLKO w trybie developerskim (mock) */}
          <div className="relative group">
            <Button variant="ghost" size="sm" className="text-xs text-zinc-500 h-7 px-2 gap-1">
              Dev: Zmień usera <ChevronDown className="h-3 w-3" />
            </Button>
            {/* Dropdown pojawia się przy hover grupy */}
            <div className="absolute right-0 top-full mt-1 w-48 rounded-lg border border-zinc-700 bg-zinc-800 shadow-xl z-50 hidden group-hover:block">
              {users.map(user => (
                <button
                  key={user.id}
                  className={`
                    w-full text-left px-3 py-2 text-xs hover:bg-zinc-700 transition-colors
                    ${user.id === currentUserId ? 'text-zinc-100' : 'text-zinc-400'}
                    first:rounded-t-lg last:rounded-b-lg
                  `}
                  onClick={() => setCurrentUserId(user.id)}
                >
                  <span className="font-medium">{user.first_name} {user.last_name}</span>
                  <br />
                  <span className="text-zinc-500">{
                    // Łączymy users z positions inline (bez importu)
                    ['', 'Dyrektor', 'Project Manager', 'Senior Dev', 'Junior Dev'][user.position_id]
                  } (lvl {user.position_id})</span>
                </button>
              ))}
            </div>
          </div>

          {/* Przycisk "Nowe zadanie" */}
          <AddTaskDialog />
        </div>
      </header>

      {/* ══════════════════════════════════════════
          GŁÓWNA STREFA ROBOCZA
          ══════════════════════════════════════════ */}
      <div className="flex flex-1 relative overflow-hidden">

        {/* ──────────────────────────────────────
            LEWY PANEL - "Do zrobienia"
            Wysuwa się z lewej krawędzi
            ────────────────────────────────────── */}

        {/* Trigger button: pionowy pasek po lewej */}
        <button
          onClick={() => setLeftPanelOpen(v => !v)}
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
          {/* Licznik */}
          {todoTasks.length > 0 && (
            <Badge variant="status-todo" className="text-xs px-1.5 py-0.5 rotate-0">
              {todoTasks.length}
            </Badge>
          )}
          {/* Pionowy napis */}
          <span className="text-xs text-zinc-600 [writing-mode:vertical-rl] mt-1">Do zrobienia</span>
        </button>

        {/* Panel wysuwnięty */}
        <div className={`
          absolute left-0 top-0 bottom-0 z-40
          w-72 bg-zinc-900 border-r border-zinc-700
          flex flex-col
          transition-transform duration-300 ease-in-out shadow-2xl
          ${leftPanelOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
          {/* Nagłówek panelu */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800">
            <div className="flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-zinc-400" />
              <span className="text-sm font-medium text-zinc-200">Do zrobienia</span>
              {todoTasks.length > 0 && (
                <Badge variant="status-todo">{todoTasks.length}</Badge>
              )}
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setLeftPanelOpen(false)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>

          {/* Lista zadań */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {todoTasks.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">
                <Circle className="h-8 w-8 mx-auto mb-2 opacity-30" />
                Brak zadań do zrobienia
              </div>
            ) : (
              todoTasks.map(task => (
                <TaskCard key={task.id} task={task} compact />
              ))
            )}
          </div>
        </div>

        {/* Overlay zamykający panel po kliknięciu poza nim - USUNIĘTY celowo:
            Panel zamyka się tylko przyciskiem < lub przyciskiem trigger po lewej */}

        {/* ──────────────────────────────────────
            ŚRODKOWY OBSZAR - "PULPIT ZADAŃ"
            Kanwa w stylu macOS z pływającymi oknami
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
              <Badge variant="status-progress" className="text-[11px] py-0 px-2 h-4">
                {inProgressTasks.length} w trakcie
              </Badge>
              <span className="hidden md:inline text-zinc-500 text-[11px] ml-2">
                Chwyć okno za pasek tytułu, aby je przesunąć
              </span>
            </div>

            {inProgressTasks.length > 1 && (
              <Button
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
                hoveredDropZone === 'todo'
                  ? 'bg-blue-950/70 border-blue-400 text-blue-200 backdrop-blur-sm shadow-[inset_-20px_0_40px_rgba(30,58,138,0.3)]'
                  : isDraggingTask
                  ? 'bg-zinc-950/40 border-zinc-700/60 text-zinc-500 backdrop-blur-[2px]'
                  : 'hidden'
              }
            `}
          >
            <div
              className={`p-3 rounded-full transition-transform ${
                hoveredDropZone === 'todo' ? 'bg-blue-500/25 scale-110' : 'bg-zinc-800'
              }`}
            >
              <ChevronLeft className="h-6 w-6" />
            </div>
            <div className="text-center">
              <p className="text-xs font-semibold">Do zrobienia</p>
              <p className="text-[10px] opacity-75">Upuść, aby cofnąć status</p>
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
                  hoveredDropZone === 'done'
                    ? 'bg-emerald-950/80 border-emerald-400 text-emerald-200 backdrop-blur-sm shadow-[inset_20px_0_40px_rgba(6,95,70,0.3)]'
                    : 'bg-zinc-950/40 border-zinc-700/60 text-zinc-500 backdrop-blur-[2px]'
                }
              `}
            >
              <div
                className={`p-2.5 rounded-full transition-transform ${
                  hoveredDropZone === 'done' ? 'bg-emerald-500/25 scale-110' : 'bg-zinc-800'
                }`}
              >
                <CheckCheck className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold">Zrobione</p>
                <p className="text-[10px] opacity-75">Upuść, aby ukończyć</p>
              </div>
            </div>

            {/* Dolna połowa: Kosz */}
            <div
              className={`
                flex-1 flex flex-col items-center justify-center gap-2 p-3
                border-l-2 border-t border-dashed transition-all duration-200
                ${
                  hoveredDropZone === 'trash'
                    ? 'bg-red-950/80 border-red-400 text-red-200 backdrop-blur-sm shadow-[inset_20px_0_40px_rgba(153,27,27,0.3)]'
                    : 'bg-zinc-950/40 border-zinc-700/60 text-zinc-500 backdrop-blur-[2px]'
                }
              `}
            >
              <div
                className={`p-2.5 rounded-full transition-transform ${
                  hoveredDropZone === 'trash' ? 'bg-red-500/25 scale-110' : 'bg-zinc-800'
                }`}
              >
                <Trash2 className="h-5 w-5" />
              </div>
              <div className="text-center">
                <p className="text-xs font-semibold">Kosz</p>
                <p className="text-[10px] opacity-75">Upuść, aby usunąć</p>
              </div>
            </div>
          </div>

          {/* Podpowiedź, gdy przeciągamy element z panelu lewego na pulpit */}
          {isDesktopDragOver && (
            <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
              <div className="bg-blue-950/80 border border-blue-500/80 text-blue-200 px-6 py-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center gap-3 animate-pulse">
                <ClipboardList className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-medium">Upuść tutaj, aby rozpocząć realizację zadania na pulpicie</span>
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
                  Przeciągnij zadanie z panelu <span className="text-zinc-300 font-medium">„Do zrobienia”</span> po lewej na pulpit lub kliknij przycisk <span className="text-blue-400 font-medium">„Zacznij”</span>, aby otworzyć okno zadania.
                </p>
                {!leftPanelOpen && (
                  <Button
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
            /* Okna zadań przeciągane myszką */
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
            Dwa buttony + jeden panel
            ────────────────────────────────────── */}

        {/* Triggery po prawej stronie */}
        <div className={`
          absolute right-0 top-0 bottom-0 z-30
          w-10 flex flex-col items-center justify-center gap-4
          bg-zinc-900/80 border-l border-zinc-800
          ${rightPanel !== null ? 'hidden' : ''}
        `}>
          {/* Zrobione */}
          <button
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

          {/* Kosz */}
          <button
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

        {/* Panel wysuwany prawy */}
        <div className={`
          absolute right-0 top-0 bottom-0 z-40
          w-72 bg-zinc-900 border-l border-zinc-700
          flex flex-col
          transition-transform duration-300 ease-in-out shadow-2xl
          ${rightPanel !== null ? 'translate-x-0' : 'translate-x-full'}
        `}>
          {/* Nagłówek panelu prawego */}
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
              {/* Przełącznik między Zrobione i Kosz */}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => setRightPanel(rightPanel === 'done' ? 'trash' : 'done')}
              >
                {rightPanel === 'done' ? 'Kosz' : 'Zrobione'}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7"
                onClick={() => setRightPanel(null)}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Zawartość panelu prawego */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {rightPanel === 'done' && (
              doneTasks.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">
                  <CheckCheck className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Brak ukończonych zadań
                </div>
              ) : (
                doneTasks.map(task => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    compact
                    showActions={false}
                  />
                ))
              )
            )}

            {rightPanel === 'trash' && (
              myDeletedTasks.length === 0 ? (
                <div className="text-center py-8 text-zinc-600 text-sm">
                  <Trash2 className="h-8 w-8 mx-auto mb-2 opacity-30" />
                  Kosz jest pusty
                </div>
              ) : (
                myDeletedTasks.map(task => (
                  <div key={task.id} className="space-y-1">
                    <TaskCard task={task} compact showActions={false} />
                    {/* Przycisk przywróć z kosza */}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full text-xs text-zinc-500 hover:text-green-400"
                      onClick={() => restoreTask(task.id)}
                    >
                      <Archive className="h-3 w-3 mr-1" />
                      Przywróć
                    </Button>
                  </div>
                ))
              )
            )}
          </div>
        </div>

        {/* Overlay zamykający prawy panel - USUNIĘTY celowo:
            Panel zamyka się tylko przyciskiem > po prawej */}
      </div>
    </div>
  )
}
