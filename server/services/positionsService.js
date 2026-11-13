import { getDb } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAudit } from './auditService.js';

const SYSTEM_POSITION_IDS = new Set([1, 2, 3, 4, 5]);

export function formatPosition(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    priority: row.priority,
    is_delegatable: Boolean(row.is_delegatable),
    is_admin: Boolean(row.is_admin),
    can_manage_members: Boolean(row.can_manage_members),
    can_generate_invites: Boolean(row.can_generate_invites),
    can_approve_join_requests: Boolean(row.can_approve_join_requests),
    can_create_tasks: Boolean(row.can_create_tasks),
    can_assign_tasks: Boolean(row.can_assign_tasks),
    can_manage_all_tasks: Boolean(row.can_manage_all_tasks),
    can_delete_tasks: Boolean(row.can_delete_tasks),
    can_triage_bugs: Boolean(row.can_triage_bugs),
    can_convert_bugs_to_tasks: Boolean(row.can_convert_bugs_to_tasks),
    can_manage_applications: Boolean(row.can_manage_applications),
    can_view_analytics: Boolean(row.can_view_analytics),
    can_view_audit_logs: Boolean(row.can_view_audit_logs),
    can_manage_permissions: Boolean(row.can_manage_permissions),
    created_at: row.created_at,
  };
}

export async function listPositions(db = getDb()) {
  const rows = await db
    .prepare('SELECT * FROM positions ORDER BY priority ASC, id ASC')
    .all();
  return rows.map(formatPosition);
}

export async function getPositionById(id, db = getDb()) {
  const row = await db.prepare('SELECT * FROM positions WHERE id = ?').get(id);
  if (!row) return null;
  return formatPosition(row);
}

export async function createPosition(data, actorId = null, clientMeta = {}, db = getDb()) {
  const name = data.name.trim();

  const existing = await db
    .prepare('SELECT id FROM positions WHERE LOWER(name) = LOWER(?)')
    .get(name);
  if (existing) {
    throw new AppError(409, 'DUPLICATE_NAME', 'Stanowisko o tej nazwie już istnieje');
  }

  const priority = Number.isInteger(data.priority) ? data.priority : 3;
  const isDelegatable = data.is_delegatable ? 1 : 0;
  const isAdmin = data.is_admin ? 1 : 0;

  const toBit = (v) => (isAdmin || v ? 1 : 0);

  const stmt = db.prepare(`
    INSERT INTO positions (
      name, description, priority, is_delegatable,
      is_admin, can_manage_members, can_generate_invites, can_approve_join_requests,
      can_create_tasks, can_assign_tasks, can_manage_all_tasks, can_delete_tasks,
      can_triage_bugs, can_convert_bugs_to_tasks, can_manage_applications,
      can_view_analytics, can_view_audit_logs, can_manage_permissions, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const info = await stmt.run(
    name,
    data.description ? data.description.trim() : null,
    priority,
    isDelegatable,
    isAdmin,
    toBit(data.can_manage_members),
    toBit(data.can_generate_invites),
    toBit(data.can_approve_join_requests),
    toBit(data.can_create_tasks ?? 1),
    toBit(data.can_assign_tasks ?? 1),
    toBit(data.can_manage_all_tasks),
    toBit(data.can_delete_tasks),
    toBit(data.can_triage_bugs),
    toBit(data.can_convert_bugs_to_tasks),
    toBit(data.can_manage_applications),
    toBit(data.can_view_analytics),
    toBit(data.can_view_audit_logs),
    toBit(data.can_manage_permissions),
    new Date().toISOString().replace(/\.\d{3}Z$/, 'Z')
  );

  const created = await getPositionById(info.lastInsertRowid, db);

  await logAudit(db, {
    actorUserId: actorId,
    action: 'position.create',
    entityType: 'position',
    entityId: created.id,
    details: { name: created.name, priority: created.priority },
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
  });

  return created;
}

export async function updatePosition(id, data, actorId = null, clientMeta = {}, db = getDb()) {
  const current = await db.prepare('SELECT * FROM positions WHERE id = ?').get(id);
  if (!current) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono stanowiska');
  }

  let newName = current.name;
  if (data.name !== undefined) {
    newName = data.name.trim();
    if (newName.toLowerCase() !== current.name.toLowerCase()) {
      const existing = await db
        .prepare('SELECT id FROM positions WHERE LOWER(name) = LOWER(?) AND id != ?')
        .get(newName, id);
      if (existing) {
        throw new AppError(409, 'DUPLICATE_NAME', 'Stanowisko o tej nazwie już istnieje');
      }
    }
  }

  const newDescription =
    data.description !== undefined
      ? data.description ? data.description.trim() : null
      : current.description;

  const newPriority =
    Number.isInteger(data.priority) ? data.priority : current.priority;

  const newIsDelegatable =
    data.is_delegatable !== undefined
      ? data.is_delegatable ? 1 : 0
      : current.is_delegatable;

  const newIsAdmin =
    data.is_admin !== undefined
      ? data.is_admin ? 1 : 0
      : current.is_admin;

  const updateBit = (field, fallback) => {
    if (newIsAdmin) return 1;
    if (data[field] !== undefined) return data[field] ? 1 : 0;
    return fallback;
  };

  await db.prepare(`
    UPDATE positions SET
      name = ?,
      description = ?,
      priority = ?,
      is_delegatable = ?,
      is_admin = ?,
      can_manage_members = ?,
      can_generate_invites = ?,
      can_approve_join_requests = ?,
      can_create_tasks = ?,
      can_assign_tasks = ?,
      can_manage_all_tasks = ?,
      can_delete_tasks = ?,
      can_triage_bugs = ?,
      can_convert_bugs_to_tasks = ?,
      can_manage_applications = ?,
      can_view_analytics = ?,
      can_view_audit_logs = ?,
      can_manage_permissions = ?
    WHERE id = ?
  `).run(
    newName,
    newDescription,
    newPriority,
    newIsDelegatable,
    newIsAdmin,
    updateBit('can_manage_members', current.can_manage_members),
    updateBit('can_generate_invites', current.can_generate_invites),
    updateBit('can_approve_join_requests', current.can_approve_join_requests),
    updateBit('can_create_tasks', current.can_create_tasks),
    updateBit('can_assign_tasks', current.can_assign_tasks),
    updateBit('can_manage_all_tasks', current.can_manage_all_tasks),
    updateBit('can_delete_tasks', current.can_delete_tasks),
    updateBit('can_triage_bugs', current.can_triage_bugs),
    updateBit('can_convert_bugs_to_tasks', current.can_convert_bugs_to_tasks),
    updateBit('can_manage_applications', current.can_manage_applications),
    updateBit('can_view_analytics', current.can_view_analytics),
    updateBit('can_view_audit_logs', current.can_view_audit_logs),
    updateBit('can_manage_permissions', current.can_manage_permissions),
    id
  );

  const updated = await getPositionById(id, db);

  await logAudit(db, {
    actorUserId: actorId,
    action: 'position.update',
    entityType: 'position',
    entityId: id,
    details: { changes: data },
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
  });

  return updated;
}

export async function deletePosition(id, actorId = null, clientMeta = {}, db = getDb()) {
  const current = await db.prepare('SELECT * FROM positions WHERE id = ?').get(id);
  if (!current) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono stanowiska');
  }

  if (SYSTEM_POSITION_IDS.has(Number(id))) {
    throw new AppError(
      400,
      'PROTECTED_POSITION',
      'Nie można usunąć wbudowanego stanowiska systemowego'
    );
  }

  const countRow = await db
    .prepare('SELECT COUNT(*) AS count FROM users WHERE position_id = ? AND is_active = 1')
    .get(id);
  const assignedCount = Number(countRow?.count ?? 0);

  if (assignedCount > 0) {
    throw new AppError(
      400,
      'POSITION_IN_USE',
      'Nie można usunąć stanowiska przypisanego do aktywnych pracowników'
    );
  }

  await db.prepare('DELETE FROM positions WHERE id = ?').run(id);

  await logAudit(db, {
    actorUserId: actorId,
    action: 'position.delete',
    entityType: 'position',
    entityId: id,
    details: { name: current.name },
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
  });

  return { success: true, deleted_id: Number(id) };
}
