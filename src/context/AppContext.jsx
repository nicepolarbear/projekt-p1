import { createContext, useCallback, useContext, useMemo, useState } from 'react'
import {
  getAssigneesForTask,
  getDeletedTasks,
  getTasksCreatedBy,
  getTasksForUser,
  getUserWithPosition,
  priorities,
  taskAssignments as initialAssignments,
  taskStatuses,
  tasks as initialTasks,
  users,
} from '../data/mockData'

/**
 * REACT CONTEXT - globalny stan aplikacji
 * 
 * Problem bez Context:
 * App → Dashboard → TaskList → TaskCard → TaskBadge
 * Żeby TaskBadge wiedział, kto jest zalogowanym użytkownikiem,
 * musielibyśmy przekazywać prop "currentUser" przez KAŻDY poziom:
 * App(currentUser) → Dashboard(currentUser) → TaskList(currentUser) → TaskCard(currentUser) → TaskBadge(currentUser)
 * To się nazywa "prop drilling" i jest anty-patternem.
 * 
 * Z Context:
 * - Jeden raz tworzymy Context i owijamy nim App
 * - Każdy komponent, który chce użyć currentUser, wywołuje useAppContext()
 * - Bez przekazywania przez środkowe komponenty!
 */

// Krok 1: Tworzymy pusty Context
// createContext(undefined) - undefined to wartość domyślna gdy nie ma Providera
const AppContext = createContext(undefined)

/**
 * Krok 2: Tworzymy Provider - komponent, który "dostarcza" dane do Contextu.
 * 
 * Provider owijamy wokół całej aplikacji (w App.jsx lub main.jsx).
 * Wszystkie komponenty wewnątrz Provider mają dostęp do wartości.
 * 
 * props.children - wszystko co jest wewnątrz <AppProvider>...</AppProvider>
 */
export function AppProvider({ children }) {
  // Stan: który użytkownik jest "zalogowany" (do symulacji)
  // Domyślnie użytkownik o id=2 (Marek, Project Manager)
  const [currentUserId, setCurrentUserId] = useState(2)
  
  // Pełne dane zalogowanego użytkownika (z join'em na positions)
  const currentUser = useMemo(
    () => getUserWithPosition(currentUserId),
    [currentUserId]
  )

  // Stan: lista zadań i przypisań (mutable - będziemy je modyfikować)
  const [tasks, setTasks] = useState(initialTasks)
  const [assignments, setAssignments] = useState(initialAssignments)

  /**
   * useCallback - memoizuje funkcję (nie tworzy nowej referencji przy każdym renderze).
   * Ważne gdy funkcja jest przekazywana jako prop do komponentów potomnych.
   */

  // Dodanie nowego zadania
  const addTask = useCallback((taskData) => {
    const newTask = {
      id: Date.now(), // Tymczasowe ID - backend wygeneruje prawdziwe
      ...taskData,
      creator_id: currentUserId,
      status_id: 1,  // Domyślnie "Do zrobienia"
      created_at: new Date().toISOString(),
      deleted_at: null,
    }
    setTasks(prev => [...prev, newTask])
    return newTask
  }, [currentUserId])

  // Przypisanie zadania do użytkownika
  const assignTask = useCallback((taskId, employeeId, priorityId, status = 'accepted') => {
    // Sprawdzamy czy przypisanie już istnieje (złożony PK z bazy)
    const exists = assignments.find(
      a => a.task_id === taskId && a.employee_id === employeeId
    )
    if (exists) return // Duplikat - baza by zwróciła błąd

    const newAssignment = {
      task_id: taskId,
      employee_id: employeeId,
      priority_id: priorityId,
      assignment_status: status,
      rejection_reason: null,
      assigned_at: new Date().toISOString(),
    }
    setAssignments(prev => [...prev, newAssignment])
  }, [assignments])

  // Zmiana statusu przypisania (accept/reject)
  const updateAssignmentStatus = useCallback((taskId, employeeId, newStatus, reason = null) => {
    setAssignments(prev =>
      prev.map(a =>
        a.task_id === taskId && a.employee_id === employeeId
          ? { ...a, assignment_status: newStatus, rejection_reason: reason }
          : a
      )
    )
  }, [])

  // Zmiana statusu zadania
  const updateTaskStatus = useCallback((taskId, newStatusId) => {
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, status_id: newStatusId } : t)
    )
  }, [])

  // Soft delete - ustawia deleted_at zamiast kasować
  const deleteTask = useCallback((taskId) => {
    setTasks(prev =>
      prev.map(t =>
        t.id === taskId ? { ...t, deleted_at: new Date().toISOString() } : t
      )
    )
  }, [])

  // Przywrócenie z kosza
  const restoreTask = useCallback((taskId) => {
    setTasks(prev =>
      prev.map(t => t.id === taskId ? { ...t, deleted_at: null } : t)
    )
  }, [])

  /**
   * useMemo - memoizuje obliczone wartości.
   * Np. filtrowanie tasków to operacja O(n) — nie chcemy jej wykonywać przy KAŻDYM renderze.
   * useMemo przeliczy tylko gdy zmieni się tasks, assignments lub currentUserId.
   */
  const myActiveTasks = useMemo(() => {
    const myAssignedIds = assignments
      .filter(a => a.employee_id === currentUserId)
      .map(a => a.task_id)
    // Użytkownik widzi zadania, które ma zrobić (przypisane) ORAZ te, które sam stworzył
    return tasks.filter(t =>
      (myAssignedIds.includes(t.id) || t.creator_id === currentUserId) &&
      t.deleted_at === null
    )
  }, [tasks, assignments, currentUserId])

  const myCreatedTasks = useMemo(
    () => tasks.filter(t => t.creator_id === currentUserId && t.deleted_at === null),
    [tasks, currentUserId]
  )

  const myDeletedTasks = useMemo(() => {
    const myAssignedIds = assignments
      .filter(a => a.employee_id === currentUserId)
      .map(a => a.task_id)
    return tasks.filter(t =>
      t.deleted_at !== null &&
      (t.creator_id === currentUserId || myAssignedIds.includes(t.id))
    )
  }, [tasks, assignments, currentUserId])

  // Funkcja pomocnicza: pobierz przypisanych do zadania (z join'em)
  const getAssignees = useCallback((taskId) => {
    return assignments
      .filter(a => a.task_id === taskId)
      .map(a => ({
        ...a,
        user: getUserWithPosition(a.employee_id),
        priority: priorities.find(p => p.id === a.priority_id),
      }))
  }, [assignments])

  // Wszystko co udostępniamy innym komponentom przez Context
  const value = {
    // Użytkownicy
    currentUser,
    currentUserId,
    setCurrentUserId, // Do przełączania "zalogowanego" użytkownika w devmode
    users,

    // Dane słownikowe
    taskStatuses,
    priorities,

    // Zadania pogrupowane
    myActiveTasks,     // Zadania przypisane do mnie (aktywne)
    myCreatedTasks,    // Zadania stworzone przeze mnie (aktywne)
    myDeletedTasks,    // Moje zadania w koszu

    // Akcje (mutacje stanu)
    addTask,
    assignTask,
    updateAssignmentStatus,
    updateTaskStatus,
    deleteTask,
    restoreTask,
    getAssignees,
    assignments,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

/**
 * Krok 3: Custom Hook do używania Contextu.
 * 
 * Zamiast pisać wszędzie:
 *   const ctx = useContext(AppContext)
 *   if (!ctx) throw new Error(...)
 * 
 * Piszemy tylko:
 *   const { currentUser, addTask } = useAppContext()
 * 
 * Hook sam obsługuje błąd gdy ktoś użyje go poza Providerem.
 */
export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext musi być używany wewnątrz <AppProvider>')
  }
  return context
}
