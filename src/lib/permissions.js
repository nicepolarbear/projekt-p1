/**
 * Funkcje pomocnicze do sprawdzania uprawnień RBAC oraz hierarchii stanowisk.
 */

export function canAccessDashboard(user) {
  if (!user || user.account_type === 'individual_reporter') return false
  return (
    user.role === 'admin' ||
    user.role === 'dyrektor' ||
    user.permissions?.is_admin ||
    user.permissions?.can_view_analytics ||
    user.permissions?.can_manage_all_tasks ||
    user.permissions?.can_manage_members ||
    user.permissions?.can_triage_bugs ||
    user.permissions?.can_manage_permissions ||
    user.permissions?.can_approve_join_requests
  )
}

export function canManagePermissions(user) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    user.role === 'dyrektor' ||
    Boolean(user.permissions?.is_admin) ||
    Boolean(user.permissions?.can_manage_permissions)
  )
}

export function canTriageBugs(user) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    user.role === 'dyrektor' ||
    Boolean(user.permissions?.is_admin) ||
    Boolean(user.permissions?.can_triage_bugs)
  )
}

export function canConvertBugsToTasks(user) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    user.role === 'dyrektor' ||
    Boolean(user.permissions?.is_admin) ||
    Boolean(user.permissions?.can_convert_bugs_to_tasks)
  )
}

export function canApproveJoinRequests(user) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    user.role === 'dyrektor' ||
    Boolean(user.permissions?.is_admin) ||
    Boolean(user.permissions?.can_approve_join_requests)
  )
}

export function canGenerateInvites(user) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    user.role === 'dyrektor' ||
    Boolean(user.permissions?.is_admin) ||
    Boolean(user.permissions?.can_generate_invites)
  )
}

export function canManageMembers(user) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    Boolean(user.permissions?.is_admin) ||
    Boolean(user.permissions?.can_manage_members)
  )
}

export function canViewAnalytics(user) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    user.role === 'dyrektor' ||
    Boolean(user.permissions?.is_admin) ||
    Boolean(user.permissions?.can_view_analytics)
  )
}

export function canViewAuditLogs(user) {
  if (!user) return false
  return (
    user.role === 'admin' ||
    user.role === 'dyrektor' ||
    Boolean(user.permissions?.is_admin) ||
    Boolean(user.permissions?.can_view_audit_logs)
  )
}

export function canManageUsers(user) {
  return canManageMembers(user)
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
