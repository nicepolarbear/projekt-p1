import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/crypto.js';
import { closeDb, getDb, withTransaction } from './connection.js';
import { runMigrations } from './migrate.js';

const ROLES = [
  { id: 1, name: 'admin', description: 'Administrator systemu' },
  { id: 2, name: 'dyrektor', description: 'Dyrektor / Zarząd firmy' },
  { id: 3, name: 'kierownik', description: 'Kierownik / Project Manager' },
  { id: 4, name: 'pracownik', description: 'Pracownik / Specjalista' },
];

const ORGANIZATIONS = [
  {
    id: 1,
    name: 'TaskFlow Polska Sp. z o.o.',
    slug: 'taskflow-polska',
    industry: 'IT / SaaS',
    size: '10-50',
    created_by_user_id: 6,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const ADMIN_PERMISSIONS = {
  is_admin: 1,
  can_manage_members: 1,
  can_generate_invites: 1,
  can_approve_join_requests: 1,
  can_create_tasks: 1,
  can_assign_tasks: 1,
  can_manage_all_tasks: 1,
  can_delete_tasks: 1,
  can_triage_bugs: 1,
  can_convert_bugs_to_tasks: 1,
  can_manage_applications: 1,
  can_view_analytics: 1,
  can_view_audit_logs: 1,
  can_manage_permissions: 1,
};

const POSITIONS = [
  {
    id: 1,
    name: 'Dyrektor',
    description: 'Zarząd firmy',
    priority: 1,
    is_delegatable: 1,
    ...ADMIN_PERMISSIONS,
  },
  {
    id: 2,
    name: 'Project Manager',
    description: 'Zarządzanie projektami',
    priority: 2,
    is_delegatable: 1,
    is_admin: 0,
    can_manage_members: 0,
    can_generate_invites: 0,
    can_approve_join_requests: 0,
    can_create_tasks: 1,
    can_assign_tasks: 1,
    can_manage_all_tasks: 1,
    can_delete_tasks: 1,
    can_triage_bugs: 1,
    can_convert_bugs_to_tasks: 1,
    can_manage_applications: 0,
    can_view_analytics: 1,
    can_view_audit_logs: 0,
    can_manage_permissions: 0,
  },
  {
    id: 3,
    name: 'Senior Developer',
    description: 'Doświadczony programista',
    priority: 3,
    is_delegatable: 1,
    is_admin: 0,
    can_manage_members: 0,
    can_generate_invites: 0,
    can_approve_join_requests: 0,
    can_create_tasks: 1,
    can_assign_tasks: 1,
    can_manage_all_tasks: 0,
    can_delete_tasks: 0,
    can_triage_bugs: 0,
    can_convert_bugs_to_tasks: 0,
    can_manage_applications: 0,
    can_view_analytics: 0,
    can_view_audit_logs: 0,
    can_manage_permissions: 0,
  },
  {
    id: 4,
    name: 'Junior Developer',
    description: 'Młodszy programista',
    priority: 4,
    is_delegatable: 1,
    is_admin: 0,
    can_manage_members: 0,
    can_generate_invites: 0,
    can_approve_join_requests: 0,
    can_create_tasks: 1,
    can_assign_tasks: 0,
    can_manage_all_tasks: 0,
    can_delete_tasks: 0,
    can_triage_bugs: 0,
    can_convert_bugs_to_tasks: 0,
    can_manage_applications: 0,
    can_view_analytics: 0,
    can_view_audit_logs: 0,
    can_manage_permissions: 0,
  },
  {
    id: 5,
    name: 'Administrator Systemu',
    description: 'Administracja i bezpieczeństwo systemu',
    priority: 5,
    is_delegatable: 0,
    ...ADMIN_PERMISSIONS,
  },
];

const DEPARTMENTS = [
  { id: 1, code: 'EXEC', name: 'Zarząd', description: 'Kierownictwo i strategia firmy' },
  { id: 2, code: 'PMO', name: 'Zarządzanie Projektami', description: 'Biuro zarządzania projektami' },
  { id: 3, code: 'ENG', name: 'Inżynieria Oprogramowania', description: 'Zespół deweloperski' },
  { id: 4, code: 'ITSEC', name: 'IT & Bezpieczeństwo', description: 'Administracja IT i bezpieczeństwo' },
];

const TASK_STATUSES = [
  { id: 1, name: 'Do zrobienia' },
  { id: 2, name: 'W trakcie' },
  { id: 3, name: 'Zrobione' },
  { id: 4, name: 'Anulowane' },
];

const PRIORITIES = [
  { id: 1, name: 'Niski', level: 1 },
  { id: 2, name: 'Normalny', level: 2 },
  { id: 3, name: 'Wysoki', level: 3 },
  { id: 4, name: 'Pilny', level: 4 },
];

const USERS = [
  {
    id: 1,
    first_name: 'Anna',
    last_name: 'Kowalska',
    email: 'anna.kowalska@firma.pl',
    role_id: 2,
    position_id: 1,
    department_id: 1,
    organization_id: 1,
    account_type: 'business_user',
    avatar_color: '#f59e0b',
    bio: 'Dyrektor zarządzająca odpowiedzialna za strategię produktową.',
    phone: '+48 600 100 001',
    created_at: '2024-01-10T08:00:00Z',
  },
  {
    id: 2,
    first_name: 'Marek',
    last_name: 'Wiśniewski',
    email: 'marek.wisniewski@firma.pl',
    role_id: 3,
    position_id: 2,
    department_id: 2,
    organization_id: 1,
    account_type: 'business_user',
    avatar_color: '#0ea5e9',
    bio: 'Project Manager koordynujący dostarczanie sprintów i kamieni milowych.',
    phone: '+48 600 100 002',
    created_at: '2024-01-15T08:00:00Z',
  },
  {
    id: 3,
    first_name: 'Piotr',
    last_name: 'Nowak',
    email: 'piotr.nowak@firma.pl',
    role_id: 4,
    position_id: 3,
    department_id: 3,
    organization_id: 1,
    account_type: 'business_user',
    avatar_color: '#10b981',
    bio: 'Senior Developer specjalizujący się w architekturze backendu i bazach danych.',
    phone: '+48 600 100 003',
    created_at: '2024-02-01T08:00:00Z',
  },
  {
    id: 4,
    first_name: 'Katarzyna',
    last_name: 'Zając',
    email: 'katarzyna.zajac@firma.pl',
    role_id: 4,
    position_id: 4,
    department_id: 3,
    organization_id: 1,
    account_type: 'business_user',
    avatar_color: '#ec4899',
    bio: 'Junior Developer rozwijająca interfejsy użytkownika i testy.',
    phone: '+48 600 100 004',
    created_at: '2024-02-15T08:00:00Z',
  },
  {
    id: 5,
    first_name: 'Tomasz',
    last_name: 'Lewandowski',
    email: 'tomasz.lewandowski@firma.pl',
    role_id: 4,
    position_id: 4,
    department_id: 3,
    organization_id: 1,
    account_type: 'business_user',
    avatar_color: '#8b5cf6',
    bio: 'Junior Developer pracujący nad dokumentacją API i walidacją formularzy.',
    phone: '+48 600 100 005',
    created_at: '2024-03-01T08:00:00Z',
  },
  {
    id: 6,
    first_name: 'Jan',
    last_name: 'Zieliński',
    email: 'admin@firma.pl',
    role_id: 1,
    position_id: 5,
    department_id: 4,
    organization_id: 1,
    account_type: 'business_user',
    avatar_color: '#a855f7',
    bio: 'Administrator Systemu odpowiedzialny za dostępność, konta i audyt bezpieczeństwa.',
    phone: '+48 600 100 006',
    created_at: '2024-01-05T08:00:00Z',
  },
  {
    id: 7,
    first_name: 'Zofia',
    last_name: 'Tester',
    email: 'reporter@portal.pl',
    role_id: null,
    position_id: null,
    department_id: null,
    organization_id: null,
    account_type: 'individual_reporter',
    avatar_color: '#06b6d4',
    bio: 'Zewnętrzny tester aplikacji i zgłaszający usterki.',
    phone: '+48 600 100 007',
    created_at: '2024-04-01T08:00:00Z',
  },
];

const APPLICATIONS = [
  {
    id: 1,
    organization_id: 1,
    name: 'TaskFlow Web Portal',
    url: 'https://taskflow.io',
    description: 'Główny portal webowy i aplikacja SaaS',
    is_active: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    organization_id: 1,
    name: 'Główny Portal Firmowy',
    url: 'https://firma.pl',
    description: 'Wewnętrzny portal pracowniczy i intranet',
    is_active: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const INVITATION_CODES = [
  {
    id: 1,
    organization_id: 1,
    code: 'TF-DEMO-2026',
    created_by_user_id: 6,
    suggested_position_id: 4,
    max_uses: 10,
    uses_count: 0,
    is_active: 1,
    created_at: '2024-01-01T00:00:00Z',
  },
];

const BUG_REPORTS = [
  {
    id: 1,
    organization_id: 1,
    application_id: 1,
    custom_url: 'https://taskflow.io/dashboard',
    reporter_user_id: 4,
    guest_email: null,
    guest_name: null,
    is_anonymous: 0,
    title: 'Problem z ładowaniem wykresów na dashboardzie',
    description: 'Po wybraniu zakresu dat dłuższego niż 30 dni wykres słupkowy nie renderuje się.',
    attachment_url: null,
    severity: 'high',
    status: 'new',
    rejection_reason: null,
    tracking_code: 'BUG-1001',
    created_at: '2026-11-05T10:00:00Z',
    updated_at: '2026-11-05T10:00:00Z',
  },
  {
    id: 2,
    organization_id: 1,
    application_id: 1,
    custom_url: 'https://taskflow.io/tasks/export',
    reporter_user_id: null,
    guest_email: 'klient@example.com',
    guest_name: 'Jan Kowal',
    is_anonymous: 0,
    title: 'Błąd 500 przy eksporcie raportu do PDF',
    description: 'Przycisk Eksportuj PDF w module zadań zwraca błąd 500 przy zadaniach ze znakami specjalnymi.',
    attachment_url: null,
    severity: 'critical',
    status: 'in_analysis',
    rejection_reason: null,
    tracking_code: 'BUG-1002',
    created_at: '2026-11-06T12:00:00Z',
    updated_at: '2026-11-06T14:30:00Z',
  },
  {
    id: 3,
    organization_id: 1,
    application_id: 1,
    custom_url: null,
    reporter_user_id: 7,
    guest_email: null,
    guest_name: null,
    is_anonymous: 0,
    title: 'Nieprawidłowe formatowanie waluty w module rozliczeń',
    description: 'W tabeli faktur kwoty w euro wyświetlają się z prefiksem PLN zamiast EUR. Proszę o weryfikację formatowania.',
    attachment_url: null,
    severity: 'normal',
    status: 'in_progress',
    rejection_reason: null,
    tracking_code: 'BUG-1003',
    created_at: '2026-11-08T09:15:00Z',
    updated_at: '2026-11-08T11:00:00Z',
  },
];

const BUG_COMMENTS = [
  {
    id: 1,
    bug_report_id: 1,
    user_id: 2,
    author_name: 'Marek Wiśniewski',
    is_staff: 1,
    content: 'Dziękujemy za zgłoszenie. Sprawdzamy logi serwera.',
    created_at: '2026-11-05T10:30:00Z',
  },
  {
    id: 2,
    bug_report_id: 2,
    user_id: 3,
    author_name: 'Piotr Nowak',
    is_staff: 1,
    content: 'Czy problem występuje na wszystkich przeglądarkach?',
    created_at: '2026-11-06T13:00:00Z',
  },
  {
    id: 3,
    bug_report_id: 2,
    user_id: null,
    author_name: 'Jan Kowal',
    is_staff: 0,
    content: 'Tak, sprawdzone na Chrome i Firefox.',
    created_at: '2026-11-06T14:00:00Z',
  },
  {
    id: 4,
    bug_report_id: 3,
    user_id: 7,
    author_name: 'Zofia Tester',
    is_staff: 0,
    content: 'Dzień dobry, zauważyłam ten problem na środowisku produkcyjnym.',
    created_at: '2026-11-08T09:20:00Z',
  },
  {
    id: 5,
    bug_report_id: 3,
    user_id: 2,
    author_name: 'Marek Wiśniewski',
    is_staff: 1,
    content: 'Cześć Zofia! Poprawka jest już w trakcie testów, wdrożymy ją w dzisiejszym releasie.',
    created_at: '2026-11-08T11:00:00Z',
  },
];

const TASKS = [
  {
    id: 1,
    title: 'Zaprojektować nowy dashboard',
    short_desc: 'Mockupy i prototyp dla nowego widoku analitycznego',
    full_desc:
      'Należy przygotować figmę z trzema wariantami dashboardu: wersja mobilna, tabletowa i desktop. Uwzględnić widgety KPI i wykresy sprzedaży.',
    creator_id: 2,
    status_id: 2,
    due_date: '2026-11-20T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-01T09:00:00Z',
  },
  {
    id: 2,
    title: 'Naprawić błąd logowania',
    short_desc: 'Użytkownicy zgłaszają problem z SSO',
    full_desc:
      'Po włączeniu 2FA część użytkowników nie może się zalogować przez SSO Google. Logi wskazują na błąd w callbacku OAuth.',
    creator_id: 3,
    status_id: 1,
    due_date: '2026-11-10T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-02T10:30:00Z',
  },
  {
    id: 3,
    title: 'Napisać dokumentację API',
    short_desc: 'Swagger dla endpointów v2',
    full_desc: null,
    creator_id: 2,
    status_id: 1,
    due_date: '2026-12-01T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-03T11:00:00Z',
  },
  {
    id: 4,
    title: 'Optymalizacja zapytań SQL',
    short_desc: 'Raporty miesięczne działają za wolno',
    full_desc:
      'Profiling pokazuje N+1 w raportach. Dodać indeksy i przepisać 3 kluczowe zapytania z ORM na raw SQL.',
    creator_id: 3,
    status_id: 3,
    due_date: '2026-10-30T00:00:00Z',
    completed_at: '2026-10-30T00:00:00Z',
    deleted_at: null,
    created_at: '2026-10-20T08:00:00Z',
  },
  {
    id: 5,
    title: 'Stare zadanie do usunięcia',
    short_desc: 'Już niepotrzebne',
    full_desc: null,
    creator_id: 2,
    status_id: 4,
    due_date: null,
    completed_at: null,
    deleted_at: '2026-10-01T12:00:00Z',
    created_at: '2026-09-01T08:00:00Z',
  },
  {
    id: 6,
    title: 'Wdrożenie ciemnego motywu (Dark Mode)',
    short_desc: 'Dokończenie palety kolorów i kontrastów wg wytycznych WCAG',
    full_desc:
      'Wdrożenie spójnego motywu ciemnego z wykorzystaniem zmiennych CSS oraz klas Tailwind. Należy sprawdzić kontrast przycisków, badge i tekstu w oknach dialogowych.',
    creator_id: 2,
    status_id: 2,
    due_date: '2026-11-25T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-04T08:30:00Z',
  },
  {
    id: 7,
    title: 'Audyt bezpieczeństwa i podatności',
    short_desc: 'Skanowanie zależności npm audit i testy zabezpieczeń endpointów',
    full_desc:
      'Przejrzenie raportu podatności, aktualizacja przestarzałych paczek, weryfikacja nagłówków CORS i zabezpieczeń przed atakami CSRF/XSS.',
    creator_id: 1,
    status_id: 2,
    due_date: '2026-11-18T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-04T09:15:00Z',
  },
  {
    id: 8,
    title: 'Przygotowanie raportu sprintu dla zarządu',
    short_desc: 'Zestawienie ukończonych zadań, velocity zespołu i estymacja kosztów',
    full_desc:
      'Zebranie statystyk z ostatnich 3 tygodni pracy. Wykresy wypalenia (burndown), wskaźniki SLA oraz plan kamieni milowych na kolejny kwartał.',
    creator_id: 1,
    status_id: 2,
    due_date: '2026-11-12T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-05T07:45:00Z',
  },
  {
    id: 9,
    title: 'Konfiguracja pipeline CI/CD na GitHub Actions',
    short_desc: 'Automatyczny lint, testy jednostkowe i podgląd buildu',
    full_desc:
      'Utworzenie workflow .github/workflows/ci.yml uruchamiającego oxlint, testy komponentów oraz budowanie produkcyjne przy każdym Pull Requeście.',
    creator_id: 3,
    status_id: 1,
    due_date: '2026-11-28T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-05T10:00:00Z',
  },
  {
    id: 10,
    title: 'Integracja bramki płatności Stripe',
    short_desc: 'Obsługa subskrypcji i webhooków o statusie transakcji',
    full_desc:
      'Konfiguracja Stripe Elements w React, obsługa 3D Secure, endpointy webhook do przedłużania kont użytkowników i generowanie faktur PDF.',
    creator_id: 2,
    status_id: 1,
    due_date: '2026-12-05T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-05T11:30:00Z',
  },
  {
    id: 11,
    title: 'Refaktoryzacja walidacji formularzy (Zod)',
    short_desc: 'Ujednolicenie walidacji pól, komunikatów błędów i masek',
    full_desc:
      'Zastąpienie rozproszonych walidacji ręcznych schematami Zod. Przygotowanie generycznych komponentów ErrorMessage i podświetleń niepoprawnych pól.',
    creator_id: 3,
    status_id: 1,
    due_date: '2026-11-15T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-05T13:00:00Z',
  },
  {
    id: 12,
    title: 'Migracja bazy danych do MySQL 8.4 LTS',
    short_desc: 'Skrypty DDL, indeksy złożone i weryfikacja kopii zapasowej',
    full_desc:
      'Przetestowanie migracji danych na środowisku staging, sprawdzenie kompatybilności collation utf8mb4_0900_ai_ci oraz pomiar czasu downtime.',
    creator_id: 1,
    status_id: 3,
    due_date: '2026-11-04T00:00:00Z',
    completed_at: '2026-11-04T00:00:00Z',
    deleted_at: null,
    created_at: '2026-10-28T09:00:00Z',
  },
  {
    id: 13,
    title: 'Code Review modułu tokenów JWT',
    short_desc: 'Weryfikacja czasu życia refresh tokenów i rotacji kluczy',
    full_desc:
      'Dokładny audyt mechanizmu rotacji tokenów w ciasteczkach HttpOnly, weryfikacja obsługi unieważniania sesji przy wylogowaniu z wielu urządzeń.',
    creator_id: 2,
    status_id: 3,
    due_date: '2026-11-02T00:00:00Z',
    completed_at: '2026-11-02T00:00:00Z',
    deleted_at: null,
    created_at: '2026-10-25T14:00:00Z',
  },
  {
    id: 14,
    title: 'Testy obciążeniowe klastra (Load Testing)',
    short_desc: 'Symulacja 10 000 równoległych żądań HTTP narzędziem k6',
    full_desc:
      'Sprawdzenie zachowania bazy i serwera cache przy skokowym wzroście ruchu. Identyfikacja wąskich gardeł w puli połączeń do bazy MySQL.',
    creator_id: 2,
    status_id: 1,
    due_date: '2026-12-10T00:00:00Z',
    completed_at: null,
    deleted_at: null,
    created_at: '2026-11-06T08:00:00Z',
  },
  {
    id: 15,
    title: 'Stary skrypt importu CSV (przestarzały)',
    short_desc: 'Zastąpiony przez asynchroniczny job worker, do wyczyszczenia',
    full_desc:
      'Kod legacy z wersji 1.0, usunięty z głównego widoku, czeka na ostateczne wyczyszczenie bazy.',
    creator_id: 2,
    status_id: 4,
    due_date: null,
    completed_at: null,
    deleted_at: '2026-11-05T15:00:00Z',
    created_at: '2026-09-10T08:00:00Z',
  },
];

const TASK_ASSIGNMENTS = [
  { task_id: 1, employee_id: 2, assigned_by: 2, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-01T09:00:00Z' },
  { task_id: 1, employee_id: 3, assigned_by: 2, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-01T09:05:00Z' },
  { task_id: 1, employee_id: 4, assigned_by: 2, priority_id: 2, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-01T09:10:00Z' },
  { task_id: 2, employee_id: 4, assigned_by: 3, priority_id: 4, assignment_status: 'pending', rejection_reason: null, assigned_at: '2026-11-02T10:35:00Z' },
  { task_id: 3, employee_id: 5, assigned_by: 2, priority_id: 2, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-03T11:05:00Z' },
  { task_id: 4, employee_id: 4, assigned_by: 3, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-10-20T08:05:00Z' },
  { task_id: 6, employee_id: 2, assigned_by: 2, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-04T08:35:00Z' },
  { task_id: 6, employee_id: 3, assigned_by: 2, priority_id: 4, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-04T08:40:00Z' },
  { task_id: 7, employee_id: 2, assigned_by: 1, priority_id: 4, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-04T09:20:00Z' },
  { task_id: 7, employee_id: 3, assigned_by: 1, priority_id: 4, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-04T09:25:00Z' },
  { task_id: 8, employee_id: 2, assigned_by: 1, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-05T07:50:00Z' },
  { task_id: 9, employee_id: 2, assigned_by: 3, priority_id: 2, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-05T10:05:00Z' },
  { task_id: 9, employee_id: 3, assigned_by: 3, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-05T10:10:00Z' },
  { task_id: 10, employee_id: 2, assigned_by: 2, priority_id: 4, assignment_status: 'pending', rejection_reason: null, assigned_at: '2026-11-05T11:35:00Z' },
  { task_id: 10, employee_id: 4, assigned_by: 2, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-05T11:40:00Z' },
  { task_id: 11, employee_id: 2, assigned_by: 3, priority_id: 2, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-05T13:05:00Z' },
  { task_id: 11, employee_id: 5, assigned_by: 3, priority_id: 2, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-05T13:10:00Z' },
  { task_id: 12, employee_id: 2, assigned_by: 1, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-10-28T09:05:00Z' },
  { task_id: 13, employee_id: 2, assigned_by: 2, priority_id: 2, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-10-25T14:05:00Z' },
  { task_id: 14, employee_id: 4, assigned_by: 2, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-06T08:05:00Z' },
  { task_id: 14, employee_id: 5, assigned_by: 2, priority_id: 3, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-11-06T08:10:00Z' },
  { task_id: 15, employee_id: 2, assigned_by: 2, priority_id: 1, assignment_status: 'accepted', rejection_reason: null, assigned_at: '2026-09-10T08:05:00Z' },
];

export async function seedDatabase(db = getDb(), { force = false } = {}) {
  const existing = await db.prepare('SELECT COUNT(*) AS cnt FROM roles').get();
  if (existing && Number(existing.cnt) > 0 && !force) {
    return { skipped: true };
  }

  const userPasswordHashes = await Promise.all(
    USERS.map(() => hashPassword(env.SEED_DEFAULT_PASSWORD))
  );

  return await withTransaction(async (tx) => {
    if (force) {
      await tx.exec(`
        DELETE FROM bug_task_links;
        DELETE FROM bug_comments;
        DELETE FROM bug_reports;
        DELETE FROM applications;
        DELETE FROM join_requests;
        DELETE FROM invitation_codes;
        DELETE FROM organization_members;
        DELETE FROM audit_logs;
        DELETE FROM task_assignments;
        DELETE FROM tasks;
        DELETE FROM sessions;
        DELETE FROM users;
        DELETE FROM departments;
        DELETE FROM positions;
        DELETE FROM organizations;
        DELETE FROM priorities;
        DELETE FROM task_statuses;
        DELETE FROM roles;
      `);
    }

    const insertRole = tx.prepare(
      'INSERT INTO roles (id, name, description, created_at) VALUES (?, ?, ?, ?) ON CONFLICT (id) DO NOTHING'
    );
    for (const role of ROLES) {
      await insertRole.run(role.id, role.name, role.description, '2024-01-01T00:00:00Z');
    }

    const insertOrg = tx.prepare(
      'INSERT INTO organizations (id, name, slug, industry, size, created_by_user_id, created_at) VALUES (?, ?, ?, ?, ?, NULL, ?) ON CONFLICT (id) DO NOTHING'
    );
    for (const org of ORGANIZATIONS) {
      await insertOrg.run(org.id, org.name, org.slug, org.industry, org.size, org.created_at);
    }

    const insertPosition = tx.prepare(`
      INSERT INTO positions (
        id, name, description, priority, is_delegatable,
        is_admin, can_manage_members, can_generate_invites, can_approve_join_requests,
        can_create_tasks, can_assign_tasks, can_manage_all_tasks, can_delete_tasks,
        can_triage_bugs, can_convert_bugs_to_tasks, can_manage_applications,
        can_view_analytics, can_view_audit_logs, can_manage_permissions, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `);
    for (const pos of POSITIONS) {
      await insertPosition.run(
        pos.id,
        pos.name,
        pos.description,
        pos.priority,
        pos.is_delegatable,
        pos.is_admin,
        pos.can_manage_members,
        pos.can_generate_invites,
        pos.can_approve_join_requests,
        pos.can_create_tasks,
        pos.can_assign_tasks,
        pos.can_manage_all_tasks,
        pos.can_delete_tasks,
        pos.can_triage_bugs,
        pos.can_convert_bugs_to_tasks,
        pos.can_manage_applications,
        pos.can_view_analytics,
        pos.can_view_audit_logs,
        pos.can_manage_permissions,
        '2024-01-01T00:00:00Z'
      );
    }

    const insertDepartment = tx.prepare(
      'INSERT INTO departments (id, code, name, description, created_at) VALUES (?, ?, ?, ?, ?) ON CONFLICT (id) DO NOTHING'
    );
    for (const dept of DEPARTMENTS) {
      await insertDepartment.run(dept.id, dept.code, dept.name, dept.description, '2024-01-01T00:00:00Z');
    }

    const insertStatus = tx.prepare(
      'INSERT INTO task_statuses (id, name) VALUES (?, ?) ON CONFLICT (id) DO NOTHING'
    );
    for (const status of TASK_STATUSES) {
      await insertStatus.run(status.id, status.name);
    }

    const insertPriority = tx.prepare(
      'INSERT INTO priorities (id, name, level) VALUES (?, ?, ?) ON CONFLICT (id) DO NOTHING'
    );
    for (const prio of PRIORITIES) {
      await insertPriority.run(prio.id, prio.name, prio.level);
    }

    const insertUser = tx.prepare(`
      INSERT INTO users (
        id, first_name, last_name, email, password_hash,
        role_id, position_id, department_id, organization_id, account_type,
        avatar_color, bio, phone, preferences_json, token_version, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', 1, 1, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `);
    for (let idx = 0; idx < USERS.length; idx++) {
      const user = USERS[idx];
      await insertUser.run(
        user.id,
        user.first_name,
        user.last_name,
        user.email,
        userPasswordHashes[idx],
        user.role_id,
        user.position_id,
        user.department_id,
        user.organization_id,
        user.account_type,
        user.avatar_color,
        user.bio,
        user.phone,
        user.created_at,
        user.created_at
      );
    }

    const updateOrgCreator = tx.prepare(
      'UPDATE organizations SET created_by_user_id = ? WHERE id = ?'
    );
    for (const org of ORGANIZATIONS) {
      await updateOrgCreator.run(org.created_by_user_id, org.id);
    }

    const insertMember = tx.prepare(`
      INSERT INTO organization_members (
        organization_id, user_id, role_id, position_id, department_id, status, joined_at
      ) VALUES (?, ?, ?, ?, ?, 'active', ?)
      ON CONFLICT (organization_id, user_id) DO NOTHING
    `);
    for (const user of USERS) {
      if (user.organization_id) {
        await insertMember.run(
          user.organization_id,
          user.id,
          user.role_id,
          user.position_id,
          user.department_id,
          user.created_at
        );
      }
    }

    const insertApp = tx.prepare(`
      INSERT INTO applications (id, organization_id, name, url, description, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `);
    for (const app of APPLICATIONS) {
      await insertApp.run(
        app.id,
        app.organization_id,
        app.name,
        app.url,
        app.description,
        app.is_active,
        app.created_at
      );
    }

    const insertInvite = tx.prepare(`
      INSERT INTO invitation_codes (
        id, organization_id, code, created_by_user_id, suggested_position_id,
        max_uses, uses_count, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `);
    for (const inv of INVITATION_CODES) {
      await insertInvite.run(
        inv.id,
        inv.organization_id,
        inv.code,
        inv.created_by_user_id,
        inv.suggested_position_id,
        inv.max_uses,
        inv.uses_count,
        inv.is_active,
        inv.created_at
      );
    }

    const insertTask = tx.prepare(`
      INSERT INTO tasks (
        id, title, short_desc, full_desc, creator_id, status_id,
        due_date, completed_at, deleted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `);
    for (const task of TASKS) {
      await insertTask.run(
        task.id,
        task.title,
        task.short_desc,
        task.full_desc,
        task.creator_id,
        task.status_id,
        task.due_date,
        task.completed_at,
        task.deleted_at,
        task.created_at,
        task.created_at
      );
    }

    const insertAssignment = tx.prepare(`
      INSERT INTO task_assignments (
        task_id, employee_id, assigned_by, priority_id,
        assignment_status, rejection_reason, assigned_at, responded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (task_id, employee_id) DO NOTHING
    `);
    for (const assignment of TASK_ASSIGNMENTS) {
      const respondedAt = assignment.assignment_status === 'pending' ? null : assignment.assigned_at;
      await insertAssignment.run(
        assignment.task_id,
        assignment.employee_id,
        assignment.assigned_by,
        assignment.priority_id,
        assignment.assignment_status,
        assignment.rejection_reason,
        assignment.assigned_at,
        respondedAt
      );
    }

    const insertBug = tx.prepare(`
      INSERT INTO bug_reports (
        id, organization_id, application_id, custom_url, reporter_user_id,
        guest_email, guest_name, is_anonymous, title, description, attachment_url,
        severity, status, rejection_reason, tracking_code, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `);
    for (const bug of BUG_REPORTS) {
      await insertBug.run(
        bug.id,
        bug.organization_id,
        bug.application_id,
        bug.custom_url,
        bug.reporter_user_id,
        bug.guest_email,
        bug.guest_name,
        bug.is_anonymous,
        bug.title,
        bug.description,
        bug.attachment_url,
        bug.severity,
        bug.status,
        bug.rejection_reason,
        bug.tracking_code,
        bug.created_at,
        bug.updated_at
      );
    }

    const insertComment = tx.prepare(`
      INSERT INTO bug_comments (
        id, bug_report_id, user_id, author_name, is_staff, content, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO NOTHING
    `);
    for (const comment of BUG_COMMENTS) {
      await insertComment.run(
        comment.id,
        comment.bug_report_id,
        comment.user_id,
        comment.author_name,
        comment.is_staff,
        comment.content,
        comment.created_at
      );
    }

    const serialTables = [
      'organizations',
      'positions',
      'users',
      'applications',
      'invitation_codes',
      'tasks',
      'bug_reports',
      'bug_comments',
    ];
    for (const table of serialTables) {
      try {
        await tx.exec(
          `SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE((SELECT MAX(id) FROM ${table}), 1))`
        );
      } catch {
        // Ignore sequence set errors if not serial
      }
    }

    return {
      skipped: false,
      counts: {
        roles: ROLES.length,
        positions: POSITIONS.length,
        departments: DEPARTMENTS.length,
        task_statuses: TASK_STATUSES.length,
        priorities: PRIORITIES.length,
        users: USERS.length,
        tasks: TASKS.length,
        task_assignments: TASK_ASSIGNMENTS.length,
        organizations: ORGANIZATIONS.length,
        applications: APPLICATIONS.length,
        invitation_codes: INVITATION_CODES.length,
        bug_reports: BUG_REPORTS.length,
        bug_comments: BUG_COMMENTS.length,
      },
    };
  });
}

const isCli =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const force = process.argv.includes('--force');
  try {
    const db = getDb();
    await runMigrations();
    const result = await seedDatabase(db, { force });
    if (result.skipped) {
      console.log('Database already seeded (use --force to re-seed).');
    } else {
      console.log('Database seeded successfully:', result.counts);
    }
  } finally {
    await closeDb();
  }
}

