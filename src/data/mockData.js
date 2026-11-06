/**
 * DANE MOCK - symulacja bazy MySQL
 * 
 * Struktura danych jest 1:1 z tabelami w bazie:
 * - positions  → Table positions
 * - users      → Table users (bez haseł oczywiście!)
 * - taskStatus → Table task_status
 * - priorities → Table priorities
 * - tasks      → Table tasks
 * - taskAssignments → Table task_assignments
 * 
 * Gdy dołączymy backend, wystarczy podmienić importy tych danych
 * na fetch() do API - reszta kodu pozostanie bez zmian.
 */

// Table: positions
// priority: 1 = najwyższy szczebel (może zlecać wszystkim poniżej)
export const positions = [
  { id: 1, name: 'Dyrektor',         description: 'Zarząd firmy',              priority: 1 },
  { id: 2, name: 'Project Manager',  description: 'Zarządzanie projektami',     priority: 2 },
  { id: 3, name: 'Senior Developer', description: 'Doświadczony programista',   priority: 3 },
  { id: 4, name: 'Junior Developer', description: 'Młodszy programista',        priority: 4 },
]

// Table: users (hasła oczywiście nie trafiają na frontend!)
export const users = [
  {
    id: 1,
    first_name: 'Anna',
    last_name: 'Kowalska',
    email: 'anna.kowalska@firma.pl',
    position_id: 1,          // Dyrektor
    created_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 2,
    first_name: 'Marek',
    last_name: 'Wiśniewski',
    email: 'marek.wisniewski@firma.pl',
    position_id: 2,          // Project Manager
    created_at: '2024-01-15T08:00:00Z',
  },
  {
    id: 3,
    first_name: 'Piotr',
    last_name: 'Nowak',
    email: 'piotr.nowak@firma.pl',
    position_id: 3,          // Senior Developer
    created_at: '2024-02-01T08:00:00Z',
  },
  {
    id: 4,
    first_name: 'Katarzyna',
    last_name: 'Zając',
    email: 'katarzyna.zajac@firma.pl',
    position_id: 4,          // Junior Developer
    created_at: '2024-02-15T08:00:00Z',
  },
  {
    id: 5,
    first_name: 'Tomasz',
    last_name: 'Lewandowski',
    email: 'tomasz.lewandowski@firma.pl',
    position_id: 4,          // Junior Developer (drugi)
    created_at: '2024-03-01T08:00:00Z',
  },
]

// Table: task_status
// id musi zgadzać się z wartościami status_id w tasks
export const taskStatuses = [
  { id: 1, name: 'Do zrobienia' },
  { id: 2, name: 'W trakcie'   },
  { id: 3, name: 'Zrobione'    },
  { id: 4, name: 'Anulowane'   },
]

// Table: priorities
export const priorities = [
  { id: 1, name: 'Niski',   level: 1 },
  { id: 2, name: 'Normalny',level: 2 },
  { id: 3, name: 'Wysoki',  level: 3 },
  { id: 4, name: 'Pilny',   level: 4 },
]

// Table: tasks
// creator_id → users.id (kto stworzył)
// status_id  → taskStatuses.id
// deleted_at: null = aktywne, data = w koszu (soft delete)
export const tasks = [
  {
    id: 1,
    title: 'Zaprojektować nowy dashboard',
    short_desc: 'Mockupy i prototyp dla nowego widoku analitycznego',
    full_desc: 'Należy przygotować figmę z trzema wariantami dashboardu: wersja mobilna, tabletowa i desktop. Uwzględnić widgety KPI i wykresy sprzedaży.',
    creator_id: 2,          // Marek (PM)
    status_id: 2,           // W trakcie
    due_date: '2026-11-20T00:00:00Z',
    created_at: '2026-11-01T09:00:00Z',
    deleted_at: null,
  },
  {
    id: 2,
    title: 'Naprawić błąd logowania',
    short_desc: 'Użytkownicy zgłaszają problem z SSO',
    full_desc: 'Po włączeniu 2FA część użytkowników nie może się zalogować przez SSO Google. Logi wskazują na błąd w callbacku OAuth.',
    creator_id: 3,          // Piotr (Senior Dev)
    status_id: 1,           // Do zrobienia
    due_date: '2026-11-10T00:00:00Z',
    created_at: '2026-11-02T10:30:00Z',
    deleted_at: null,
  },
  {
    id: 3,
    title: 'Napisać dokumentację API',
    short_desc: 'Swagger dla endpointów v2',
    full_desc: null,        // Pełny opis nie wypełniony
    creator_id: 2,          // Marek (PM)
    status_id: 1,           // Do zrobienia
    due_date: '2026-12-01T00:00:00Z',
    created_at: '2026-11-03T11:00:00Z',
    deleted_at: null,
  },
  {
    id: 4,
    title: 'Optymalizacja zapytań SQL',
    short_desc: 'Raporty miesięczne działają za wolno',
    full_desc: 'Profiling pokazuje N+1 w raportach. Dodać indeksy i przepisać 3 kluczowe zapytania z ORM na raw SQL.',
    creator_id: 3,          // Piotr (Senior Dev)
    status_id: 3,           // Zrobione
    due_date: '2026-10-30T00:00:00Z',
    created_at: '2026-10-20T08:00:00Z',
    deleted_at: null,
  },
  {
    id: 5,
    title: 'Stare zadanie do usunięcia',
    short_desc: 'Już niepotrzebne',
    full_desc: null,
    creator_id: 2,
    status_id: 4,           // Anulowane
    due_date: null,
    created_at: '2026-09-01T08:00:00Z',
    deleted_at: '2026-10-01T12:00:00Z', // Soft delete - w koszu
  },
  // ── 10 NOWYCH PRZYKŁADOWYCH ZADAŃ TESTOWYCH ──────────────────────────────
  {
    id: 6,
    title: 'Wdrożenie ciemnego motywu (Dark Mode)',
    short_desc: 'Dokończenie palety kolorów i kontrastów wg wytycznych WCAG',
    full_desc: 'Wdrożenie spójnego motywu ciemnego z wykorzystaniem zmiennych CSS oraz klas Tailwind. Należy sprawdzić kontrast przycisków, badge i tekstu w oknach dialogowych.',
    creator_id: 2,          // Marek (PM)
    status_id: 2,           // W trakcie
    due_date: '2026-11-25T00:00:00Z',
    created_at: '2026-11-04T08:30:00Z',
    deleted_at: null,
  },
  {
    id: 7,
    title: 'Audyt bezpieczeństwa i podatności',
    short_desc: 'Skanowanie zależności npm audit i testy zabezpieczeń endpointów',
    full_desc: 'Przejrzenie raportu podatności, aktualizacja przestarzałych paczek, weryfikacja nagłówków CORS i zabezpieczeń przed atakami CSRF/XSS.',
    creator_id: 1,          // Anna (Dyrektor)
    status_id: 2,           // W trakcie
    due_date: '2026-11-18T00:00:00Z',
    created_at: '2026-11-04T09:15:00Z',
    deleted_at: null,
  },
  {
    id: 8,
    title: 'Przygotowanie raportu sprintu dla zarządu',
    short_desc: 'Zestawienie ukończonych zadań, velocity zespołu i estymacja kosztów',
    full_desc: 'Zebranie statystyk z ostatnich 3 tygodni pracy. Wykresy wypalenia (burndown), wskaźniki SLA oraz plan kamieni milowych na kolejny kwartał.',
    creator_id: 1,          // Anna (Dyrektor)
    status_id: 2,           // W trakcie
    due_date: '2026-11-12T00:00:00Z',
    created_at: '2026-11-05T07:45:00Z',
    deleted_at: null,
  },
  {
    id: 9,
    title: 'Konfiguracja pipeline CI/CD na GitHub Actions',
    short_desc: 'Automatyczny lint, testy jednostkowe i podgląd buildu',
    full_desc: 'Utworzenie workflow .github/workflows/ci.yml uruchamiającego oxlint, testy komponentów oraz budowanie produkcyjne przy każdym Pull Requeście.',
    creator_id: 3,          // Piotr (Senior Dev)
    status_id: 1,           // Do zrobienia
    due_date: '2026-11-28T00:00:00Z',
    created_at: '2026-11-05T10:00:00Z',
    deleted_at: null,
  },
  {
    id: 10,
    title: 'Integracja bramki płatności Stripe',
    short_desc: 'Obsługa subskrypcji i webhooków o statusie transakcji',
    full_desc: 'Konfiguracja Stripe Elements w React, obsługa 3D Secure, endpointy webhook do przedłużania kont użytkowników i generowanie faktur PDF.',
    creator_id: 2,          // Marek (PM)
    status_id: 1,           // Do zrobienia
    due_date: '2026-12-05T00:00:00Z',
    created_at: '2026-11-05T11:30:00Z',
    deleted_at: null,
  },
  {
    id: 11,
    title: 'Refaktoryzacja walidacji formularzy (Zod)',
    short_desc: 'Ujednolicenie walidacji pól, komunikatów błędów i masek',
    full_desc: 'Zastąpienie rozproszonych walidacji ręcznych schematami Zod. Przygotowanie generycznych komponentów ErrorMessage i podświetleń niepoprawnych pól.',
    creator_id: 3,          // Piotr (Senior Dev)
    status_id: 1,           // Do zrobienia
    due_date: '2026-11-15T00:00:00Z',
    created_at: '2026-11-05T13:00:00Z',
    deleted_at: null,
  },
  {
    id: 12,
    title: 'Migracja bazy danych do MySQL 8.4 LTS',
    short_desc: 'Skrypty DDL, indeksy złożone i weryfikacja kopii zapasowej',
    full_desc: 'Przetestowanie migracji danych na środowisku staging, sprawdzenie kompatybilności collation utf8mb4_0900_ai_ci oraz pomiar czasu downtime.',
    creator_id: 1,          // Anna (Dyrektor)
    status_id: 3,           // Zrobione
    due_date: '2026-11-04T00:00:00Z',
    created_at: '2026-10-28T09:00:00Z',
    deleted_at: null,
  },
  {
    id: 13,
    title: 'Code Review modułu tokenów JWT',
    short_desc: 'Weryfikacja czasu życia refresh tokenów i rotacji kluczy',
    full_desc: 'Dokładny audyt mechanizmu rotacji tokenów w ciasteczkach HttpOnly, weryfikacja obsługi unieważniania sesji przy wylogowaniu z wielu urządzeń.',
    creator_id: 2,          // Marek (PM)
    status_id: 3,           // Zrobione
    due_date: '2026-11-02T00:00:00Z',
    created_at: '2026-10-25T14:00:00Z',
    deleted_at: null,
  },
  {
    id: 14,
    title: 'Testy obciążeniowe klastra (Load Testing)',
    short_desc: 'Symulacja 10 000 równoległych żądań HTTP narzędziem k6',
    full_desc: 'Sprawdzenie zachowania bazy i serwera cache przy skokowym wzroście ruchu. Identyfikacja wąskich gardeł w puli połączeń do bazy MySQL.',
    creator_id: 2,          // Marek (PM)
    status_id: 1,           // Do zrobienia
    due_date: '2026-12-10T00:00:00Z',
    created_at: '2026-11-06T08:00:00Z',
    deleted_at: null,
  },
  {
    id: 15,
    title: 'Stary skrypt importu CSV (przestarzały)',
    short_desc: 'Zastąpiony przez asynchroniczny job worker, do wyczyszczenia',
    full_desc: 'Kod legacy z wersji 1.0, usunięty z głównego widoku, czeka na ostateczne wyczyszczenie bazy.',
    creator_id: 2,          // Marek (PM)
    status_id: 4,           // Anulowane
    due_date: null,
    created_at: '2026-09-10T08:00:00Z',
    deleted_at: '2026-11-05T15:00:00Z', // Soft delete - w koszu
  },
]

// Table: task_assignments
// PK: (task_id, employee_id) — para jest unikalna
// assignment_status: 'pending' | 'accepted' | 'rejected'
export const taskAssignments = [
  {
    task_id: 1,
    employee_id: 2,         // Marek (PM) koordynuje dashboard
    priority_id: 3,         // Wysoki
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-01T09:00:00Z',
  },
  {
    task_id: 1,
    employee_id: 3,         // Piotr pracuje nad dashboardem
    priority_id: 3,         // Wysoki priorytet
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-01T09:05:00Z',
  },
  {
    task_id: 1,
    employee_id: 4,         // Katarzyna też pracuje nad dashboardem (udostępnione)
    priority_id: 2,         // Normalny priorytet
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-01T09:10:00Z',
  },
  {
    task_id: 2,
    employee_id: 4,         // Katarzyna ma naprawić login
    priority_id: 4,         // Pilny!
    assignment_status: 'pending', // Czeka na akceptację
    rejection_reason: null,
    assigned_at: '2026-11-02T10:35:00Z',
  },
  {
    task_id: 3,
    employee_id: 5,         // Tomasz ma pisać dokumentację
    priority_id: 2,
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-03T11:05:00Z',
  },
  {
    task_id: 4,
    employee_id: 4,         // Katarzyna była przypisana do optymalizacji
    priority_id: 3,
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-10-20T08:05:00Z',
  },
  // ── PRZYPISANIA DLA NOWYCH ZADAŃ 6-15 ───────────────────────────────────
  {
    task_id: 6,
    employee_id: 2,         // Marek (W trakcie)
    priority_id: 3,         // Wysoki
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-04T08:35:00Z',
  },
  {
    task_id: 6,
    employee_id: 3,         // Piotr (Współpraca)
    priority_id: 4,         // Dla Piotra to Pilny
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-04T08:40:00Z',
  },
  {
    task_id: 7,
    employee_id: 2,         // Marek (W trakcie)
    priority_id: 4,         // Pilny
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-04T09:20:00Z',
  },
  {
    task_id: 7,
    employee_id: 3,         // Piotr (Senior Dev)
    priority_id: 4,         // Pilny
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-04T09:25:00Z',
  },
  {
    task_id: 8,
    employee_id: 2,         // Marek (W trakcie)
    priority_id: 3,         // Wysoki
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-05T07:50:00Z',
  },
  {
    task_id: 9,
    employee_id: 2,         // Marek (Do zrobienia)
    priority_id: 2,         // Normalny
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-05T10:05:00Z',
  },
  {
    task_id: 9,
    employee_id: 3,         // Piotr (Senior Dev)
    priority_id: 3,         // Wysoki
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-05T10:10:00Z',
  },
  {
    task_id: 10,
    employee_id: 2,         // Marek (Do zrobienia - oczekuje na decyzję!)
    priority_id: 4,         // Pilny
    assignment_status: 'pending',
    rejection_reason: null,
    assigned_at: '2026-11-05T11:35:00Z',
  },
  {
    task_id: 10,
    employee_id: 4,         // Katarzyna (Junior Dev)
    priority_id: 3,         // Wysoki
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-05T11:40:00Z',
  },
  {
    task_id: 11,
    employee_id: 2,         // Marek (Do zrobienia)
    priority_id: 2,         // Normalny
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-05T13:05:00Z',
  },
  {
    task_id: 11,
    employee_id: 5,         // Tomasz (Junior Dev)
    priority_id: 2,         // Normalny
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-05T13:10:00Z',
  },
  {
    task_id: 12,
    employee_id: 2,         // Marek (Zrobione)
    priority_id: 3,         // Wysoki
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-10-28T09:05:00Z',
  },
  {
    task_id: 13,
    employee_id: 2,         // Marek (Zrobione)
    priority_id: 2,         // Normalny
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-10-25T14:05:00Z',
  },
  {
    task_id: 14,
    employee_id: 4,         // Katarzyna
    priority_id: 3,
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-06T08:05:00Z',
  },
  {
    task_id: 14,
    employee_id: 5,         // Tomasz
    priority_id: 3,
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-11-06T08:10:00Z',
  },
  {
    task_id: 15,
    employee_id: 2,         // Marek (W koszu)
    priority_id: 1,         // Niski
    assignment_status: 'accepted',
    rejection_reason: null,
    assigned_at: '2026-09-10T08:05:00Z',
  },
]

/**
 * HELPER FUNCTIONS - funkcje pomocnicze do "queryowania" danych
 * 
 * To symuluje zapytania SQL, które normalnie napisałbyś w backendzie.
 * Gdy dołączymy API, te funkcje zastąpimy wywołaniami fetch().
 */

// Odpowiednik: SELECT * FROM users JOIN positions ON users.position_id = positions.id WHERE users.id = ?
export function getUserWithPosition(userId) {
  const user = users.find(u => u.id === userId)
  if (!user) return null
  const position = positions.find(p => p.id === user.position_id)
  return { ...user, position }
}

// Odpowiednik: SELECT tasks.*, task_assignments.* FROM tasks 
//             LEFT JOIN task_assignments ON tasks.id = task_assignments.task_id
//             WHERE task_assignments.employee_id = ? AND tasks.deleted_at IS NULL
export function getTasksForUser(userId) {
  const assignedTaskIds = taskAssignments
    .filter(a => a.employee_id === userId)
    .map(a => a.task_id)
  
  return tasks.filter(t => 
    assignedTaskIds.includes(t.id) && t.deleted_at === null
  )
}

// Odpowiednik: SELECT * FROM tasks WHERE creator_id = ? AND deleted_at IS NULL
export function getTasksCreatedBy(userId) {
  return tasks.filter(t => t.creator_id === userId && t.deleted_at === null)
}

// Odpowiednik: SELECT * FROM tasks WHERE deleted_at IS NOT NULL AND creator_id = ?
export function getDeletedTasks(userId) {
  const assignedTaskIds = taskAssignments
    .filter(a => a.employee_id === userId)
    .map(a => a.task_id)
  
  return tasks.filter(t => 
    t.deleted_at !== null && (t.creator_id === userId || assignedTaskIds.includes(t.id))
  )
}

// Pobiera przypisanie dla konkretnego użytkownika i zadania
export function getAssignment(taskId, userId) {
  return taskAssignments.find(a => a.task_id === taskId && a.employee_id === userId)
}

// Pobiera wszystkich przypisanych do zadania (z danymi użytkowników)
export function getAssigneesForTask(taskId) {
  return taskAssignments
    .filter(a => a.task_id === taskId)
    .map(a => ({
      ...a,
      user: getUserWithPosition(a.employee_id),
      priority: priorities.find(p => p.id === a.priority_id),
    }))
}

// Sprawdza czy userA może zlecić zadanie userB
// Reguła: można zlecać tylko osobom o wyższym numerze priority (niższy szczebel)
// lub udostępniać osobom o tym samym poziomie
export function canDelegate(fromUserId, toUserId) {
  const fromUser = getUserWithPosition(fromUserId)
  const toUser = getUserWithPosition(toUserId)
  if (!fromUser || !toUser) return false
  
  return fromUser.position.priority < toUser.position.priority
}

export function canShare(fromUserId, toUserId) {
  const fromUser = getUserWithPosition(fromUserId)
  const toUser = getUserWithPosition(toUserId)
  if (!fromUser || !toUser) return false
  
  return fromUser.position.priority === toUser.position.priority
}

// Mapowanie status_id → variant dla Badge komponentu
export const statusVariantMap = {
  1: 'status-todo',
  2: 'status-inprogress',
  3: 'status-done',
  4: 'status-cancelled',
}

// Mapowanie priority_id → variant dla Badge
export const priorityVariantMap = {
  1: 'priority-low',
  2: 'priority-normal',
  3: 'priority-high',
  4: 'priority-urgent',
}
