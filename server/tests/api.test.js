import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

const tempDbPath = path.join(
  os.tmpdir(),
  `taskflow-test-${process.pid}-${Date.now()}.db`
);

process.env.NODE_ENV = 'test';
process.env.DB_PATH = tempDbPath;
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || 'taskflow-integration-test-secret-32chars!';
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'TaskFlow2026!';

const { createApp } = await import('../app.js');
const { closeDb, getDb } = await import('../db/connection.js');
const { runMigrations } = await import('../db/migrate.js');
const { seedDatabase } = await import('../db/seed.js');

class ApiClient {
  constructor(baseUrl) {
    this.baseUrl = baseUrl;
    this.cookies = new Map();
  }

  updateCookies(headers) {
    const setCookies =
      typeof headers.getSetCookie === 'function'
        ? headers.getSetCookie()
        : headers.get('set-cookie')
          ? [headers.get('set-cookie')]
          : [];

    for (const raw of setCookies) {
      const firstPart = raw.split(';')[0];
      const eqIndex = firstPart.indexOf('=');
      if (eqIndex <= 0) continue;
      const name = firstPart.slice(0, eqIndex).trim();
      const value = firstPart.slice(eqIndex + 1).trim();
      if (
        value === '' ||
        /max-age=0/i.test(raw) ||
        /expires=thu, 01 jan 1970/i.test(raw)
      ) {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  getCookieHeader() {
    if (this.cookies.size === 0) return null;
    return Array.from(this.cookies.entries())
      .map(([k, v]) => `${k}=${v}`)
      .join('; ');
  }

  async request(method, urlPath, body, extraHeaders = {}) {
    const headers = { ...extraHeaders };
    const cookieHeader = this.getCookieHeader();
    if (cookieHeader && !headers.cookie) {
      headers.cookie = cookieHeader;
    }

    let payload;
    if (body !== undefined) {
      headers['content-type'] = 'application/json';
      payload = JSON.stringify(body);
    }

    const res = await fetch(`${this.baseUrl}${urlPath}`, {
      method,
      headers,
      body: payload,
    });
    this.updateCookies(res.headers);

    const text = await res.text();
    let json = null;
    if (text) {
      try {
        json = JSON.parse(text);
      } catch {
        json = null;
      }
    }

    return { status: res.status, headers: res.headers, body: json, text };
  }

  get(urlPath, extraHeaders) {
    return this.request('GET', urlPath, undefined, extraHeaders);
  }

  post(urlPath, body, extraHeaders) {
    return this.request('POST', urlPath, body, extraHeaders);
  }

  patch(urlPath, body, extraHeaders) {
    return this.request('PATCH', urlPath, body, extraHeaders);
  }

  delete(urlPath, extraHeaders) {
    return this.request('DELETE', urlPath, undefined, extraHeaders);
  }
}

let server;
let baseUrl;

async function loginAs(email, password = DEFAULT_PASSWORD) {
  const client = new ApiClient(baseUrl);
  const res = await client.post('/api/auth/login', { email, password });
  assert.equal(res.status, 200, `Expected login success for ${email}, got ${res.status}`);
  return { client, user: res.body.user };
}

before(async () => {
  const db = getDb();
  runMigrations(db);
  await seedDatabase(db, { force: true });

  const app = createApp();
  await new Promise((resolve) => {
    server = app.listen(0, '127.0.0.1', () => {
      const address = server.address();
      baseUrl = `http://127.0.0.1:${address.port}`;
      resolve();
    });
  });
});

after(async () => {
  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }
  closeDb();

  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${tempDbPath}${suffix}`;
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  }
});

describe('1. Health & Meta endpoints', () => {
  test('GET /api/health returns 200 and expected payload', async () => {
    const client = new ApiClient(baseUrl);
    const res = await client.get('/api/health');
    assert.equal(res.status, 200);
    assert.equal(res.body.status, 'ok');
    assert.equal(res.body.env, 'test');
    assert.equal(typeof res.body.timestamp, 'string');
    assert.ok(Number.isFinite(Date.parse(res.body.timestamp)));
  });

  test('GET /api/meta requires authentication and returns dictionaries when authenticated', async () => {
    const anon = new ApiClient(baseUrl);
    const unauth = await anon.get('/api/meta');
    assert.equal(unauth.status, 401);

    const { client } = await loginAs('piotr.nowak@firma.pl');
    const authRes = await client.get('/api/meta');
    assert.equal(authRes.status, 200);
    assert.ok(Array.isArray(authRes.body.roles));
    assert.ok(Array.isArray(authRes.body.positions));
    assert.ok(Array.isArray(authRes.body.departments));
    assert.ok(Array.isArray(authRes.body.taskStatuses));
    assert.ok(Array.isArray(authRes.body.priorities));
    assert.ok(Array.isArray(authRes.body.directoryUsers));
  });
});

describe('2. Authentication & Sessions', () => {
  test('Login succeeds for all 4 roles with HttpOnly cookie and /api/auth/me works', async () => {
    const accounts = [
      { email: 'admin@firma.pl', expectedRole: 'admin' },
      { email: 'anna.kowalska@firma.pl', expectedRole: 'dyrektor' },
      { email: 'marek.wisniewski@firma.pl', expectedRole: 'kierownik' },
      { email: 'piotr.nowak@firma.pl', expectedRole: 'pracownik' },
    ];

    for (const acc of accounts) {
      const client = new ApiClient(baseUrl);
      const loginRes = await client.post('/api/auth/login', {
        email: acc.email,
        password: DEFAULT_PASSWORD,
      });
      assert.equal(loginRes.status, 200);
      assert.equal(loginRes.body.user.email, acc.email);
      assert.equal(loginRes.body.user.role, acc.expectedRole);
      assert.equal(loginRes.body.user.password_hash, undefined);
      assert.ok(client.cookies.has('taskflow_sid'), 'Should set taskflow_sid cookie');

      const meRes = await client.get('/api/auth/me');
      assert.equal(meRes.status, 200);
      assert.equal(meRes.body.user.email, acc.email);
      assert.equal(meRes.body.user.role, acc.expectedRole);
    }
  });

  test('GET /api/auth/me returns 401 when unauthenticated', async () => {
    const client = new ApiClient(baseUrl);
    const res = await client.get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  test('Failed login returns 401 for wrong password or unknown email', async () => {
    const client = new ApiClient(baseUrl);
    const wrongPass = await client.post('/api/auth/login', {
      email: 'piotr.nowak@firma.pl',
      password: 'WrongPassword123!',
    });
    assert.equal(wrongPass.status, 401);
    assert.equal(wrongPass.body.error.code, 'INVALID_CREDENTIALS');

    const unknownUser = await client.post('/api/auth/login', {
      email: 'nieistnieje@firma.pl',
      password: DEFAULT_PASSWORD,
    });
    assert.equal(unknownUser.status, 401);
    assert.equal(unknownUser.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('Inactive user cannot log in (401)', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const createRes = await adminClient.post('/api/admin/users', {
      first_name: 'Nieaktywny',
      last_name: 'Testowy',
      email: 'inactive.test@firma.pl',
      password: DEFAULT_PASSWORD,
      role_id: 4,
      position_id: 4,
      department_id: 3,
      is_active: 0,
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.user.is_active, 0);

    const anon = new ApiClient(baseUrl);
    const loginRes = await anon.post('/api/auth/login', {
      email: 'inactive.test@firma.pl',
      password: DEFAULT_PASSWORD,
    });
    assert.equal(loginRes.status, 401);
    assert.equal(loginRes.body.error.code, 'INVALID_CREDENTIALS');
  });

  test('Logout revokes session on server and subsequent /api/auth/me returns 401', async () => {
    const { client } = await loginAs('piotr.nowak@firma.pl');
    const savedCookieHeader = client.getCookieHeader();
    assert.ok(savedCookieHeader);

    const logoutRes = await client.post('/api/auth/logout');
    assert.equal(logoutRes.status, 200);
    assert.equal(logoutRes.body.ok, true);

    const meAfterLogout = await client.get('/api/auth/me');
    assert.equal(meAfterLogout.status, 401);

    // Even if an attacker replays the old cookie value, server must reject it
    const replayClient = new ApiClient(baseUrl);
    const replayRes = await replayClient.get('/api/auth/me', {
      cookie: savedCookieHeader,
    });
    assert.equal(replayRes.status, 401);
  });
});

describe('3. Password Change', () => {
  test('Rejects wrong current password, updates password, revokes other sessions, allows login with new password', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const tempEmail = 'pwd.change.user@firma.pl';
    const initialPass = 'InitialPass123!';
    const updatedPass = 'UpdatedPass456!';

    const created = await adminClient.post('/api/admin/users', {
      first_name: 'Haslo',
      last_name: 'Tester',
      email: tempEmail,
      password: initialPass,
      role_id: 4,
      position_id: 4,
      department_id: 3,
    });
    assert.equal(created.status, 201);

    const { client: sessionA } = await loginAs(tempEmail, initialPass);
    const { client: sessionB } = await loginAs(tempEmail, initialPass);

    // Confirm both sessions work before password change
    assert.equal((await sessionA.get('/api/auth/me')).status, 200);
    assert.equal((await sessionB.get('/api/auth/me')).status, 200);

    // Wrong current password -> 400
    const wrongCurrent = await sessionA.post('/api/auth/change-password', {
      current_password: 'TotallyWrongPassword!',
      new_password: updatedPass,
    });
    assert.equal(wrongCurrent.status, 400);
    assert.equal(wrongCurrent.body.error.code, 'INVALID_PASSWORD');

    // Same password -> 400
    const samePass = await sessionA.post('/api/auth/change-password', {
      current_password: initialPass,
      new_password: initialPass,
    });
    assert.equal(samePass.status, 400);

    // Valid password change -> 200
    const changeRes = await sessionA.post('/api/auth/change-password', {
      current_password: initialPass,
      new_password: updatedPass,
    });
    assert.equal(changeRes.status, 200);
    assert.equal(changeRes.body.ok, true);

    // Current session (with rotated cookie) remains authenticated
    const meA = await sessionA.get('/api/auth/me');
    assert.equal(meA.status, 200);

    // Other active session (sessionB) must be revoked -> 401
    const meB = await sessionB.get('/api/auth/me');
    assert.equal(meB.status, 401);

    // Old password no longer works
    const oldLogin = await new ApiClient(baseUrl).post('/api/auth/login', {
      email: tempEmail,
      password: initialPass,
    });
    assert.equal(oldLogin.status, 401);

    // New password works
    const { user: loggedInUser } = await loginAs(tempEmail, updatedPass);
    assert.equal(loggedInUser.email, tempEmail);
  });
});

describe('4. Profile & Preferences', () => {
  test('GET /api/profile, PATCH /api/profile updates fields and blocks privilege escalation, PATCH preferences & GET stats', async () => {
    const { client, user: initialUser } = await loginAs('tomasz.lewandowski@firma.pl');

    const getRes = await client.get('/api/profile');
    assert.equal(getRes.status, 200);
    assert.equal(getRes.body.user.id, initialUser.id);

    // Update allowed profile fields
    const patchRes = await client.patch('/api/profile', {
      first_name: 'Tomasz-Updated',
      last_name: 'Lewandowski-Updated',
      phone: '+48 700 800 900',
      bio: 'Zaktualizowany opis profilu testowego',
      avatar_color: '#123456',
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.user.first_name, 'Tomasz-Updated');
    assert.equal(patchRes.body.user.last_name, 'Lewandowski-Updated');
    assert.equal(patchRes.body.user.phone, '+48 700 800 900');
    assert.equal(patchRes.body.user.bio, 'Zaktualizowany opis profilu testowego');
    assert.equal(patchRes.body.user.avatar_color, '#123456');

    // Attempt privilege escalation via role_id, position_id, is_active
    const escalationRole = await client.patch('/api/profile', { role_id: 1 });
    assert.equal(escalationRole.status, 400);

    const escalationPos = await client.patch('/api/profile', { position_id: 1 });
    assert.equal(escalationPos.status, 400);

    const escalationActive = await client.patch('/api/profile', { is_active: 0 });
    assert.equal(escalationActive.status, 400);

    // Verify user role, position, and active state did not change
    const verifyRes = await client.get('/api/profile');
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.user.role_id, initialUser.role_id);
    assert.equal(verifyRes.body.user.position_id, initialUser.position_id);
    assert.equal(verifyRes.body.user.is_active, 1);

    // Update preferences
    const prefRes1 = await client.patch('/api/profile/preferences', {
      compact_cards: true,
      auto_open_todo: false,
    });
    assert.equal(prefRes1.status, 200);
    assert.equal(prefRes1.body.preferences.compact_cards, true);
    assert.equal(prefRes1.body.preferences.auto_open_todo, false);

    // Preferences merge on subsequent patch
    const prefRes2 = await client.patch('/api/profile/preferences', {
      confirm_delete: true,
    });
    assert.equal(prefRes2.status, 200);
    assert.equal(prefRes2.body.preferences.compact_cards, true);
    assert.equal(prefRes2.body.preferences.confirm_delete, true);

    // Profile stats
    const statsRes = await client.get('/api/profile/stats');
    assert.equal(statsRes.status, 200);
    assert.equal(typeof statsRes.body.created_count, 'number');
    assert.equal(typeof statsRes.body.assigned_count, 'number');
    assert.equal(typeof statsRes.body.completed_count, 'number');
    assert.equal(typeof statsRes.body.in_progress_count, 'number');
    assert.equal(typeof statsRes.body.pending_count, 'number');
    assert.equal(typeof statsRes.body.overdue_count, 'number');
    assert.equal(typeof statsRes.body.completion_rate_pct, 'number');
  });
});

describe('5. Task RBAC & Hierarchy', () => {
  test('GET /api/tasks?scope=all is 200 for admin/dyrektor and 403 for kierownik/pracownik', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const { client: dyrektorClient } = await loginAs('anna.kowalska@firma.pl');
    const { client: kierownikClient } = await loginAs('marek.wisniewski@firma.pl');
    const { client: pracownikClient } = await loginAs('piotr.nowak@firma.pl');

    const adminAll = await adminClient.get('/api/tasks?scope=all');
    assert.equal(adminAll.status, 200);
    assert.ok(Array.isArray(adminAll.body.tasks));

    const dyrektorAll = await dyrektorClient.get('/api/tasks?scope=all');
    assert.equal(dyrektorAll.status, 200);
    assert.ok(Array.isArray(dyrektorAll.body.tasks));

    const kierownikAll = await kierownikClient.get('/api/tasks?scope=all');
    assert.equal(kierownikAll.status, 403);

    const pracownikAll = await pracownikClient.get('/api/tasks?scope=all');
    assert.equal(pracownikAll.status, 403);
  });

  test('POST /api/tasks supports self, enforces delegation/sharing hierarchy, and rejects non-delegatable targets', async () => {
    const { client: marekClient, user: marek } = await loginAs('marek.wisniewski@firma.pl'); // id 2, pos priority 2
    const { client: piotrClient, user: piotr } = await loginAs('piotr.nowak@firma.pl'); // id 3, pos priority 3
    const { client: katarzynaClient, user: katarzyna } = await loginAs('katarzyna.zajac@firma.pl'); // id 4, pos priority 4
    const { user: tomasz } = await loginAs('tomasz.lewandowski@firma.pl'); // id 5, pos priority 4
    const { user: admin } = await loginAs('admin@firma.pl'); // id 6, pos priority 5, is_delegatable 0

    // 1. Self task by Piotr
    const selfRes = await piotrClient.post('/api/tasks', {
      title: 'Zadanie własne Piotra',
      short_desc: 'Krótki opis',
      assignment_mode: 'self',
      priority_id: 2,
    });
    assert.equal(selfRes.status, 201);
    assert.equal(selfRes.body.task.creator_id, piotr.id);
    assert.equal(selfRes.body.assignments.length, 1);
    assert.equal(selfRes.body.assignments[0].employee_id, piotr.id);
    assert.equal(selfRes.body.assignments[0].assignment_status, 'accepted');

    // 2. Assign: Marek (priority 2) -> Piotr (priority 3, delegatable=1) succeeds with pending
    const assignMarekToPiotr = await marekClient.post('/api/tasks', {
      title: 'Delegacja Marek -> Piotr',
      assignment_mode: 'assign',
      assignee_id: piotr.id,
      priority_id: 3,
    });
    assert.equal(assignMarekToPiotr.status, 201);
    assert.equal(assignMarekToPiotr.body.assignments.length, 1);
    assert.equal(assignMarekToPiotr.body.assignments[0].employee_id, piotr.id);
    assert.equal(assignMarekToPiotr.body.assignments[0].assignment_status, 'pending');

    // 3. Assign: Katarzyna (priority 4) -> Marek (priority 2) fails with 403
    const assignUpward = await katarzynaClient.post('/api/tasks', {
      title: 'Próba delegacji w górę',
      assignment_mode: 'assign',
      assignee_id: marek.id,
      priority_id: 2,
    });
    assert.equal(assignUpward.status, 403);

    // 4. Assign: Marek (priority 2) -> Admin (priority 5, is_delegatable=0) fails with 403
    const assignNonDelegatable = await marekClient.post('/api/tasks', {
      title: 'Próba delegacji do Admina',
      assignment_mode: 'assign',
      assignee_id: admin.id,
      priority_id: 2,
    });
    assert.equal(assignNonDelegatable.status, 403);

    // 5. Share: Katarzyna (priority 4) -> Tomasz (priority 4) succeeds with accepted for both
    const shareRes = await katarzynaClient.post('/api/tasks', {
      title: 'Współdzielone Katarzyna -> Tomasz',
      assignment_mode: 'share',
      assignee_id: tomasz.id,
      priority_id: 2,
    });
    assert.equal(shareRes.status, 201);
    assert.equal(shareRes.body.assignments.length, 2);
    const byEmp = new Map(shareRes.body.assignments.map((a) => [a.employee_id, a]));
    assert.equal(byEmp.get(katarzyna.id).assignment_status, 'accepted');
    assert.equal(byEmp.get(tomasz.id).assignment_status, 'accepted');
  });

  test('PATCH /api/tasks/:id/status, assignment response, and cancel status=4 RBAC', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const { client: dyrektorClient } = await loginAs('anna.kowalska@firma.pl');
    const { client: marekClient } = await loginAs('marek.wisniewski@firma.pl');
    const { client: piotrClient, user: piotr } = await loginAs('piotr.nowak@firma.pl');

    // Marek creates and assigns a task to Piotr (pending)
    const created = await marekClient.post('/api/tasks', {
      title: 'Zadanie status RBAC',
      assignment_mode: 'assign',
      assignee_id: piotr.id,
      priority_id: 3,
    });
    assert.equal(created.status, 201);
    const taskId = created.body.task.id;

    // Pending assignee cannot change task status -> 403
    const pendingStatusRes = await piotrClient.patch(`/api/tasks/${taskId}/status`, {
      status_id: 2,
    });
    assert.equal(pendingStatusRes.status, 403);

    // Piotr accepts assignment
    const acceptRes = await piotrClient.patch(`/api/tasks/${taskId}/assignments/respond`, {
      assignment_status: 'accepted',
    });
    assert.equal(acceptRes.status, 200);
    assert.equal(acceptRes.body.assignment.assignment_status, 'accepted');

    // Now Piotr can change status to 2 (W trakcie) -> 200
    const acceptedStatusRes = await piotrClient.patch(`/api/tasks/${taskId}/status`, {
      status_id: 2,
    });
    assert.equal(acceptedStatusRes.status, 200);
    assert.equal(acceptedStatusRes.body.task.status_id, 2);

    // Non-creator assignee (Piotr) cannot cancel task (status_id: 4) -> 403
    const piotrCancelRes = await piotrClient.patch(`/api/tasks/${taskId}/status`, {
      status_id: 4,
    });
    assert.equal(piotrCancelRes.status, 403);

    // Creator (Marek) can cancel (status_id: 4) -> 200
    const marekCancelRes = await marekClient.patch(`/api/tasks/${taskId}/status`, {
      status_id: 4,
    });
    assert.equal(marekCancelRes.status, 200);
    assert.equal(marekCancelRes.body.task.status_id, 4);

    // Dyrektor and Admin can also set status_id: 4 on any task -> 200
    const dyrektorReopen = await dyrektorClient.patch(`/api/tasks/${taskId}/status`, {
      status_id: 1,
    });
    assert.equal(dyrektorReopen.status, 200);
    const dyrektorCancel = await dyrektorClient.patch(`/api/tasks/${taskId}/status`, {
      status_id: 4,
    });
    assert.equal(dyrektorCancel.status, 200);

    const adminCancel = await adminClient.patch(`/api/tasks/${taskId}/status`, {
      status_id: 4,
    });
    assert.equal(adminCancel.status, 200);
  });

  test('DELETE /api/tasks/:id & POST /api/tasks/:id/restore RBAC', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const { client: dyrektorClient } = await loginAs('anna.kowalska@firma.pl');
    const { client: marekClient } = await loginAs('marek.wisniewski@firma.pl');
    const { client: piotrClient, user: piotr } = await loginAs('piotr.nowak@firma.pl');

    const created = await marekClient.post('/api/tasks', {
      title: 'Zadanie do kosza i przywrócenia',
      assignment_mode: 'assign',
      assignee_id: piotr.id,
      priority_id: 2,
    });
    assert.equal(created.status, 201);
    const taskId = created.body.task.id;

    // Piotr accepts the assignment so he is an accepted assignee, but NOT creator
    assert.equal(
      (
        await piotrClient.patch(`/api/tasks/${taskId}/assignments/respond`, {
          assignment_status: 'accepted',
        })
      ).status,
      200
    );

    // Non-creator employee cannot delete -> 403
    const piotrDelete = await piotrClient.delete(`/api/tasks/${taskId}`);
    assert.equal(piotrDelete.status, 403);

    // Creator (Marek) can delete -> 200
    const marekDelete = await marekClient.delete(`/api/tasks/${taskId}`);
    assert.equal(marekDelete.status, 200);
    assert.equal(marekDelete.body.ok, true);
    assert.ok(marekDelete.body.task.deleted_at);

    // Non-creator employee cannot restore -> 403
    const piotrRestore = await piotrClient.post(`/api/tasks/${taskId}/restore`);
    assert.equal(piotrRestore.status, 403);

    // Creator (Marek) can restore -> 200
    const marekRestore = await marekClient.post(`/api/tasks/${taskId}/restore`);
    assert.equal(marekRestore.status, 200);
    assert.equal(marekRestore.body.task.deleted_at, null);

    // Dyrektor can delete & restore -> 200
    const dyrektorDelete = await dyrektorClient.delete(`/api/tasks/${taskId}`);
    assert.equal(dyrektorDelete.status, 200);
    const dyrektorRestore = await dyrektorClient.post(`/api/tasks/${taskId}/restore`);
    assert.equal(dyrektorRestore.status, 200);

    // Admin can delete & restore -> 200
    const adminDelete = await adminClient.delete(`/api/tasks/${taskId}`);
    assert.equal(adminDelete.status, 200);
    const adminRestore = await adminClient.post(`/api/tasks/${taskId}/restore`);
    assert.equal(adminRestore.status, 200);
  });
});

describe('6. Dashboard & Admin/Director RBAC', () => {
  test('Dashboard endpoints allow admin/dyrektor (200) and forbid kierownik/pracownik (403)', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const { client: dyrektorClient } = await loginAs('anna.kowalska@firma.pl');
    const { client: kierownikClient } = await loginAs('marek.wisniewski@firma.pl');
    const { client: pracownikClient } = await loginAs('piotr.nowak@firma.pl');

    const endpoints = [
      '/api/dashboard/overview',
      '/api/dashboard/tasks',
      '/api/dashboard/audit-logs',
    ];

    for (const ep of endpoints) {
      assert.equal((await adminClient.get(ep)).status, 200, `Admin should access ${ep}`);
      assert.equal((await dyrektorClient.get(ep)).status, 200, `Dyrektor should access ${ep}`);
      assert.equal((await kierownikClient.get(ep)).status, 403, `Kierownik forbidden on ${ep}`);
      assert.equal((await pracownikClient.get(ep)).status, 403, `Pracownik forbidden on ${ep}`);
    }
  });

  test('POST /api/admin/users allowed only for admin (201), forbidden for dyrektor/kierownik/pracownik (403)', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const { client: dyrektorClient } = await loginAs('anna.kowalska@firma.pl');
    const { client: kierownikClient } = await loginAs('marek.wisniewski@firma.pl');
    const { client: pracownikClient } = await loginAs('piotr.nowak@firma.pl');

    const payload = {
      first_name: 'Nowy',
      last_name: 'Pracownik',
      email: 'nowy.pracownik@firma.pl',
      password: DEFAULT_PASSWORD,
      role_id: 4,
      position_id: 4,
      department_id: 3,
    };

    assert.equal((await dyrektorClient.post('/api/admin/users', payload)).status, 403);
    assert.equal((await kierownikClient.post('/api/admin/users', payload)).status, 403);
    assert.equal((await pracownikClient.post('/api/admin/users', payload)).status, 403);

    const adminCreate = await adminClient.post('/api/admin/users', payload);
    assert.equal(adminCreate.status, 201);
    assert.equal(adminCreate.body.user.email, 'nowy.pracownik@firma.pl');
  });

  test('PATCH /api/admin/users/:id director restrictions, admin self-lockout protection, and immediate session invalidation', async () => {
    const { client: adminClient, user: adminUser } = await loginAs('admin@firma.pl');
    const { client: dyrektorClient } = await loginAs('anna.kowalska@firma.pl');

    // Create a fresh employee user for modification & deactivation tests
    const targetEmail = 'managed.employee@firma.pl';
    const created = await adminClient.post('/api/admin/users', {
      first_name: 'Zarządzany',
      last_name: 'Pracownik',
      email: targetEmail,
      password: DEFAULT_PASSWORD,
      role_id: 4,
      position_id: 4, // Junior Developer
      department_id: 3,
    });
    assert.equal(created.status, 201);
    const targetId = created.body.user.id;

    // Dyrektor can update position_id on pracownik -> 200
    const dirUpdatePos = await dyrektorClient.patch(`/api/admin/users/${targetId}`, {
      position_id: 3, // Senior Developer
    });
    assert.equal(dirUpdatePos.status, 200);
    assert.equal(dirUpdatePos.body.user.position_id, 3);

    // Dyrektor gets 403 trying to change role_id
    const dirChangeRole = await dyrektorClient.patch(`/api/admin/users/${targetId}`, {
      role_id: 3,
    });
    assert.equal(dirChangeRole.status, 403);

    // Dyrektor gets 403 trying to edit admin
    const dirEditAdmin = await dyrektorClient.patch(`/api/admin/users/${adminUser.id}`, {
      position_id: 3,
    });
    assert.equal(dirEditAdmin.status, 403);

    // Admin cannot self-deactivate (PATCH or DELETE) or self-demote -> 409
    const selfDeactivatePatch = await adminClient.patch(`/api/admin/users/${adminUser.id}`, {
      is_active: 0,
    });
    assert.equal(selfDeactivatePatch.status, 409);
    assert.equal(selfDeactivatePatch.body.error.code, 'SELF_LOCKOUT');

    const selfDeactivateDelete = await adminClient.delete(`/api/admin/users/${adminUser.id}`);
    assert.equal(selfDeactivateDelete.status, 409);
    assert.equal(selfDeactivateDelete.body.error.code, 'SELF_LOCKOUT');

    const selfDemote = await adminClient.patch(`/api/admin/users/${adminUser.id}`, {
      role_id: 4,
    });
    assert.equal(selfDemote.status, 409);
    assert.equal(selfDemote.body.error.code, 'SELF_LOCKOUT');

    // Log in as the managed employee
    const { client: targetClient } = await loginAs(targetEmail);
    assert.equal((await targetClient.get('/api/auth/me')).status, 200);

    // Deactivating the user immediately invalidates their active session
    const deactivateRes = await adminClient.patch(`/api/admin/users/${targetId}`, {
      is_active: 0,
    });
    assert.equal(deactivateRes.status, 200);
    assert.equal(deactivateRes.body.user.is_active, 0);

    const meAfterDeactivate = await targetClient.get('/api/auth/me');
    assert.equal(meAfterDeactivate.status, 401);

    // Subsequent login also fails
    const loginAfterDeactivate = await new ApiClient(baseUrl).post('/api/auth/login', {
      email: targetEmail,
      password: DEFAULT_PASSWORD,
    });
    assert.equal(loginAfterDeactivate.status, 401);
  });
});
