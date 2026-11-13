import { AVATAR_COLORS } from '../../lib/constants'

export function formatDatePl(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('pl-PL', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
}

export function formatDateTimePl(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('pl-PL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

export function isUserActive(user) {
  if (!user) return false
  return user.is_active !== 0 && user.is_active !== false
}

export function resolveUserRole(user, roles = []) {
  if (!user) return 'pracownik'
  if (typeof user.role === 'string' && user.role) return user.role
  if (user.role?.name) return user.role.name
  if (typeof user.role_name === 'string' && user.role_name) return user.role_name
  const matched = roles.find((r) => r.id === user.role_id)
  return matched?.name || 'pracownik'
}

export function getUserFullName(user) {
  if (!user) return 'Nieznany użytkownik'
  const full = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return full || user.email || `Użytkownik #${user.id ?? '?'}`
}

export function getUserInitials(user) {
  if (!user) return '?'
  const first = (user.first_name || '').trim()[0] || ''
  const last = (user.last_name || '').trim()[0] || ''
  if (first || last) return `${first}${last}`.toUpperCase()
  const emailFirst = (user.email || '').trim()[0]
  return emailFirst ? emailFirst.toUpperCase() : '?'
}

export function getAvatarColor(user) {
  if (user?.avatar_color) return user.avatar_color
  const seed = Number(user?.id) || 0
  return AVATAR_COLORS[Math.abs(seed) % AVATAR_COLORS.length]
}

export function isTaskOverdue(task) {
  if (!task?.due_date) return false
  if (task.deleted_at != null) return false
  if (task.status_id === 3 || task.status_id === 4) return false
  const dueMs = Date.parse(task.due_date)
  return Number.isFinite(dueMs) && dueMs < Date.now()
}

export function getDaysOverdue(dueDate) {
  if (!dueDate) return 0
  const dueMs = Date.parse(dueDate)
  if (!Number.isFinite(dueMs)) return 0
  const diff = Date.now() - dueMs
  if (diff <= 0) return 0
  return Math.max(1, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export function getAssignmentStatusMeta(status) {
  switch (status) {
    case 'accepted':
      return { label: 'Zaakceptowane', variant: 'assign-accepted' }
    case 'rejected':
      return { label: 'Odrzucone', variant: 'assign-rejected' }
    case 'pending':
    default:
      return { label: 'Oczekuje', variant: 'assign-pending' }
  }
}

export function extractArray(payload, keys = []) {
  if (Array.isArray(payload)) return payload
  if (!payload || typeof payload !== 'object') return []
  for (const key of keys) {
    if (Array.isArray(payload[key])) return payload[key]
  }
  return []
}

export function parseDetailsJson(raw) {
  if (raw == null) return {}
  if (typeof raw === 'object') return raw
  if (typeof raw === 'string') {
    try {
      return JSON.parse(raw)
    } catch {
      return { raw }
    }
  }
  return { value: raw }
}
