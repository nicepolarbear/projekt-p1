import { getDb } from '../db/connection.js';

export async function getMeta() {
  const db = getDb();

  const roles = await db
    .prepare('SELECT id, name, description FROM roles ORDER BY id ASC')
    .all();

  const rawPositions = await db
    .prepare('SELECT * FROM positions ORDER BY priority ASC, id ASC')
    .all();

  const positions = rawPositions.map((pos) => ({
    id: pos.id,
    name: pos.name,
    description: pos.description,
    priority: pos.priority,
    is_delegatable: Boolean(pos.is_delegatable),
    is_admin: Boolean(pos.is_admin),
    can_manage_members: Boolean(pos.can_manage_members),
    can_generate_invites: Boolean(pos.can_generate_invites),
    can_approve_join_requests: Boolean(pos.can_approve_join_requests),
    can_create_tasks: Boolean(pos.can_create_tasks),
    can_assign_tasks: Boolean(pos.can_assign_tasks),
    can_manage_all_tasks: Boolean(pos.can_manage_all_tasks),
    can_delete_tasks: Boolean(pos.can_delete_tasks),
    can_triage_bugs: Boolean(pos.can_triage_bugs),
    can_convert_bugs_to_tasks: Boolean(pos.can_convert_bugs_to_tasks),
    can_manage_applications: Boolean(pos.can_manage_applications),
    can_view_analytics: Boolean(pos.can_view_analytics),
    can_view_audit_logs: Boolean(pos.can_view_audit_logs),
    can_manage_permissions: Boolean(pos.can_manage_permissions),
  }));

  const departments = await db
    .prepare('SELECT id, code, name, description FROM departments ORDER BY id ASC')
    .all();

  const taskStatuses = await db
    .prepare('SELECT id, name FROM task_statuses ORDER BY id ASC')
    .all();

  const priorities = await db
    .prepare('SELECT id, name, level FROM priorities ORDER BY level ASC, id ASC')
    .all();

  const userRows = await db
    .prepare(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.role_id,
        u.position_id,
        u.department_id,
        u.organization_id,
        u.account_type,
        u.avatar_color,
        u.is_active,
        r.name AS role_name,
        p.name AS position_name,
        p.description AS position_description,
        p.priority AS position_priority,
        p.is_delegatable AS position_is_delegatable,
        d.code AS department_code,
        d.name AS department_name
      FROM users u
      LEFT JOIN roles r ON r.id = u.role_id
      LEFT JOIN positions p ON p.id = u.position_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE u.is_active = 1
      ORDER BY p.priority ASC, u.last_name ASC, u.first_name ASC
      `
    )
    .all();

  const directoryUsers = userRows.map((row) => ({
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    role: row.role_name,
    role_id: row.role_id,
    position_id: row.position_id,
    position: row.position_id
      ? {
          id: row.position_id,
          name: row.position_name,
          description: row.position_description,
          priority: row.position_priority,
          is_delegatable: Boolean(row.position_is_delegatable),
        }
      : null,
    department_id: row.department_id,
    department: row.department_id
      ? {
          id: row.department_id,
          code: row.department_code,
          name: row.department_name,
        }
      : null,
    avatar_color: row.avatar_color,
    is_active: row.is_active,
  }));

  return {
    roles,
    positions,
    departments,
    taskStatuses,
    priorities,
    directoryUsers,
  };
}
