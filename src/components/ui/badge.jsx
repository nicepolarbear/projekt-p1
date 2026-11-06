import { cva } from 'class-variance-authority'
import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Badge - mała etykietka używana do wyświetlania:
 * - Statusu zadania ("W trakcie", "Zrobione", "Anulowane")
 * - Priorytetu ("Pilny", "Wysoki", "Normalny", "Niski")
 * - Stanowiska użytkownika
 * 
 * Działa identycznie jak Button z wariantami przez cva().
 */
const badgeVariants = cva(
  // Klasy bazowe
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors',
  {
    variants: {
      variant: {
        default:     'border-transparent bg-zinc-100 text-zinc-900',
        secondary:   'border-transparent bg-zinc-800 text-zinc-300',
        destructive: 'border-transparent bg-red-900/50 text-red-300 border-red-800',
        outline:     'border-zinc-700 text-zinc-300',

        // Warianty statusów zadań (używać przez variant="status-todo" itp.)
        'status-todo':       'border-transparent bg-zinc-700 text-zinc-200',
        'status-inprogress': 'border-transparent bg-blue-900/60 text-blue-300 border-blue-800',
        'status-done':       'border-transparent bg-green-900/60 text-green-300 border-green-800',
        'status-cancelled':  'border-transparent bg-red-900/40 text-red-400 border-red-900',

        // Warianty priorytetów
        'priority-low':    'border-transparent bg-zinc-800 text-zinc-400',
        'priority-normal': 'border-transparent bg-sky-900/50 text-sky-300 border-sky-900',
        'priority-high':   'border-transparent bg-orange-900/50 text-orange-300 border-orange-900',
        'priority-urgent': 'border-transparent bg-red-900/60 text-red-300 border-red-800',

        // Warianty akceptacji przypisania
        'assign-pending':  'border-transparent bg-yellow-900/50 text-yellow-300 border-yellow-900',
        'assign-accepted': 'border-transparent bg-green-900/50 text-green-300 border-green-900',
        'assign-rejected': 'border-transparent bg-red-900/50 text-red-300 border-red-900',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
