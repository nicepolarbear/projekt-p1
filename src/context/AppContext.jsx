import { useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from '../hooks/useAuth'
import { useToast } from '../hooks/useToast'
import { metaService } from '../services/metaService'
import { tasksService } from '../services/tasksService'
import { AppContext } from './contextObjects'

function normalizeTasksPayload(payload) {
  const rawTasks = Array.isArray(payload)
    ? payload
    : Array.isArray(payload?.tasks)
      ? payload.tasks
      : Array.isArray(payload?.items)
        ? payload.items
        : []

  const assignmentMap = new Map()
  const addAssignment = (assignment) => {
    if (!assignment || assignment.task_id == null || assignment.employee_id == null) return
    assignmentMap.set(`${assignment.task_id}:${assignment.employee_id}`, assignment)
  }

  if (Array.isArray(payload?.assignments)) {
    payload.assignments.forEach(addAssignment)
  }

  const tasks = rawTasks.map((task) => {
    if (Array.isArray(task.assignments)) {
      task.assignments.forEach(addAssignment)
    }
    if (task.my_assignment) {
      addAssignment(task.my_assignment)
    }
    const { assignments: _nestedAssignments, my_assignment: _myAssignment, ...cleanTask } = task
    return cleanTask
  })

  return {
    tasks,
    assignments: Array.from(assignmentMap.values()),
  }
}

function mergeAssignments(existing, incoming) {
  const map = new Map()
  existing.forEach((a) => {
    map.set(`${a.task_id}:${a.employee_id}`, a)
  })
  incoming.forEach((a) => {
    if (!a || a.task_id == null || a.employee_id == null) return
    map.set(`${a.task_id}:${a.employee_id}`, a)
  })
  return Array.from(map.values())
}

export function AppProvider({ children }) {
  const { user: currentUser, authStatus } = useAuth()
  const { toast } = useToast()

  const currentUserId = currentUser?.id ?? null

  const [directoryUsers, setDirectoryUsers] = useState([])
  const [roles, setRoles] = useState([])
  const [positions, setPositions] = useState([])
  const [departments, setDepartments] = useState([])
  const [taskStatuses, setTaskStatuses] = useState([])
  const [priorities, setPriorities] = useState([])

  const [activeTasks, setActiveTasks] = useState([])
  const [deletedTasks, setDeletedTasks] = useState([])
  const [assignments, setAssignments] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const activeTasksRef = useRef(activeTasks)
  const deletedTasksRef = useRef(deletedTasks)
  const assignmentsRef = useRef(assignments)

  useEffect(() => {
    activeTasksRef.current = activeTasks
    deletedTasksRef.current = deletedTasks
    assignmentsRef.current = assignments
  }, [activeTasks, deletedTasks, assignments])

  const applyTasksResponses = useCallback((activeRes, deletedRes) => {
    const activeParsed = normalizeTasksPayload(activeRes)
    const deletedParsed = normalizeTasksPayload(deletedRes)
    setActiveTasks(activeParsed.tasks)
    setDeletedTasks(deletedParsed.tasks)
    setAssignments(mergeAssignments(activeParsed.assignments, deletedParsed.assignments))
  }, [])

  useEffect(() => {
    let cancelled = false

    if (authStatus === 'authenticated' && currentUserId) {
      ;(async () => {
        setIsLoading(true)
        try {
          const [metaRes, activeRes, deletedRes] = await Promise.all([
            metaService.getMeta(),
            tasksService.getTasks('active'),
            tasksService.getTasks('deleted'),
          ])
          if (cancelled) return

          const metaPositions = Array.isArray(metaRes?.positions) ? metaRes.positions : []
          const metaDepartments = Array.isArray(metaRes?.departments) ? metaRes.departments : []
          const rawUsers = Array.isArray(metaRes?.users)
            ? metaRes.users
            : Array.isArray(metaRes?.directoryUsers)
              ? metaRes.directoryUsers
              : []

          const enrichedUsers = rawUsers.map((u) => ({
            ...u,
            position: u.position || metaPositions.find((p) => p.id === u.position_id) || null,
            department:
              u.department || metaDepartments.find((d) => d.id === u.department_id) || null,
          }))

          setPositions(metaPositions)
          setDepartments(metaDepartments)
          setDirectoryUsers(enrichedUsers)
          setRoles(Array.isArray(metaRes?.roles) ? metaRes.roles : [])
          setTaskStatuses(
            Array.isArray(metaRes?.taskStatuses)
              ? metaRes.taskStatuses
              : Array.isArray(metaRes?.task_statuses)
                ? metaRes.task_statuses
                : Array.isArray(metaRes?.statuses)
                  ? metaRes.statuses
                  : []
          )
          setPriorities(Array.isArray(metaRes?.priorities) ? metaRes.priorities : [])
          applyTasksResponses(activeRes, deletedRes)
        } catch (error) {
          if (cancelled) return
          toast({
            title: 'Nie udało się pobrać danych',
            description: error?.message || 'Spróbuj odświeżyć stronę.',
            variant: 'destructive',
          })
        } finally {
          if (!cancelled) {
            setIsLoading(false)
          }
        }
      })()
    } else if (authStatus === 'unauthenticated') {
      queueMicrotask(() => {
        if (cancelled) return
        setDirectoryUsers([])
        setRoles([])
        setPositions([])
        setDepartments([])
        setTaskStatuses([])
        setPriorities([])
        setActiveTasks([])
        setDeletedTasks([])
        setAssignments([])
        setIsLoading(false)
      })
    }

    return () => {
      cancelled = true
    }
  }, [authStatus, currentUserId, applyTasksResponses, toast])

  const [focusedTaskId, setFocusedTaskId] = useState(null)

  const focusTask = useCallback((taskId) => {
    setFocusedTaskId(taskId)
  }, [])

  const clearFocusedTask = useCallback(() => {
    setFocusedTaskId(null)
  }, [])

  const refreshTasks = useCallback(
    async ({ silent = false } = {}) => {
      if (!currentUserId) return
      if (!silent) setIsLoading(true)
      try {
        const [activeRes, deletedRes] = await Promise.all([
          tasksService.getTasks('active'),
          tasksService.getTasks('deleted'),
        ])
        applyTasksResponses(activeRes, deletedRes)
      } catch (error) {
        if (!silent) {
          toast({
            title: 'Błąd odświeżania zadań',
            description: error?.message || 'Nie udało się pobrać listy zadań.',
            variant: 'destructive',
          })
        }
      } finally {
        if (!silent) {
          setIsLoading(false)
        }
      }
    },
    [currentUserId, applyTasksResponses, toast]
  )

  const addTask = useCallback(
    async (taskData) => {
      const tempId = -Date.now()
      const optimisticTask = {
        id: tempId,
        ...taskData,
        creator_id: currentUserId,
        status_id: taskData?.status_id ?? 1,
        created_at: new Date().toISOString(),
        deleted_at: null,
      }

      setActiveTasks((prev) => [optimisticTask, ...prev])

      try {
        const res = await tasksService.createTask(taskData)
        const createdTask = res?.task ?? res
        const extraAssignments = Array.isArray(res?.assignments)
          ? res.assignments
          : Array.isArray(createdTask?.assignments)
            ? createdTask.assignments
            : createdTask?.my_assignment
              ? [createdTask.my_assignment]
              : []

        const {
          assignments: _ignoredAssignments,
          my_assignment: _ignoredMyAssignment,
          ...cleanCreated
        } = createdTask || {}

        setActiveTasks((prev) =>
          prev.map((t) => (t.id === tempId ? cleanCreated : t))
        )
        if (extraAssignments.length > 0) {
          setAssignments((prev) => mergeAssignments(prev, extraAssignments))
        }
        return cleanCreated
      } catch (error) {
        setActiveTasks((prev) => prev.filter((t) => t.id !== tempId))
        toast({
          title: 'Nie udało się utworzyć zadania',
          description: error?.message || 'Wystąpił błąd podczas zapisywania zadania.',
          variant: 'destructive',
        })
        throw error
      }
    },
    [currentUserId, toast]
  )

  const updateTask = useCallback(
    async (taskId, payload) => {
      const snapshot = activeTasksRef.current
      setActiveTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...payload } : t)))

      try {
        const res = await tasksService.updateTask(taskId, payload)
        const updated = res?.task ?? res
        if (updated?.id) {
          setActiveTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...updated } : t))
          )
        }
        return updated
      } catch (error) {
        setActiveTasks(snapshot)
        toast({
          title: 'Błąd aktualizacji zadania',
          description: error?.message || 'Nie udało się zapisać zmian.',
          variant: 'destructive',
        })
        throw error
      }
    },
    [toast]
  )

  const assignTask = useCallback(
    async (taskId, employeeIdOrPayload, priorityId, status) => {
      const payload =
        typeof employeeIdOrPayload === 'object' && employeeIdOrPayload !== null
          ? employeeIdOrPayload
          : {
              employee_id: employeeIdOrPayload,
              priority_id: priorityId,
              ...(status ? { assignment_status: status } : {}),
            }

      const targetEmployeeId = payload.employee_id
      const snapshot = assignmentsRef.current
      const alreadyExists = snapshot.some(
        (a) => a.task_id === taskId && a.employee_id === targetEmployeeId
      )
      if (alreadyExists) return null

      const optimisticAssignment = {
        task_id: taskId,
        employee_id: targetEmployeeId,
        priority_id: payload.priority_id ?? 2,
        assignment_status:
          payload.assignment_status ??
          (targetEmployeeId === currentUserId ? 'accepted' : 'pending'),
        rejection_reason: null,
        assigned_at: new Date().toISOString(),
      }

      setAssignments((prev) => [...prev, optimisticAssignment])

      try {
        const res = await tasksService.assignTask(taskId, payload)
        const serverAssignments = Array.isArray(res?.assignments)
          ? res.assignments
          : res?.assignment
            ? [res.assignment]
            : res?.task_id
              ? [res]
              : []

        if (serverAssignments.length > 0) {
          setAssignments((prev) => mergeAssignments(prev, serverAssignments))
        }
        return res
      } catch (error) {
        setAssignments(snapshot)
        toast({
          title: 'Błąd przypisania zadania',
          description: error?.message || 'Nie udało się przypisać użytkownika.',
          variant: 'destructive',
        })
        throw error
      }
    },
    [currentUserId, toast]
  )

  const updateAssignmentStatus = useCallback(
    async (taskId, employeeIdOrStatus, newStatusOrReason, reasonArg = null) => {
      let targetEmployeeId = currentUserId
      let assignment_status = null
      let rejection_reason = null

      if (typeof employeeIdOrStatus === 'object' && employeeIdOrStatus !== null) {
        assignment_status = employeeIdOrStatus.assignment_status ?? employeeIdOrStatus.status
        rejection_reason = employeeIdOrStatus.rejection_reason ?? null
      } else if (typeof employeeIdOrStatus === 'string') {
        assignment_status = employeeIdOrStatus
        rejection_reason = newStatusOrReason ?? null
      } else {
        targetEmployeeId = employeeIdOrStatus ?? currentUserId
        assignment_status = newStatusOrReason
        rejection_reason = reasonArg
      }

      const snapshot = assignmentsRef.current
      setAssignments((prev) =>
        prev.map((a) =>
          a.task_id === taskId && a.employee_id === targetEmployeeId
            ? { ...a, assignment_status, rejection_reason }
            : a
        )
      )

      try {
        const res = await tasksService.respondToAssignment(taskId, {
          assignment_status,
          rejection_reason,
        })
        const updatedAssignment = res?.assignment ?? (res?.task_id ? res : null)
        if (updatedAssignment) {
          setAssignments((prev) => mergeAssignments(prev, [updatedAssignment]))
        }
        return res
      } catch (error) {
        setAssignments(snapshot)
        toast({
          title: 'Błąd zmiany decyzji',
          description: error?.message || 'Nie udało się zaktualizować przypisania.',
          variant: 'destructive',
        })
        throw error
      }
    },
    [currentUserId, toast]
  )

  const updateTaskStatus = useCallback(
    async (taskId, newStatusId) => {
      const snapshot = activeTasksRef.current
      setActiveTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status_id: newStatusId } : t))
      )

      try {
        const res = await tasksService.updateTaskStatus(taskId, newStatusId)
        const updatedTask = res?.task ?? (res?.id ? res : null)
        if (updatedTask) {
          setActiveTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t))
          )
        }
        return res
      } catch (error) {
        setActiveTasks(snapshot)
        toast({
          title: 'Błąd zmiany statusu',
          description: error?.message || 'Nie udało się zmienić statusu zadania.',
          variant: 'destructive',
        })
        throw error
      }
    },
    [toast]
  )

  const deleteTask = useCallback(
    async (taskId) => {
      const prevActive = activeTasksRef.current
      const prevDeleted = deletedTasksRef.current
      const targetTask = prevActive.find((t) => t.id === taskId) || null

      setActiveTasks((prev) => prev.filter((t) => t.id !== taskId))
      if (targetTask) {
        setDeletedTasks((prev) => [
          { ...targetTask, deleted_at: new Date().toISOString() },
          ...prev,
        ])
      }

      try {
        const res = await tasksService.deleteTask(taskId)
        return res
      } catch (error) {
        setActiveTasks(prevActive)
        setDeletedTasks(prevDeleted)
        toast({
          title: 'Błąd usuwania zadania',
          description: error?.message || 'Nie udało się przenieść zadania do kosza.',
          variant: 'destructive',
        })
        throw error
      }
    },
    [toast]
  )

  const restoreTask = useCallback(
    async (taskId) => {
      const prevActive = activeTasksRef.current
      const prevDeleted = deletedTasksRef.current
      const targetTask = prevDeleted.find((t) => t.id === taskId) || null

      setDeletedTasks((prev) => prev.filter((t) => t.id !== taskId))
      if (targetTask) {
        setActiveTasks((prev) => [{ ...targetTask, deleted_at: null }, ...prev])
      }

      try {
        const res = await tasksService.restoreTask(taskId)
        const restoredTask = res?.task ?? (res?.id ? res : null)
        if (restoredTask) {
          setActiveTasks((prev) =>
            prev.map((t) => (t.id === taskId ? { ...t, ...restoredTask } : t))
          )
        }
        return res
      } catch (error) {
        setActiveTasks(prevActive)
        setDeletedTasks(prevDeleted)
        toast({
          title: 'Błąd przywracania zadania',
          description: error?.message || 'Nie udało się przywrócić zadania z kosza.',
          variant: 'destructive',
        })
        throw error
      }
    },
    [toast]
  )

  const myActiveTasks = useMemo(() => {
    if (!currentUserId) return []
    const myAssignedIds = new Set(
      assignments.filter((a) => a.employee_id === currentUserId).map((a) => a.task_id)
    )
    return activeTasks.filter(
      (t) =>
        t.deleted_at == null &&
        (myAssignedIds.has(t.id) || t.creator_id === currentUserId)
    )
  }, [activeTasks, assignments, currentUserId])

  const myCreatedTasks = useMemo(() => {
    if (!currentUserId) return []
    return activeTasks.filter(
      (t) => t.creator_id === currentUserId && t.deleted_at == null
    )
  }, [activeTasks, currentUserId])

  const myDeletedTasks = useMemo(() => {
    if (!currentUserId) return []
    const myAssignedIds = new Set(
      assignments.filter((a) => a.employee_id === currentUserId).map((a) => a.task_id)
    )
    return deletedTasks.filter(
      (t) =>
        t.deleted_at != null &&
        (t.creator_id === currentUserId || myAssignedIds.has(t.id))
    )
  }, [deletedTasks, assignments, currentUserId])

  const getAssignees = useCallback(
    (taskId) => {
      return assignments
        .filter((a) => a.task_id === taskId)
        .map((a) => {
          const foundUser =
            directoryUsers.find((u) => u.id === a.employee_id) || a.user || null
          const userWithPosition = foundUser
            ? {
                ...foundUser,
                position:
                  foundUser.position ||
                  positions.find((p) => p.id === foundUser.position_id) ||
                  null,
              }
            : null
          return {
            ...a,
            user: userWithPosition,
            priority: priorities.find((p) => p.id === a.priority_id) || null,
          }
        })
    },
    [assignments, directoryUsers, positions, priorities]
  )

  const value = useMemo(
    () => ({
      currentUser,
      currentUserId,
      users: directoryUsers,
      roles,
      positions,
      departments,
      taskStatuses,
      priorities,
      myActiveTasks,
      myCreatedTasks,
      myDeletedTasks,
      assignments,
      isLoading,
      refreshTasks,
      focusedTaskId,
      focusTask,
      clearFocusedTask,
      addTask,
      updateTask,
      assignTask,
      updateAssignmentStatus,
      updateTaskStatus,
      deleteTask,
      restoreTask,
      getAssignees,
    }),
    [
      currentUser,
      currentUserId,
      directoryUsers,
      roles,
      positions,
      departments,
      taskStatuses,
      priorities,
      myActiveTasks,
      myCreatedTasks,
      myDeletedTasks,
      assignments,
      isLoading,
      refreshTasks,
      focusedTaskId,
      focusTask,
      clearFocusedTask,
      addTask,
      updateTask,
      assignTask,
      updateAssignmentStatus,
      updateTaskStatus,
      deleteTask,
      restoreTask,
      getAssignees,
    ]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

// oxlint-disable-next-line react/only-export-components
export function useAppContext() {
  const context = useContext(AppContext)
  if (context === undefined) {
    throw new Error('useAppContext musi być używany wewnątrz <AppProvider>')
  }
  return context
}
