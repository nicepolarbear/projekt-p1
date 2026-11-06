import { useCallback, useEffect, useRef, useState } from 'react'
import {
  AlertTriangle,
  Calendar,
  CheckCircle2,
  Clock,
  Maximize2,
  Minimize2,
  Minus,
  Users2,
  X,
} from 'lucide-react'
import { Badge } from './ui/badge'
import { Button } from './ui/button'
import { ShareOrDelegateDialog } from './ShareOrDelegateDialog'
import { useAppContext } from '../context/AppContext'
import { priorityVariantMap } from '../data/mockData'

/**
 * DraggableTaskWindow - Okno zadania w stylu macOS.
 *
 * Kluczowa decyzja architektoniczna: POZYCJA JEST KONTROLOWANA PRZEZ DOM, NIE PRZEZ REACT STATE.
 *
 * Dlaczego? Podczas przeciągania zdarzenie mousemove odpala się ~60 razy/sekundę.
 * Gdybyśmy przy każdym zdarzeniu wywoływali setState(), React musiałby przerenderować
 * cały komponent 60 razy/sekundę → lagowate przeciąganie.
 *
 * Zamiast tego:
 * - Pozycja okna podczas dragu zmieniana jest bezpośrednio przez windowRef.current.style.left/top
 *   (bezpośrednia manipulacja DOM, poza cyklem React)
 * - Dopiero po puszczeniu myszy (mouseup) zapisujemy finalną pozycję przez onDragEnd()
 *   → React robi JEDEN re-render na koniec dragu
 *
 * Props:
 * - task: obiekt zadania
 * - position: { x, y } - pozycja okna na kanwie (kontrolowana przez rodzica - MainLayout)
 * - zIndex: kolejność nakładania okien (kliknięte okno idzie na wierzch)
 * - onDragMove(mouseX): wywoływane podczas dragu - informuje rodzica o pozycji X myszy
 *                        (rodzic sprawdza czy mysz jest nad strefą upuszczenia)
 * - onDragEnd(taskId, finalPos, mouseX): wywoływane gdy puścisz okno
 * - onFocus(): wywoływane gdy klikniesz okno (żeby przesunąć je na wierzch)
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
    currentUserId,
    updateTaskStatus,
    updateAssignmentStatus,
    deleteTask,
    getAssignees,
    assignments,
  } = useAppContext()

  // Ref do elementu DOM okna - używamy go do bezpośredniej manipulacji pozycją
  const windowRef = useRef(null)

  // Ref przechowujący aktualną pozycję podczas dragu (nie powoduje re-renderu)
  const posRef = useRef(position)

  // Flaga: czy aktualnie przeciągamy?
  const isDraggingRef = useRef(false)

  // O ile pikseli kursor jest przesunięty od lewego-górnego rogu okna w momencie kliknięcia
  // Bez tego: po kliknięciu okno "przeskakuje" lewym-górnym rogiem pod kursor
  const dragOffsetRef = useRef({ x: 0, y: 0 })

  // Stan React tylko dla minimalizacji, powiększenia i rozwinięcia pełnego opisu
  const [minimized, setMinimized] = useState(false)
  const [maximized, setMaximized] = useState(false)
  const [expandedDesc, setExpandedDesc] = useState(false)

  // Gdy props.position się zmieni (np. po snapie do gridu lub przywróceniu z panelu),
  // synchronizujemy DOM ręcznie - ale tylko gdy NIE przeciągamy (żeby nie skakać)
  useEffect(() => {
    if (!windowRef.current || isDraggingRef.current) return
    windowRef.current.style.left = `${position.x}px`
    windowRef.current.style.top = `${position.y}px`
    posRef.current = position
  }, [position])

  // Globalne event listenery dla myszy.
  // Rejestrujemy je raz na window, bo kursor może wyjść poza okno podczas szybkiego przeciągania.
  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isDraggingRef.current || !windowRef.current) return

      // Obliczamy nową pozycję: pozycja kursora minus offset kliknięcia
      const newX = e.clientX - dragOffsetRef.current.x
      // Nie pozwalamy schować paska tytułu powyżej górnej krawędzi
      const newY = Math.max(8, e.clientY - dragOffsetRef.current.y)

      // Bezpośrednia manipulacja DOM - bez React, bez re-renderu
      windowRef.current.style.left = `${newX}px`
      windowRef.current.style.top = `${newY}px`

      // Aktualizujemy ref (nie state!) z aktualną pozycją
      posRef.current = { x: newX, y: newY }

      // Informujemy rodzica o pozycji kursora (do stref upuszczenia)
      onDragMove?.(e.clientX, e.clientY)
    }

    const handleMouseUp = (e) => {
      if (!isDraggingRef.current || !windowRef.current) return
      isDraggingRef.current = false

      // Usuwamy style wizualne dragu
      windowRef.current.style.transition = ''
      windowRef.current.style.zIndex = ''
      windowRef.current.style.boxShadow = ''
      windowRef.current.style.transform = ''

      // Przekazujemy finalną pozycję i współrzędne myszy do rodzica
      onDragEnd?.(task.id, posRef.current, e.clientX, e.clientY)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)

    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [task.id, onDragMove, onDragEnd])

  // Handler na mousedown na pasku tytułu - rozpoczyna drag
  const handleTitleBarMouseDown = useCallback(
    (e) => {
      // Tylko lewy przycisk myszy, nie klikamy w button (sygnalizatory) ani gdy zmaksymalizowane
      if (e.button !== 0 || e.target.closest('button') || maximized) return

      onFocus?.() // Przesuń okno na wierzch
      isDraggingRef.current = true

      // Obliczamy offset: gdzie w oknie kliknęliśmy
      dragOffsetRef.current = {
        x: e.clientX - posRef.current.x,
        y: e.clientY - posRef.current.y,
      }

      // Wizualne efekty dragu (bezpośrednio na DOM, bez React)
      if (windowRef.current) {
        windowRef.current.style.zIndex = '9999'
        windowRef.current.style.transition = 'box-shadow 0.1s, transform 0.1s'
        windowRef.current.style.boxShadow = '0 24px 80px rgba(0,0,0,0.9)'
        windowRef.current.style.transform = 'scale(1.02)'
      }

      onDragMove?.(e.clientX, e.clientY)
      e.preventDefault() // Zapobiega zaznaczaniu tekstu podczas dragu
    },
    [onFocus, onDragMove, maximized]
  )
  const myAssignment = assignments.find(
    (a) => a.task_id === task.id && a.employee_id === currentUserId
  )
  const myPriority = myAssignment
    ? priorities.find((p) => p.id === myAssignment.priority_id)
    : null
  const assignees = getAssignees(task.id)
  const dueDate = task.due_date ? new Date(task.due_date) : null
  const isOverdue = dueDate && dueDate < new Date() && task.status_id !== 3
  const isPending = myAssignment?.assignment_status === 'pending'

  const isCreator = task.creator_id === currentUserId
  const rejectedAssignments = assignees.filter((a) => a.assignment_status === 'rejected')

  return (
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
      // Kliknięcie w DOWOLNE miejsce okna (nie tylko titlebar) wysuwa je na wierzch
      onMouseDown={() => onFocus?.()}
    >
      {/* ════════════════════════════════════════
          TITLEBAR - pasek tytułu (chwytamy za niego)
          ════════════════════════════════════════ */}
      <div
        className="flex items-center gap-2.5 px-3 py-2.5 bg-zinc-800/90 border-b border-zinc-700/60 cursor-grab hover:cursor-grab active:cursor-grabbing select-none"
        onMouseDown={handleTitleBarMouseDown}
      >
        {/* ── Sygnalizatory macOS (każdy ma funkcję) ── */}
        <div className="flex items-center gap-1.5 shrink-0">
          {/* 🔴 Czerwona = usuń zadanie (soft delete) */}
          <button
            className="relative h-3 w-3 rounded-full bg-red-500 hover:bg-red-400 transition-colors group"
            onClick={(e) => {
              e.stopPropagation()
              deleteTask(task.id)
            }}
            title="Usuń zadanie (przeniesie do kosza)"
          >
            {/* Ikonka X widoczna przy hoveru */}
            <X className="absolute inset-0 m-auto h-2 w-2 text-red-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* 🟡 Żółta = minimalizuj/rozwiń okno */}
          <button
            className="relative h-3 w-3 rounded-full bg-yellow-400 hover:bg-yellow-300 transition-colors group"
            onClick={(e) => {
              e.stopPropagation()
              setMinimized((v) => !v)
            }}
            title={minimized ? 'Rozwiń okno' : 'Minimalizuj okno'}
          >
            <Minus className="absolute inset-0 m-auto h-2 w-2 text-yellow-900 opacity-0 group-hover:opacity-100 transition-opacity" />
          </button>

          {/* 🟢 Zielona = powiększ / wyśrodkuj */}
          <button
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

        {/* Tytuł zadania */}
        <span className="text-xs font-medium text-zinc-200 flex-1 truncate">
          {task.title}
        </span>

        {/* Mini badge statusu po prawej */}
        {isPending && (
          <Badge variant="assign-pending" className="text-xs py-0 h-4 shrink-0">
            Oczekuje
          </Badge>
        )}
      </div>

      {/* ════════════════════════════════════════
          BODY - treść okna (ukryta gdy zminimalizowane)
          ════════════════════════════════════════ */}
      {!minimized && (
        <div className="p-3 space-y-2.5">
          {/* Priorytet (indywidualny dla aktualnego usera) */}
          {myPriority && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-zinc-500">Priorytet:</span>
              <Badge variant={priorityVariantMap[myAssignment.priority_id]}>
                {myPriority.name}
              </Badge>
            </div>
          )}

          {/* Ostrzeżenie "Oczekuje na decyzję" */}
          {isPending && (
            <div className="flex items-center gap-1.5 text-xs text-yellow-400 bg-yellow-900/20 rounded-md px-2 py-1.5">
              <Clock className="h-3 w-3 shrink-0" />
              Oczekuje na Twoją decyzję
            </div>
          )}

          {/* Krótki opis + opcjonalny pełny opis */}
          {task.short_desc && (
            <div className="space-y-1">
              <p className="text-xs text-zinc-300 leading-relaxed">
                {task.short_desc}
              </p>
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

          {/* Deadline */}
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

          {/* Przypisane osoby */}
          {assignees.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs text-zinc-500">
              <Users2 className="h-3 w-3 shrink-0" />
              <span className="truncate">
                {assignees.map((a) => `${a.user?.first_name} ${a.user?.last_name}`).join(', ')}
              </span>
            </div>
          )}

          {/* Ostrzeżenie dla twórcy o odrzuceniu zlecenia */}
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

          {/* Akcje */}
          {!isPending && (
            <div className="flex gap-2 pt-0.5">
              {task.status_id === 1 && (
                <Button
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
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 h-7 text-xs text-green-400 border-green-900/80 hover:bg-green-900/30"
                  onClick={() => updateTaskStatus(task.id, 3)}
                >
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  Gotowe
                </Button>
              )}
            </div>
          )}

          {isPending && (
            <div className="flex gap-2 pt-0.5">
              <Button
                size="sm"
                variant="outline"
                className="flex-1 h-7 text-xs text-green-400 border-green-900/80 hover:bg-green-900/30"
                onClick={() => updateAssignmentStatus(task.id, currentUserId, 'accepted')}
              >
                <CheckCircle2 className="h-3 w-3 mr-1" />
                Akceptuj
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="flex-1 h-7 text-xs text-red-400 hover:text-red-300 hover:bg-red-900/20"
                onClick={() => updateAssignmentStatus(task.id, currentUserId, 'rejected', 'Odrzucone przez wykonawcę')}
              >
                <X className="h-3 w-3 mr-1" />
                Odrzuć
              </Button>
            </div>
          )}

          {/* Przekaż / Udostępnij zadanie (zgodnie z hierarchią stanowisk) */}
          <div className="pt-2 flex items-center justify-between border-t border-zinc-800/70 text-[11px] text-zinc-500">
            <span>{isCreator ? 'Jesteś twórcą' : 'Zadanie przypisane'}</span>
            <ShareOrDelegateDialog task={task} />
          </div>
        </div>
      )}
    </div>
  )
}
