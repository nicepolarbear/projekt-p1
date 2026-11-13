import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import { hashPassword } from '../utils/crypto.js';
import { closeDb, getDb } from './connection.js';
import { runMigrations } from './migrate.js';

const ROLES = [
  { id: 1, name: 'admin', description: 'Administrator systemu' },
  { id: 2, name: 'dyrektor', description: 'Dyrektor / Zarząd firmy' },
  { id: 3, name: 'kierownik', description: 'Kierownik / Project Manager' },
  { id: 4, name: 'pracownik', description: 'Pracownik / Specjalista' },
];

const POSITIONS = [
  { id: 1, name: 'Dyrektor', description: 'Zarząd firmy', priority: 1, is_delegatable: 1 },
  { id: 2, name: 'Project Manager', description: 'Zarządzanie projektami', priority: 2, is_delegatable: 1 },
  { id: 3, name: 'Senior Developer', description: 'Doświadczony programista', priority: 3, is_delegatable: 1 },
  { id: 4, name: 'Junior Developer', description: 'Młodszy programista', priority: 4, is_delegatable: 1 },
  { id: 5, name: 'Administrator Systemu', description: 'Administracja i bezpieczeństwo systemu', priority: 5, is_delegatable: 0 },
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
    avatar_color: '#a855f7',
    bio: 'Administrator Systemu odpowiedzialny za dostępność, konta i audyt bezpieczeństwa.',
    phone: '+48 600 100 006',
    created_at: '2024-01-05T08:00:00Z',
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
  const existing = db.prepare('SELECT COUNT(*) AS cnt FROM roles').get();
  if (existing && existing.cnt > 0 && !force) {
    return { skipped: true };
  }

  const userPasswordHashes = await Promise.all(
    USERS.map(() => hashPassword(env.SEED_DEFAULT_PASSWORD))
  );

  db.exec('BEGIN IMMEDIATE');
  try {
    if (force) {
      db.exec(`
        DELETE FROM audit_logs;
        DELETE FROM task_assignments;
        DELETE FROM tasks;
        DELETE FROM sessions;
        DELETE FROM users;
        DELETE FROM priorities;
        DELETE FROM task_statuses;
        DELETE FROM departments;
        DELETE FROM positions;
        DELETE FROM roles;
      `);
    }

    const insertRole = db.prepare(
      'INSERT INTO roles (id, name, description) VALUES (?, ?, ?)'
    );
    for (const role of ROLES) {
      insertRole.run(role.id, role.name, role.description);
    }

    const insertPosition = db.prepare(
      'INSERT INTO positions (id, name, description, priority, is_delegatable) VALUES (?, ?, ?, ?, ?)'
    );
    for (const pos of POSITIONS) {
      insertPosition.run(pos.id, pos.name, pos.description, pos.priority, pos.is_delegatable);
    }

    const insertDepartment = db.prepare(
      'INSERT INTO departments (id, code, name, description) VALUES (?, ?, ?, ?)'
    );
    for (const dept of DEPARTMENTS) {
      insertDepartment.run(dept.id, dept.code, dept.name, dept.description);
    }

    const insertStatus = db.prepare(
      'INSERT INTO task_statuses (id, name) VALUES (?, ?)'
    );
    for (const status of TASK_STATUSES) {
      insertStatus.run(status.id, status.name);
    }

    const insertPriority = db.prepare(
      'INSERT INTO priorities (id, name, level) VALUES (?, ?, ?)'
    );
    for (const prio of PRIORITIES) {
      insertPriority.run(prio.id, prio.name, prio.level);
    }

    const insertUser = db.prepare(`
      INSERT INTO users (
        id, first_name, last_name, email, password_hash,
        role_id, position_id, department_id, avatar_color,
        bio, phone, preferences_json, token_version, is_active,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', 1, 1, ?, ?)
    `);
    USERS.forEach((user, idx) => {
      insertUser.run(
        user.id,
        user.first_name,
        user.last_name,
        user.email,
        userPasswordHashes[idx],
        user.role_id,
        user.position_id,
        user.department_id,
        user.avatar_color,
        user.bio,
        user.phone,
        user.created_at,
        user.created_at
      );
    });

    const insertTask = db.prepare(`
      INSERT INTO tasks (
        id, title, short_desc, full_desc, creator_id, status_id,
        due_date, completed_at, deleted_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const task of TASKS) {
      insertTask.run(
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

    const insertAssignment = db.prepare(`
      INSERT INTO task_assignments (
        task_id, employee_id, assigned_by, priority_id,
        assignment_status, rejection_reason, assigned_at, responded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    for (const assignment of TASK_ASSIGNMENTS) {
      const respondedAt = assignment.assignment_status === 'pending' ? null : assignment.assigned_at;
      insertAssignment.run(
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

    db.exec('COMMIT');
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
      },
    };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // Ignore rollback errors
    }
    throw err;
  }
}

const isCli =
  Boolean(process.argv[1]) &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isCli) {
  const force = process.argv.includes('--force');
  try {
    const db = getDb();
    runMigrations(db);
    const result = await seedDatabase(db, { force });
    if (result.skipped) {
      console.log('Database already seeded (use --force to re-seed).');
    } else {
      console.log('Database seeded successfully:', result.counts);
    }
  } finally {
    closeDb();
  }
}
