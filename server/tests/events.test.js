import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';

process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET =
  process.env.SESSION_SECRET || 'taskflow-integration-test-secret-32chars!';
const DEFAULT_PASSWORD = process.env.SEED_DEFAULT_PASSWORD || 'TaskFlow2026!';

const { createApp } = await import('../app.js');
const { getDb } = await import('../db/connection.js');

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
    const headers = new Headers(extraHeaders);
    const cookie = this.getCookieHeader();
    if (cookie) {
      headers.set('Cookie', cookie);
    }
    if (body !== undefined && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(`${this.baseUrl}${urlPath}`, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    this.updateCookies(res.headers);

    const text = await res.text();
    let json = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
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
});

describe('Live Events & Real-time Task Refreshing', () => {
  test('Auth protection on /api/events endpoints', async () => {
    const unauthed = new ApiClient(baseUrl);
    const resLatest = await unauthed.get('/api/events/latest-id');
    assert.equal(resLatest.status, 401);

    const resList = await unauthed.get('/api/events');
    assert.equal(resList.status, 401);
  });

  test('GET /api/events/latest-id returns current latest event ID', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const res = await adminClient.get('/api/events/latest-id');
    assert.equal(res.status, 200);
    assert.equal(res.body.ok, true);
    assert.equal(typeof res.body.latestId, 'number');
  });

  test('Creating task records TASK_CREATED live event for creator and assignees', async () => {
    const { client: adminClient } = await loginAs('admin@firma.pl');
    const { client: piotrClient } = await loginAs('piotr.nowak@firma.pl');
    const { client: tomaszClient } = await loginAs('tomasz.lewandowski@firma.pl');

    // Get current latest ID before action
    const { body: { latestId: startId } } = await adminClient.get('/api/events/latest-id');

    // Marek creates task assigned to Piotr (user ID 3)
    const { client: marekClient } = await loginAs('marek.wisniewski@firma.pl');
    const createRes = await marekClient.post('/api/tasks', {
      title: 'Zadanie testowe na żywo',
      short_desc: 'Opis testowy',
      full_desc: 'Pełny opis testowy',
      assignment_mode: 'assign',
      assignee_id: 3,
      priority_id: 2,
    });
    assert.equal(createRes.status, 201);
    const createdTask = createRes.body.task;

    // Check events for Marek (actor)
    const marekEventsRes = await marekClient.get(`/api/events?since_id=${startId}`);
    assert.equal(marekEventsRes.status, 200);
    const marekTaskCreated = marekEventsRes.body.events.find(
      (e) => e.event_type === 'TASK_CREATED' && e.entity_id === createdTask.id
    );
    assert.ok(marekTaskCreated, 'Marek should receive TASK_CREATED event');
    assert.equal(marekTaskCreated.is_actor, true);

    // Check events for Piotr (assignee)
    const piotrEventsRes = await piotrClient.get(`/api/events?since_id=${startId}`);
    assert.equal(piotrEventsRes.status, 200);
    const piotrTaskCreated = piotrEventsRes.body.events.find(
      (e) => e.event_type === 'TASK_CREATED' && e.entity_id === createdTask.id
    );
    assert.ok(piotrTaskCreated, 'Piotr should receive TASK_CREATED event');
    assert.equal(piotrTaskCreated.is_actor, false);

    // Check events for Tomasz (uninvolved employee)
    const tomaszEventsRes = await tomaszClient.get(`/api/events?since_id=${startId}`);
    assert.equal(tomaszEventsRes.status, 200);
    const tomaszTaskCreated = tomaszEventsRes.body.events.find(
      (e) => e.event_type === 'TASK_CREATED' && e.entity_id === createdTask.id
    );
    assert.equal(tomaszTaskCreated, undefined, 'Tomasz should NOT receive event for unassigned task');

    // Now Marek updates status
    const updateStatusRes = await marekClient.patch(`/api/tasks/${createdTask.id}/status`, {
      status_id: 2,
    });
    assert.equal(updateStatusRes.status, 200);

    // Verify TASK_STATUS_CHANGED event
    const piotrAfterStatus = await piotrClient.get(`/api/events?since_id=${marekTaskCreated.id}`);
    assert.equal(piotrAfterStatus.status, 200);
    const statusEvent = piotrAfterStatus.body.events.find(
      (e) => e.event_type === 'TASK_STATUS_CHANGED' && e.entity_id === createdTask.id
    );
    assert.ok(statusEvent, 'Piotr should receive TASK_STATUS_CHANGED event');
    assert.equal(statusEvent.is_actor, false);
    assert.equal(statusEvent.payload.statusId, 2);
  });
});
