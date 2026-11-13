/**
 * Stałe współdzielone w całej aplikacji (warianty Badge, kolory avatarów, metadane ról).
 */

export const statusVariantMap = {
  1: 'status-todo',
  2: 'status-inprogress',
  3: 'status-done',
  4: 'status-cancelled',
}

export const priorityVariantMap = {
  1: 'priority-low',
  2: 'priority-normal',
  3: 'priority-high',
  4: 'priority-urgent',
}

export const AVATAR_COLORS = [
  '#3f3f46',
  '#0ea5e9',
  '#10b981',
  '#f59e0b',
  '#ec4899',
  '#8b5cf6',
  '#ef4444',
]

export const ROLE_META = {
  admin: {
    label: 'Administrator',
    description: 'Pełny dostęp do systemu, zarządzania użytkownikami i konfiguracji.',
    badgeClass: 'border-red-800/80 bg-red-950/60 text-red-300',
  },
  dyrektor: {
    label: 'Dyrektor',
    description: 'Nadzór nad organizacją, dostęp do panelu zarządczego oraz raportów.',
    badgeClass: 'border-amber-800/80 bg-amber-950/60 text-amber-300',
  },
  kierownik: {
    label: 'Kierownik',
    description: 'Koordynacja prac zespołu oraz delegowanie zadań podległym pracownikom.',
    badgeClass: 'border-sky-800/80 bg-sky-950/60 text-sky-300',
  },
  pracownik: {
    label: 'Pracownik',
    description: 'Realizacja przypisanych zadań i współpraca w obrębie zespołu.',
    badgeClass: 'border-zinc-700 bg-zinc-800 text-zinc-300',
  },
}
