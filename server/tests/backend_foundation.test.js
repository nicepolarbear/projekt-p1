import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, test } from 'node:test';

const tempDbPath = path.join(
  os.tmpdir(),
  `taskflow-foundation-test-${process.pid}-${Date.now()}.db`
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
  await runMigrations(db);
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
  await closeDb();

  for (const suffix of ['', '-wal', '-shm']) {
    const target = `${tempDbPath}${suffix}`;
    if (fs.existsSync(target)) {
      fs.unlinkSync(target);
    }
  }
});

describe('Foundation: Positions Permissions Matrix', () => {
  test('GET /api/positions returns all positions with 14 permission flags', async () => {
    const { client } = await loginAs('admin@firma.pl');
    const res = await client.get('/api/positions');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.positions));
    assert.ok(res.body.positions.length >= 5);

    const adminPos = res.body.positions.find((p) => p.name === 'Administrator Systemu');
    assert.ok(adminPos);
    assert.equal(adminPos.is_admin, true);
    assert.equal(adminPos.can_manage_permissions, true);
    assert.equal(adminPos.can_create_tasks, true);
  });

  test('POST, PATCH, and DELETE /api/positions allows managing custom positions with RBAC', async () => {
    const { client: devClient } = await loginAs('piotr.nowak@firma.pl');
    const forbiddenRes = await devClient.post('/api/positions', {
      name: 'QA Lead',
      priority: 3,
    });
    assert.equal(forbiddenRes.status, 403);

    const { client: adminClient } = await loginAs('admin@firma.pl');
    const createRes = await adminClient.post('/api/positions', {
      name: 'QA Engineer',
      description: 'Specjalista ds. jakości oprogramowania',
      priority: 3,
      is_delegatable: true,
      can_triage_bugs: true,
      can_create_tasks: true,
      can_assign_tasks: false,
    });
    assert.equal(createRes.status, 201);
    assert.equal(createRes.body.position.name, 'QA Engineer');
    assert.equal(createRes.body.position.can_triage_bugs, true);
    const newPosId = createRes.body.position.id;

    // PATCH
    const patchRes = await adminClient.patch(`/api/positions/${newPosId}`, {
      description: 'Zaktualizowany opis QA',
      can_convert_bugs_to_tasks: true,
    });
    assert.equal(patchRes.status, 200);
    assert.equal(patchRes.body.position.description, 'Zaktualizowany opis QA');
    assert.equal(patchRes.body.position.can_convert_bugs_to_tasks, true);

    // Cannot delete system position (id 1)
    const deleteSystemRes = await adminClient.delete('/api/positions/1');
    assert.equal(deleteSystemRes.status, 400);

    // DELETE custom position
    const deleteRes = await adminClient.delete(`/api/positions/${newPosId}`);
    assert.equal(deleteRes.status, 200);
    assert.equal(deleteRes.body.success, true);
  });
});

describe('Foundation: Onboarding & Multi-Tenancy', () => {
  test('POST /api/onboarding/check-slug checks slug availability', async () => {
    const client = new ApiClient(baseUrl);
    const takenRes = await client.post('/api/onboarding/check-slug', {
      slug: 'taskflow-polska',
    });
    assert.equal(takenRes.status, 200);
    assert.equal(takenRes.body.available, false);

    const availableRes = await client.post('/api/onboarding/check-slug', {
      slug: 'nowa-unikalna-firma-2026',
    });
    assert.equal(availableRes.status, 200);
    assert.equal(availableRes.body.available, true);
  });

  test('POST /api/onboarding/register-individual registers an individual reporter and sets cookie', async () => {
    const client = new ApiClient(baseUrl);
    const regRes = await client.post('/api/onboarding/register-individual', {
      first_name: 'Zofia',
      last_name: 'Zgłaszająca',
      email: 'zofia@tester.pl',
      password: 'ReporterPass2026!',
    });
    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.user.account_type, 'individual_reporter');
    assert.equal(regRes.body.user.organization_id, null);
    assert.ok(client.cookies.has('taskflow_sid'));

    const meRes = await client.get('/api/auth/me');
    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.user.email, 'zofia@tester.pl');
    assert.equal(meRes.body.user.account_type, 'individual_reporter');
  });

  test('POST /api/onboarding/create-organization creates organization, admin user, and app', async () => {
    const client = new ApiClient(baseUrl);
    const orgRes = await client.post('/api/onboarding/create-organization', {
      first_name: 'Adam',
      last_name: 'Biznesowy',
      email: 'adam@acme-corp.pl',
      password: 'SuperOrgAdmin2026!',
      org_name: 'Acme Corporation Sp. z o.o.',
      org_slug: 'acme-corp',
      industry: 'FinTech',
      size: '50-200',
    });
    assert.equal(orgRes.status, 201);
    assert.equal(orgRes.body.user.account_type, 'business_user');
    assert.ok(orgRes.body.user.organization_id > 1);
    assert.equal(orgRes.body.organization.slug, 'acme-corp');
    assert.ok(client.cookies.has('taskflow_sid'));
  });

  test('Join flow: verify-join-code, join-with-code, list requests, and approve', async () => {
    const anon = new ApiClient(baseUrl);

    // Verify code
    const verifyRes = await anon.post('/api/onboarding/verify-join-code', {
      code: 'TF-DEMO-2026',
    });
    assert.equal(verifyRes.status, 200);
    assert.equal(verifyRes.body.valid, true);
    assert.equal(verifyRes.body.organization.name, 'TaskFlow Polska Sp. z o.o.');

    // Join with code
    const joinRes = await anon.post('/api/onboarding/join-with-code', {
      code: 'TF-DEMO-2026',
      first_name: 'Michał',
      last_name: 'Kandydat',
      email: 'michal.kandydat@firma.pl',
      password: 'PasswordMichal2026!',
    });
    assert.equal(joinRes.status, 201);
    assert.equal(joinRes.body.pending, true);

    // Admin lists join requests
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const listReqsRes = await adminClient.get('/api/organizations/join-requests');
    assert.equal(listReqsRes.status, 200);
    const pendingReq = listReqsRes.body.requests.find(
      (r) => r.email === 'michal.kandydat@firma.pl'
    );
    assert.ok(pendingReq);
    assert.equal(pendingReq.status, 'pending');

    // Admin approves join request
    const approveRes = await adminClient.post(
      `/api/organizations/join-requests/${pendingReq.id}/approve`,
      { assigned_position_id: 4 }
    );
    assert.equal(approveRes.status, 200);
    assert.equal(approveRes.body.status, 'approved');

    // Approved user can now log in
    const userClient = new ApiClient(baseUrl);
    const loginRes = await userClient.post('/api/auth/login', {
      email: 'michal.kandydat@firma.pl',
      password: 'PasswordMichal2026!',
    });
    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.user.email, 'michal.kandydat@firma.pl');
    assert.equal(loginRes.body.user.organization_id, 1);
  });
});

describe('Foundation: Applications & Bug Tracking System', () => {
  test('GET /api/applications/public returns registered applications', async () => {
    const client = new ApiClient(baseUrl);
    const res = await client.get('/api/applications/public');
    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.applications));
    assert.ok(res.body.applications.length >= 2);
  });

  test('Public / guest bug submit, tracking, and comments', async () => {
    const client = new ApiClient(baseUrl);
    const submitRes = await client.post('/api/bugs/submit', {
      application_id: 1,
      title: 'Znikający kursor na formularzu',
      description: 'Na polu tekstowym kursor znika po wpisaniu 10 znaków.',
      severity: 'normal',
      guest_name: 'Tester Publiczny',
      guest_email: 'tester.publiczny@test.com',
    });
    assert.equal(submitRes.status, 201);
    assert.equal(submitRes.body.success, true);
    assert.ok(submitRes.body.tracking_code.startsWith('BUG-'));

    const code = submitRes.body.tracking_code;

    // Track bug
    const trackRes = await client.get(`/api/bugs/track/${code}`);
    assert.equal(trackRes.status, 200);
    assert.equal(trackRes.body.bug.title, 'Znikający kursor na formularzu');
    assert.equal(trackRes.body.bug.status, 'new');

    // Add public comment
    const commentRes = await client.post(`/api/bugs/track/${code}/comments`, {
      content: 'Dodatkowa informacja: problem występuje tylko na Safari.',
      author_name: 'Tester Publiczny',
    });
    assert.equal(commentRes.status, 201);
    assert.equal(commentRes.body.success, true);

    // Verify comment appeared
    const reTrack = await client.get(`/api/bugs/track/${code}`);
    assert.equal(reTrack.body.comments.length, 1);
    assert.equal(reTrack.body.comments[0].content, 'Dodatkowa informacja: problem występuje tylko na Safari.');
  });

  test('Organization bug triage: list, status update, convert to task, and staff comment', async () => {
    const { client: pmClient } = await loginAs('marek.wisniewski@firma.pl');

    // List org bugs
    const listRes = await pmClient.get('/api/organization/bugs');
    assert.equal(listRes.status, 200);
    assert.ok(Array.isArray(listRes.body.bugs));
    assert.ok(listRes.body.bugs.length >= 2);

    const bug1 = listRes.body.bugs.find((b) => b.tracking_code === 'BUG-1001');
    assert.ok(bug1);

    // Update status
    const statusRes = await pmClient.patch(`/api/organization/bugs/${bug1.id}/status`, {
      status: 'in_analysis',
    });
    assert.equal(statusRes.status, 200);
    assert.equal(statusRes.body.bug.status, 'in_analysis');

    // Convert to task
    const convertRes = await pmClient.post(`/api/organization/bugs/${bug1.id}/convert-to-task`, {
      employee_id: 3, // Piotr Nowak (Senior Dev)
      priority_id: 3,
    });
    assert.equal(convertRes.status, 201);
    assert.ok(convertRes.body.task.id);
    assert.equal(convertRes.body.bug.status, 'in_progress');

    // Staff comment
    const commentRes = await pmClient.post(`/api/organization/bugs/${bug1.id}/comments`, {
      content: 'Przypisano zadanie do zespołu backendowego.',
    });
    assert.equal(commentRes.status, 201);
    assert.equal(commentRes.body.comment.is_staff, true);
  });
});
