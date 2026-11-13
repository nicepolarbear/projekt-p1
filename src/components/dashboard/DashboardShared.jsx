import { ROLE_META } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'
import { getAvatarColor, getUserFullName, getUserInitials } from './dashboardUtils'

const AVATAR_SIZE_CLASSES = {
  xs: 'h-6 w-6 text-[10px]',
  sm: 'h-7 w-7 text-xs',
  md: 'h-8 w-8 text-xs',
  lg: 'h-10 w-10 text-sm',
}

export function Avatar({ user, size = 'md', className }) {
  const bg = getAvatarColor(user)
  const initials = getUserInitials(user)
  const label = getUserFullName(user)

  return (
    <span
      title={label}
      style={{ backgroundColor: bg }}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-white ring-1 ring-white/10 select-none',
        AVATAR_SIZE_CLASSES[size] || AVATAR_SIZE_CLASSES.md,
        className
      )}
    >
      {initials}
    </span>
  )
}

export function RoleBadge({ role, className }) {
  const roleKey = typeof role === 'string' ? role : role?.name || 'pracownik'
  const meta = ROLE_META[roleKey] || ROLE_META.pracownik

  return (
    <Badge
      variant="outline"
      title={meta.description}
      className={cn('font-medium', meta.badgeClass, className)}
    >
      {meta.label}
    </Badge>
  )
}
