/**
 * Funkcje pomocnicze do sprawdzania uprawnień RBAC oraz hierarchii stanowisk.
 */

export function canAccessDashboard(user) {
  return user?.role === 'admin' || user?.role === 'dyrektor'
}

export function canManageUsers(user) {
  return user?.role === 'admin'
}

export function canEditEmployeePosition(actor, target) {
  if (!actor || !target) return false
  if (actor.role === 'admin') return true
  return actor.role === 'dyrektor' && target.role !== 'admin' && target.role !== 'dyrektor'
}

export function canDeleteTask(user, task) {
  if (!user || !task) return false
  return user.role === 'admin' || user.role === 'dyrektor' || task.creator_id === user.id
}

export function canRestoreTask(user, task) {
  if (!user || !task) return false
  return user.role === 'admin' || user.role === 'dyrektor' || task.creator_id === user.id
}

export function canChangeTaskStatus(user, task, assignments = []) {
  if (!user || !task) return false
  if (user.role === 'admin' || user.role === 'dyrektor') return true
  if (task.creator_id === user.id) return true
  return assignments.some(
    (a) =>
      a.task_id === task.id &&
      a.employee_id === user.id &&
      a.assignment_status === 'accepted'
  )
}

export function canDelegate(fromUser, toUser) {
  if (!fromUser || !toUser) return false
  if (fromUser.id === toUser.id) return false
  if (toUser.is_active === false || toUser.is_active === 0) return false
  if (toUser.position?.is_delegatable === 0 || toUser.position?.is_delegatable === false) {
    return false
  }
  const fromPriority = fromUser?.position?.priority
  const toPriority = toUser?.position?.priority
  if (typeof fromPriority !== 'number' || typeof toPriority !== 'number') return false
  return fromPriority < toPriority
}

export function canShare(fromUser, toUser) {
  if (!fromUser || !toUser) return false
  if (fromUser.id === toUser.id) return false
  if (toUser.is_active === false || toUser.is_active === 0) return false
  const fromPriority = fromUser?.position?.priority
  const toPriority = toUser?.position?.priority
  if (typeof fromPriority !== 'number' || typeof toPriority !== 'number') return false
  return fromPriority === toPriority
}
