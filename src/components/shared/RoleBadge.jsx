import { Briefcase, Crown, ShieldCheck, User } from 'lucide-react'
import { ROLE_META } from '../../lib/constants'
import { cn } from '../../lib/utils'
import { Badge } from '../ui/badge'

const ROLE_ICONS = {
  admin: ShieldCheck,
  dyrektor: Crown,
  kierownik: Briefcase,
  pracownik: User,
}

export function RoleBadge({ role, showIcon = true, className }) {
  const normalizedRole = typeof role === 'string' ? role.toLowerCase() : 'pracownik'
  const meta = ROLE_META[normalizedRole] || ROLE_META.pracownik
  const Icon = ROLE_ICONS[normalizedRole] || User

  return (
    <Badge
      variant="outline"
      title={meta.description}
      className={cn('gap-1.5 font-medium', meta.badgeClass, className)}
    >
      {showIcon && <Icon className="h-3 w-3 shrink-0" />}
      <span>{meta.label}</span>
    </Badge>
  )
}
