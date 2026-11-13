import { getDb, withTransaction } from '../db/connection.js';
import { logAudit, nowIso } from './auditService.js';
import { fetchSanitizedUserById, parsePreferences } from './userMapper.js';

export async function updateProfile({ userId, updates, ipAddress = null, userAgent = null }) {
  const allowedKeys = ['first_name', 'last_name', 'phone', 'bio', 'avatar_color'];
  const setClauses = [];
  const params = [];
  const changedFields = [];

  for (const key of allowedKeys) {
    if (Object.hasOwn(updates, key) && updates[key] !== undefined) {
      let value = updates[key];
      if ((key === 'phone' || key === 'bio') && value === '') {
        value = null;
      }
      setClauses.push(`${key} = ?`);
      params.push(value);
      changedFields.push(key);
    }
  }

  const db = getDb();

  if (setClauses.length > 0) {
    const now = nowIso();
    setClauses.push('updated_at = ?');
    params.push(now);
    params.push(userId);

    await withTransaction(async (tx) => {
      await tx.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

      await logAudit(tx, {
        actorUserId: userId,
        action: 'PROFILE_UPDATED',
        entityType: 'user',
        entityId: userId,
        details: { updated_fields: changedFields },
        ipAddress,
        userAgent,
      });
    });
  }

  return await fetchSanitizedUserById(userId, db);
}

export async function updatePreferences({ userId, prefs, ipAddress = null, userAgent = null }) {
  const now = nowIso();

  const merged = await withTransaction(async (tx) => {
    const row = await tx.prepare('SELECT preferences_json FROM users WHERE id = ?').get(userId);
    const current = parsePreferences(row?.preferences_json);
    const next = { ...current, ...prefs };

    await tx.prepare('UPDATE users SET preferences_json = ?, updated_at = ? WHERE id = ?').run(
      JSON.stringify(next),
      now,
      userId
    );

    await logAudit(tx, {
      actorUserId: userId,
      action: 'PREFERENCES_UPDATED',
      entityType: 'user',
      entityId: userId,
      details: { preferences: next },
      ipAddress,
      userAgent,
    });

    return next;
  });

  return merged;
}

export async function getProfileStats(userId) {
  const db = getDb();
  const now = nowIso();

  const createdRow = await db
    .prepare(
      `
      SELECT COUNT(*) AS cnt
      FROM tasks
      WHERE creator_id = ? AND deleted_at IS NULL
      `
    )
    .get(userId);

  const assignedRow = await db
    .prepare(
      `
      SELECT COUNT(DISTINCT ta.task_id) AS cnt
      FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      WHERE ta.employee_id = ?
        AND ta.assignment_status != 'rejected'
        AND t.deleted_at IS NULL
      `
    )
    .get(userId);

  const pendingRow = await db
    .prepare(
      `
      SELECT COUNT(*) AS cnt
      FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      WHERE ta.employee_id = ?
        AND ta.assignment_status = 'pending'
        AND t.deleted_at IS NULL
      `
    )
    .get(userId);

  const taskBreakdown = await db
    .prepare(
      `
      SELECT
        COUNT(CASE WHEN t.status_id = 3 THEN 1 END) AS completed_count,
        COUNT(CASE WHEN t.status_id = 2 THEN 1 END) AS in_progress_count,
        COUNT(CASE WHEN t.status_id != 4 THEN 1 END) AS non_cancelled_count,
        COUNT(
          CASE
            WHEN t.due_date IS NOT NULL
              AND t.due_date < ?
              AND t.status_id NOT IN (3, 4)
            THEN 1
          END
        ) AS overdue_count
      FROM tasks t
      WHERE t.deleted_at IS NULL
        AND (
          t.creator_id = ?
          OR EXISTS (
            SELECT 1 FROM task_assignments ta
            WHERE ta.task_id = t.id
              AND ta.employee_id = ?
              AND ta.assignment_status != 'rejected'
          )
        )
      `
    )
    .get(now, userId, userId);

  const completedCount = Number(taskBreakdown?.completed_count ?? 0);
  const nonCancelledCount = Number(taskBreakdown?.non_cancelled_count ?? 0);
  const completionRatePct =
    nonCancelledCount > 0 ? Math.round((completedCount / nonCancelledCount) * 100) : 0;

  return {
    created_count: Number(createdRow?.cnt ?? 0),
    assigned_count: Number(assignedRow?.cnt ?? 0),
    completed_count: completedCount,
    in_progress_count: Number(taskBreakdown?.in_progress_count ?? 0),
    pending_count: Number(pendingRow?.cnt ?? 0),
    overdue_count: Number(taskBreakdown?.overdue_count ?? 0),
    completion_rate_pct: completionRatePct,
  };
}
