import { getDb } from '../db/connection.js';
import { nowIso } from './auditService.js';

/**
 * Zapisuje zdarzenie czasu rzeczywistego w bazie danych.
 * Może być wywoływane wewnątrz transakcji `tx` lub z domyślnym `getDb()`.
 */
export async function recordLiveEvent(
  dbOrTx,
  {
    organizationId = null,
    eventType,
    entityType = 'task',
    entityId,
    actorId,
    actorName,
    targetUserIds = null,
    title,
    description = null,
    payload = {},
  }
) {
  const db = dbOrTx || getDb();
  const now = nowIso();
  const targetIdsJson = Array.isArray(targetUserIds) ? JSON.stringify(targetUserIds) : null;
  const payloadJson = typeof payload === 'object' && payload !== null ? JSON.stringify(payload) : '{}';

  const result = await db
    .prepare(
      `
      INSERT INTO live_events (
        organization_id, event_type, entity_type, entity_id,
        actor_id, actor_name, target_user_ids_json, title,
        description, payload_json, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `
    )
    .run(
      organizationId,
      eventType,
      entityType,
      entityId,
      actorId,
      actorName || 'Użytkownik',
      targetIdsJson,
      title,
      description,
      payloadJson,
      now
    );

  return Number(result.lastInsertRowid);
}

/**
 * Pobiera zdarzenia dla danego użytkownika od podanego identyfikatora `sinceId`.
 */
export async function fetchEventsForUser({ userId, organizationId = null, sinceId = 0, limit = 50 }) {
  const db = getDb();
  const safeSinceId = Number(sinceId) || 0;
  const safeLimit = Math.min(Math.max(Number(limit) || 50, 1), 100);

  const params = [safeSinceId];
  let orgFilter = '';

  if (organizationId) {
    orgFilter = 'AND (organization_id = ? OR organization_id IS NULL)';
    params.push(organizationId);
  }

  params.push(safeLimit);

  const rows = await db
    .prepare(
      `
      SELECT
        id,
        organization_id,
        event_type,
        entity_type,
        entity_id,
        actor_id,
        actor_name,
        target_user_ids_json,
        title,
        description,
        payload_json,
        created_at
      FROM live_events
      WHERE id > ?
      ${orgFilter}
      ORDER BY id ASC
      LIMIT ?
      `
    )
    .all(...params);

  const events = [];

  for (const row of rows) {
    let targetIds = null;
    if (row.target_user_ids_json) {
      try {
        targetIds = JSON.parse(row.target_user_ids_json);
      } catch {
        targetIds = null;
      }
    }

    // Filtracja odbiorców: jeśli określono target_user_ids, zdarzenie widzi aktor oraz wskazani odbiorcy
    const isActor = row.actor_id === userId;
    const isTarget = !Array.isArray(targetIds) || targetIds.includes(userId);

    if (isActor || isTarget) {
      let parsedPayload = {};
      try {
        parsedPayload = JSON.parse(row.payload_json || '{}');
      } catch {
        parsedPayload = {};
      }

      events.push({
        id: row.id,
        organization_id: row.organization_id,
        event_type: row.event_type,
        entity_type: row.entity_type,
        entity_id: row.entity_id,
        actor_id: row.actor_id,
        actor_name: row.actor_name,
        is_actor: isActor,
        title: row.title,
        description: row.description,
        payload: parsedPayload,
        created_at: row.created_at,
      });
    }
  }

  return { events };
}
