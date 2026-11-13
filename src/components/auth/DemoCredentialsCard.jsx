import { useState } from 'react'
import { ChevronDown, ChevronUp, KeyRound } from 'lucide-react'
import { cn } from '../../lib/utils'
import { RoleBadge } from '../shared/RoleBadge'
import { Card, CardContent, CardHeader } from '../ui/card'

const DEMO_PASSWORD = 'TaskFlow2026!'

const DEMO_ACCOUNTS = [
  {
    email: 'admin@firma.pl',
    name: 'Jan Zieliński',
    role: 'admin',
    position: 'Administrator Systemu',
  },
  {
    email: 'anna.kowalska@firma.pl',
    name: 'Anna Kowalska',
    role: 'dyrektor',
    position: 'Dyrektor',
  },
  {
    email: 'marek.wisniewski@firma.pl',
    name: 'Marek Wiśniewski',
    role: 'kierownik',
    position: 'Project Manager',
  },
  {
    email: 'piotr.nowak@firma.pl',
    name: 'Piotr Nowak',
    role: 'pracownik',
    position: 'Senior Developer',
  },
  {
    email: 'katarzyna.zajac@firma.pl',
    name: 'Katarzyna Zając',
    role: 'pracownik',
    position: 'Junior Developer',
  },
]

export function DemoCredentialsCard({
  onSelectAccount,
  selectedEmail,
  defaultOpen = true,
  className,
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  return (
    <Card className={cn('border-zinc-800/90 bg-zinc-900/90 shadow-xl backdrop-blur-md', className)}>
      <CardHeader className="p-0">
        <button
          type="button"
          onClick={() => setIsOpen((prev) => !prev)}
          aria-expanded={isOpen}
          className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left transition-colors hover:bg-zinc-800/50"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-zinc-700/80 bg-zinc-800 text-zinc-300">
              <KeyRound className="h-3.5 w-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-200">Konta demonstracyjne</p>
              <p className="text-[11px] text-zinc-500 truncate">
                Wspólne hasło dev:{' '}
                <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[10px] text-zinc-300">
                  {DEMO_PASSWORD}
                </code>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-zinc-400 shrink-0">
            <span className="hidden sm:inline text-[11px] text-zinc-500">
              {isOpen ? 'Zwiń' : 'Rozwiń'}
            </span>
            {isOpen ? (
              <ChevronUp className="h-4 w-4" />
            ) : (
              <ChevronDown className="h-4 w-4" />
            )}
          </div>
        </button>
      </CardHeader>

      {isOpen && (
        <CardContent className="px-3 pb-3 pt-0">
          <div className="space-y-1 border-t border-zinc-800/80 pt-2.5">
            {DEMO_ACCOUNTS.map((account) => {
              const isSelected =
                typeof selectedEmail === 'string' &&
                selectedEmail.trim().toLowerCase() === account.email

              return (
                <button
                  key={account.email}
                  type="button"
                  onClick={() => onSelectAccount?.(account.email, DEMO_PASSWORD)}
                  className={cn(
                    'group flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition-colors',
                    isSelected
                      ? 'border-zinc-600 bg-zinc-800/90'
                      : 'border-transparent bg-zinc-950/50 hover:border-zinc-800 hover:bg-zinc-800/70'
                  )}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="truncate text-xs font-medium text-zinc-200 group-hover:text-white">
                        {account.name}
                      </span>
                      <span className="hidden sm:inline truncate text-[11px] text-zinc-500">
                        • {account.position}
                      </span>
                    </div>
                    <p className="truncate font-mono text-[11px] text-zinc-400">
                      {account.email}
                    </p>
                    <p className="sm:hidden truncate text-[10px] text-zinc-500">
                      {account.position}
                    </p>
                  </div>

                  <RoleBadge role={account.role} className="shrink-0 text-[10px] px-2 py-0.5" />
                </button>
              )
            })}
          </div>
        </CardContent>
      )}
    </Card>
  )
}
