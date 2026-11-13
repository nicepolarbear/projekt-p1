import { cn } from '../../lib/utils'

const SIZE_CLASSES = {
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg',
}

function getInitials(user) {
  const first = typeof user?.first_name === 'string' ? user.first_name.trim() : ''
  const last = typeof user?.last_name === 'string' ? user.last_name.trim() : ''

  if (first && last) {
    return `${first[0]}${last[0]}`.toUpperCase()
  }
  if (first) {
    return first.slice(0, 2).toUpperCase()
  }
  if (last) {
    return last.slice(0, 2).toUpperCase()
  }
  if (typeof user?.email === 'string' && user.email.trim()) {
    return user.email.trim()[0].toUpperCase()
  }
  return '?'
}

export function Avatar({ user, size = 'md', className }) {
  const sizeClass = SIZE_CLASSES[size] || SIZE_CLASSES.md
  const initials = getInitials(user)
  const backgroundColor = user?.avatar_color || '#3f3f46'
  const fullName = [user?.first_name, user?.last_name].filter(Boolean).join(' ')

  return (
    <div
      role="img"
      aria-label={fullName || 'Awatar użytkownika'}
      title={fullName || undefined}
      style={{ backgroundColor }}
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border border-white/15 font-semibold tracking-tight text-white shadow-sm',
        sizeClass,
        className
      )}
    >
      {initials}
    </div>
  )
}
