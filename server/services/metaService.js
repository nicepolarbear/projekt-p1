import { getDb } from '../db/connection.js';

export function getMeta() {
  const db = getDb();

  const roles = db
    .prepare('SELECT id, name, description FROM roles ORDER BY id ASC')
    .all();

  const positions = db
    .prepare(
      'SELECT id, name, description, priority, is_delegatable FROM positions ORDER BY priority ASC, id ASC'
    )
    .all();

  const departments = db
    .prepare('SELECT id, code, name, description FROM departments ORDER BY id ASC')
    .all();

  const taskStatuses = db
    .prepare('SELECT id, name FROM task_statuses ORDER BY id ASC')
    .all();

  const priorities = db
    .prepare('SELECT id, name, level FROM priorities ORDER BY level ASC, id ASC')
    .all();

  const userRows = db
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
      JOIN roles r ON r.id = u.role_id
      JOIN positions p ON p.id = u.position_id
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
    position: {
      id: row.position_id,
      name: row.position_name,
      description: row.position_description,
      priority: row.position_priority,
      is_delegatable: row.position_is_delegatable,
    },
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
