import { getDb } from '../db/connection.js';
import { nowIso } from './auditService.js';
import { hydrateTaskRows } from './taskService.js';

function parseAuditDetails(raw) {
  if (!raw || typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

function parseBoolParam(val) {
  return val === true || val === 'true' || val === '1' || val === 1;
}

export function getDashboardOverview() {
  const db = getDb();
  const now = nowIso();

  const kpiRow = db
    .prepare(
      `
      SELECT
        COUNT(CASE WHEN deleted_at IS NULL THEN 1 END) AS total_tasks,
        COUNT(CASE WHEN deleted_at IS NOT NULL THEN 1 END) AS deleted_tasks,
        COUNT(CASE WHEN deleted_at IS NULL AND status_id = 1 THEN 1 END) AS todo_tasks,
        COUNT(CASE WHEN deleted_at IS NULL AND status_id = 2 THEN 1 END) AS in_progress_tasks,
        COUNT(CASE WHEN deleted_at IS NULL AND status_id = 3 THEN 1 END) AS completed_tasks,
        COUNT(CASE WHEN deleted_at IS NULL AND status_id = 4 THEN 1 END) AS cancelled_tasks,
        COUNT(
          CASE
            WHEN deleted_at IS NULL
              AND due_date IS NOT NULL
              AND due_date < ?
              AND status_id NOT IN (3, 4)
            THEN 1
          END
        ) AS overdue_tasks
      FROM tasks
      `
    )
    .get(now);

  const assignmentKpis = db
    .prepare(
      `
      SELECT
        COUNT(CASE WHEN ta.assignment_status = 'pending' THEN 1 END) AS pending_assignments,
        COUNT(CASE WHEN ta.assignment_status = 'rejected' THEN 1 END) AS rejected_assignments
      FROM task_assignments ta
      JOIN tasks t ON t.id = ta.task_id
      WHERE t.deleted_at IS NULL
      `
    )
    .get();

  const userKpis = db
    .prepare(
      `
      SELECT
        COUNT(*) AS total_users,
        COUNT(CASE WHEN is_active = 1 THEN 1 END) AS active_users
      FROM users
      `
    )
    .get();

  const completedTasks = Number(kpiRow?.completed_tasks ?? 0);
  const nonCancelled =
    Number(kpiRow?.todo_tasks ?? 0) +
    Number(kpiRow?.in_progress_tasks ?? 0) +
    completedTasks;
  const completionRatePct =
    nonCancelled > 0 ? Math.round((completedTasks / nonCancelled) * 100) : 0;

  const kpis = {
    total_tasks: Number(kpiRow?.total_tasks ?? 0),
    deleted_tasks: Number(kpiRow?.deleted_tasks ?? 0),
    todo_tasks: Number(kpiRow?.todo_tasks ?? 0),
    in_progress_tasks: Number(kpiRow?.in_progress_tasks ?? 0),
    completed_tasks: completedTasks,
    cancelled_tasks: Number(kpiRow?.cancelled_tasks ?? 0),
    overdue_tasks: Number(kpiRow?.overdue_tasks ?? 0),
    pending_assignments: Number(assignmentKpis?.pending_assignments ?? 0),
    rejected_assignments: Number(assignmentKpis?.rejected_assignments ?? 0),
    active_users: Number(userKpis?.active_users ?? 0),
    total_users: Number(userKpis?.total_users ?? 0),
    completion_rate_pct: completionRatePct,
  };

  const status_distribution = db
    .prepare(
      `
      SELECT
        ts.id,
        ts.name,
        COUNT(t.id) AS count
      FROM task_statuses ts
      LEFT JOIN tasks t ON t.status_id = ts.id AND t.deleted_at IS NULL
      GROUP BY ts.id, ts.name
      ORDER BY ts.id ASC
      `
    )
    .all();

  const priority_distribution = db
    .prepare(
      `
      SELECT
        pr.id,
        pr.name,
        pr.level,
        COUNT(ta.task_id) AS count
      FROM priorities pr
      LEFT JOIN task_assignments ta ON ta.priority_id = pr.id
      LEFT JOIN tasks t ON t.id = ta.task_id AND t.deleted_at IS NULL
      WHERE ta.task_id IS NULL OR t.id IS NOT NULL
      GROUP BY pr.id, pr.name, pr.level
      ORDER BY pr.level ASC, pr.id ASC
      `
    )
    .all();

  const overdueTaskRows = db
    .prepare(
      `
      SELECT
        t.*,
        c.first_name AS creator_first_name,
        c.last_name AS creator_last_name,
        c.email AS creator_email,
        c.avatar_color AS creator_avatar_color,
        c.position_id AS creator_position_id
      FROM tasks t
      JOIN users c ON c.id = t.creator_id
      WHERE t.deleted_at IS NULL
        AND t.due_date IS NOT NULL
        AND t.due_date < ?
        AND t.status_id NOT IN (3, 4)
      ORDER BY t.due_date ASC, t.id ASC
      `
    )
    .all(now);

  const overdue_tasks = hydrateTaskRows(db, overdueTaskRows).tasks;

  const employee_workload = db
    .prepare(
      `
      SELECT
        u.id,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_color,
        r.name AS role,
        p.name AS position_name,
        d.name AS department_name,
        COUNT(CASE WHEN t.id IS NOT NULL THEN 1 END) AS total_assigned,
        COUNT(CASE WHEN t.id IS NOT NULL AND ta.assignment_status = 'accepted' THEN 1 END) AS accepted_count,
        COUNT(CASE WHEN t.id IS NOT NULL AND ta.assignment_status = 'pending' THEN 1 END) AS pending_count,
        COUNT(CASE WHEN t.id IS NOT NULL AND ta.assignment_status = 'rejected' THEN 1 END) AS rejected_count,
        COUNT(CASE WHEN t.id IS NOT NULL AND ta.assignment_status != 'rejected' AND t.status_id = 3 THEN 1 END) AS completed_count,
        COUNT(CASE WHEN t.id IS NOT NULL AND ta.assignment_status != 'rejected' AND t.status_id = 2 THEN 1 END) AS in_progress_count,
        COUNT(CASE WHEN t.id IS NOT NULL AND ta.assignment_status != 'rejected' AND t.status_id = 1 THEN 1 END) AS todo_count,
        COUNT(
          CASE
            WHEN t.id IS NOT NULL
              AND ta.assignment_status != 'rejected'
              AND t.due_date IS NOT NULL
              AND t.due_date < ?
              AND t.status_id NOT IN (3, 4)
            THEN 1
          END
        ) AS overdue_count
      FROM users u
      JOIN roles r ON r.id = u.role_id
      JOIN positions p ON p.id = u.position_id
      LEFT JOIN departments d ON d.id = u.department_id
      LEFT JOIN task_assignments ta ON ta.employee_id = u.id
      LEFT JOIN tasks t ON t.id = ta.task_id AND t.deleted_at IS NULL
      WHERE u.is_active = 1
      GROUP BY u.id
      ORDER BY p.priority ASC, u.last_name ASC, u.first_name ASC
      `
    )
    .all(now);

  const role_stats = db
    .prepare(
      `
      SELECT
        r.id,
        r.name,
        r.description,
        COUNT(u.id) AS users_count,
        COUNT(CASE WHEN u.is_active = 1 THEN 1 END) AS active_users_count
      FROM roles r
      LEFT JOIN users u ON u.role_id = r.id
      GROUP BY r.id, r.name, r.description
      ORDER BY r.id ASC
      `
    )
    .all();

  const position_stats = db
    .prepare(
      `
      SELECT
        p.id,
        p.name,
        p.priority,
        p.is_delegatable,
        COUNT(DISTINCT u.id) AS users_count,
        COUNT(
          DISTINCT CASE
            WHEN t.id IS NOT NULL AND ta.assignment_status != 'rejected' AND t.status_id NOT IN (3, 4)
            THEN t.id
          END
        ) AS active_tasks_count
      FROM positions p
      LEFT JOIN users u ON u.position_id = p.id AND u.is_active = 1
      LEFT JOIN task_assignments ta ON ta.employee_id = u.id
      LEFT JOIN tasks t ON t.id = ta.task_id AND t.deleted_at IS NULL
      GROUP BY p.id, p.name, p.priority, p.is_delegatable
      ORDER BY p.priority ASC, p.id ASC
      `
    )
    .all();

  const recentAuditRows = db
    .prepare(
      `
      SELECT
        a.id,
        a.actor_user_id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details_json,
        a.ip_address,
        a.created_at,
        u.first_name AS actor_first_name,
        u.last_name AS actor_last_name,
        u.email AS actor_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_user_id
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT 20
      `
    )
    .all();

  const recent_audit_activity = recentAuditRows.map((row) => ({
    id: row.id,
    actor_user_id: row.actor_user_id,
    actor_name: row.actor_first_name ? `${row.actor_first_name} ${row.actor_last_name}` : null,
    actor_email: row.actor_email ?? null,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    details: parseAuditDetails(row.details_json),
    ip_address: row.ip_address,
    created_at: row.created_at,
  }));

  return {
    kpis,
    status_distribution,
    priority_distribution,
    overdue_tasks,
    employee_workload,
    role_stats,
    position_stats,
    recent_audit_activity,
  };
}

export function getDashboardTasks(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  const inTrash = parseBoolParam(filters.in_trash);
  if (inTrash) {
    conditions.push('t.deleted_at IS NOT NULL');
  } else {
    conditions.push('t.deleted_at IS NULL');
  }

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push('(t.title LIKE ? OR t.short_desc LIKE ? OR t.full_desc LIKE ?)');
    params.push(pattern, pattern, pattern);
  }

  if (filters.status_id !== undefined) {
    conditions.push('t.status_id = ?');
    params.push(filters.status_id);
  }

  if (filters.creator_id !== undefined) {
    conditions.push('t.creator_id = ?');
    params.push(filters.creator_id);
  }

  if (filters.assignee_id !== undefined) {
    conditions.push(
      'EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.employee_id = ?)'
    );
    params.push(filters.assignee_id);
  }

  if (filters.priority_id !== undefined) {
    conditions.push(
      'EXISTS (SELECT 1 FROM task_assignments ta WHERE ta.task_id = t.id AND ta.priority_id = ?)'
    );
    params.push(filters.priority_id);
  }

  if (parseBoolParam(filters.overdue_only)) {
    conditions.push('t.due_date IS NOT NULL AND t.due_date < ? AND t.status_id NOT IN (3, 4)');
    params.push(nowIso());
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const rows = db
    .prepare(
      `
      SELECT
        t.*,
        c.first_name AS creator_first_name,
        c.last_name AS creator_last_name,
        c.email AS creator_email,
        c.avatar_color AS creator_avatar_color,
        c.position_id AS creator_position_id
      FROM tasks t
      JOIN users c ON c.id = t.creator_id
      ${whereClause}
      ORDER BY t.created_at DESC, t.id DESC
      `
    )
    .all(...params);

  return hydrateTaskRows(db, rows);
}

export function getAuditLogs({ action, actor_id, entity_type, page = 1, limit = 25 }) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (action) {
    conditions.push('a.action = ?');
    params.push(action);
  }
  if (actor_id !== undefined) {
    conditions.push('a.actor_user_id = ?');
    params.push(actor_id);
  }
  if (entity_type) {
    conditions.push('a.entity_type = ?');
    params.push(entity_type);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const countRow = db
    .prepare(`SELECT COUNT(*) AS total FROM audit_logs a ${whereClause}`)
    .get(...params);

  const offset = (page - 1) * limit;
  const rows = db
    .prepare(
      `
      SELECT
        a.id,
        a.actor_user_id,
        a.action,
        a.entity_type,
        a.entity_id,
        a.details_json,
        a.ip_address,
        a.user_agent,
        a.created_at,
        u.first_name AS actor_first_name,
        u.last_name AS actor_last_name,
        u.email AS actor_email
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.actor_user_id
      ${whereClause}
      ORDER BY a.created_at DESC, a.id DESC
      LIMIT ? OFFSET ?
      `
    )
    .all(...params, limit, offset);

  const logs = rows.map((row) => ({
    id: row.id,
    actor_user_id: row.actor_user_id,
    actor_name: row.actor_first_name ? `${row.actor_first_name} ${row.actor_last_name}` : null,
    actor_email: row.actor_email ?? null,
    action: row.action,
    entity_type: row.entity_type,
    entity_id: row.entity_id,
    details: parseAuditDetails(row.details_json),
    ip_address: row.ip_address,
    user_agent: row.user_agent,
    created_at: row.created_at,
  }));

  return {
    logs,
    total: Number(countRow?.total ?? 0),
    page,
    limit,
  };
}
