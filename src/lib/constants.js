import {
  ArrowRightCircle,
  BarChart3,
  Bug,
  CheckSquare,
  Globe,
  Key,
  PlusCircle,
  ScrollText,
  Shield,
  Trash2,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react'

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
  reporter: {
    label: 'Zgłaszający',
    description: 'Zewnętrzny tester lub użytkownik zgłaszający błędy i usterki.',
    badgeClass: 'border-cyan-800/80 bg-cyan-950/60 text-cyan-300',
  },
}

export const PERMISSION_DEFINITIONS = [
  {
    key: 'can_manage_members',
    label: 'Dodawanie pracowników',
    desc: 'Zarządzanie listą członków organizacji i ich danymi',
    icon: Users,
    category: 'Organizacja',
  },
  {
    key: 'can_generate_invites',
    label: 'Kody zaproszeń',
    desc: 'Generowanie jednorazowych kodów dołączenia (TF-XXXXX)',
    icon: Key,
    category: 'Organizacja',
  },
  {
    key: 'can_approve_join_requests',
    label: 'Zatwierdzanie użytkowników',
    desc: 'Akceptowanie lub odrzucanie oczekujących wniosków o dołączenie',
    icon: UserCheck,
    category: 'Organizacja',
  },
  {
    key: 'can_create_tasks',
    label: 'Zadawanie zadań',
    desc: 'Tworzenie nowych zadań na tablicy projektowej',
    icon: PlusCircle,
    category: 'Zadania',
  },
  {
    key: 'can_assign_tasks',
    label: 'Przypisywanie zadań',
    desc: 'Przydzielanie zadań poszczególnym pracownikom',
    icon: UserPlus,
    category: 'Zadania',
  },
  {
    key: 'can_manage_all_tasks',
    label: 'Zarządzanie wszystkimi zadaniami',
    desc: 'Edycja, zmiana statusów i nadzór nad wszystkimi zadaniami w firmie',
    icon: CheckSquare,
    category: 'Zadania',
  },
  {
    key: 'can_delete_tasks',
    label: 'Usuwanie zadań',
    desc: 'Przenoszenie zadań do kosza oraz trwałe ich usuwanie',
    icon: Trash2,
    category: 'Zadania',
  },
  {
    key: 'can_triage_bugs',
    label: 'Triage zgłoszeń błędów',
    desc: 'Przeglądanie raportów błędów, zmiana statusu i czat ze zgłaszającym',
    icon: Bug,
    category: 'Błędy i Serwisy',
  },
  {
    key: 'can_convert_bugs_to_tasks',
    label: 'Konwersja błędów na zadania',
    desc: 'Przekształcanie zgłoszeń usterek bezpośrednio w zadania TaskFlow',
    icon: ArrowRightCircle,
    category: 'Błędy i Serwisy',
  },
  {
    key: 'can_manage_applications',
    label: 'Monitorowane aplikacje',
    desc: 'Zarządzanie publicznymi serwisami i aplikacjami firmy',
    icon: Globe,
    category: 'Błędy i Serwisy',
  },
  {
    key: 'can_view_analytics',
    label: 'Analityka i wskaźniki KPI',
    desc: 'Dostęp do wykresów efektywności zespołu i raportów obciążenia',
    icon: BarChart3,
    category: 'Zarządzanie',
  },
  {
    key: 'can_view_audit_logs',
    label: 'Dziennik audytu',
    desc: 'Przeglądanie historii operacji i logów bezpieczeństwa',
    icon: ScrollText,
    category: 'Zarządzanie',
  },
  {
    key: 'can_manage_permissions',
    label: 'Edycja uprawnień i ról',
    desc: 'Zarządzanie posadami oraz matrycą uprawnień organizacji',
    icon: Shield,
    category: 'Zarządzanie',
  },
]
