import { getDb } from '../db/connection.js';

export function nowIso() {
  return new Date().toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function getClientMeta(req) {
  const ipAddress = req?.ip || req?.socket?.remoteAddress || null;
  const rawUa = req?.headers?.['user-agent'];
  const userAgent = typeof rawUa === 'string' && rawUa.length > 0 ? rawUa.slice(0, 512) : null;
  return { ipAddress, userAgent };
}

export async function logAudit(
  db,
  {
    actorUserId = null,
    action,
    entityType,
    entityId = null,
    details = {},
    ipAddress = null,
    userAgent = null,
  }
) {
  try {
    const database = db || getDb();
    await database
      .prepare(
        `
        INSERT INTO audit_logs (
          actor_user_id, action, entity_type, entity_id,
          details_json, ip_address, user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `
      )
      .run(
        actorUserId ?? null,
        action,
        entityType,
        entityId !== null && entityId !== undefined ? String(entityId) : null,
        JSON.stringify(details ?? {}),
        ipAddress ?? null,
        userAgent ?? null,
        nowIso()
      );
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
