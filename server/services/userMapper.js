import { getDb } from '../db/connection.js';

export function parsePreferences(raw) {
  if (!raw) return {};
  if (typeof raw === 'object' && !Array.isArray(raw)) {
    return raw;
  }
  if (typeof raw !== 'string') return {};
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function buildPermissions(row) {
  const isAdmin = Boolean(row?.is_admin || row?.role_name === 'admin' || row?.role === 'admin');
  return {
    is_admin: isAdmin,
    can_manage_members: isAdmin || Boolean(row?.can_manage_members),
    can_generate_invites: isAdmin || Boolean(row?.can_generate_invites),
    can_approve_join_requests: isAdmin || Boolean(row?.can_approve_join_requests),
    can_create_tasks: isAdmin || Boolean(row?.can_create_tasks),
    can_assign_tasks: isAdmin || Boolean(row?.can_assign_tasks),
    can_manage_all_tasks: isAdmin || Boolean(row?.can_manage_all_tasks),
    can_delete_tasks: isAdmin || Boolean(row?.can_delete_tasks),
    can_triage_bugs: isAdmin || Boolean(row?.can_triage_bugs),
    can_convert_bugs_to_tasks: isAdmin || Boolean(row?.can_convert_bugs_to_tasks),
    can_manage_applications: isAdmin || Boolean(row?.can_manage_applications),
    can_view_analytics: isAdmin || Boolean(row?.can_view_analytics),
    can_view_audit_logs: isAdmin || Boolean(row?.can_view_audit_logs),
    can_manage_permissions: isAdmin || Boolean(row?.can_manage_permissions),
  };
}

export function sanitizeUser(user) {
  if (!user) return null;
  const {
    password_hash: _passwordHash,
    token_version: _tokenVersion,
    preferences_json: _preferencesJson,
    ...rest
  } = user;

  return {
    ...rest,
    preferences: parsePreferences(user.preferences ?? user.preferences_json),
  };
}

export function mapUserRow(row) {
  if (!row) return null;

  const permissions = buildPermissions(row);

  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    account_type: row.account_type || 'business_user',
    organization_id: row.organization_id || null,
    organization: row.organization_id
      ? {
          id: row.organization_id,
          name: row.organization_name || null,
          slug: row.organization_slug || null,
        }
      : null,
    role: row.role_name || null,
    role_id: row.role_id || null,
    role_name: row.role_name || null,
    position_id: row.position_id || null,
    position: row.position_id
      ? {
          id: row.position_id,
          name: row.position_name,
          description: row.position_description,
          priority: row.position_priority,
          is_delegatable: row.position_is_delegatable,
          is_admin: permissions.is_admin,
          can_manage_members: permissions.can_manage_members,
          can_generate_invites: permissions.can_generate_invites,
          can_approve_join_requests: permissions.can_approve_join_requests,
          can_create_tasks: permissions.can_create_tasks,
          can_assign_tasks: permissions.can_assign_tasks,
          can_manage_all_tasks: permissions.can_manage_all_tasks,
          can_delete_tasks: permissions.can_delete_tasks,
          can_triage_bugs: permissions.can_triage_bugs,
          can_convert_bugs_to_tasks: permissions.can_convert_bugs_to_tasks,
          can_manage_applications: permissions.can_manage_applications,
          can_view_analytics: permissions.can_view_analytics,
          can_view_audit_logs: permissions.can_view_audit_logs,
          can_manage_permissions: permissions.can_manage_permissions,
        }
      : null,
    permissions,
    department_id: row.department_id || null,
    department: row.department_id
      ? {
          id: row.department_id,
          code: row.department_code,
          name: row.department_name,
        }
      : null,
    avatar_color: row.avatar_color,
    bio: row.bio,
    phone: row.phone,
    preferences: parsePreferences(row.preferences_json),
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export const USER_SELECT_SQL = `
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.password_hash,
    u.role_id,
    u.position_id,
    u.department_id,
    u.organization_id,
    u.account_type,
    u.avatar_color,
    u.bio,
    u.phone,
    u.preferences_json,
    u.token_version,
    u.is_active,
    u.last_login_at,
    u.created_at,
    u.updated_at,
    r.name AS role_name,
    p.name AS position_name,
    p.description AS position_description,
    p.priority AS position_priority,
    p.is_delegatable AS position_is_delegatable,
    p.is_admin,
    p.can_manage_members,
    p.can_generate_invites,
    p.can_approve_join_requests,
    p.can_create_tasks,
    p.can_assign_tasks,
    p.can_manage_all_tasks,
    p.can_delete_tasks,
    p.can_triage_bugs,
    p.can_convert_bugs_to_tasks,
    p.can_manage_applications,
    p.can_view_analytics,
    p.can_view_audit_logs,
    p.can_manage_permissions,
    d.code AS department_code,
    d.name AS department_name,
    o.name AS organization_name,
    o.slug AS organization_slug
  FROM users u
  LEFT JOIN roles r ON r.id = u.role_id
  LEFT JOIN positions p ON p.id = u.position_id
  LEFT JOIN departments d ON d.id = u.department_id
  LEFT JOIN organizations o ON o.id = u.organization_id
`;

export async function fetchUserRowById(userId, db = getDb()) {
  return (await db.prepare(`${USER_SELECT_SQL} WHERE u.id = ?`).get(userId)) || null;
}

export async function fetchUserRowByEmail(email, db = getDb()) {
  return (await db.prepare(`${USER_SELECT_SQL} WHERE LOWER(u.email) = LOWER(?)`).get(email)) || null;
}

export async function fetchSanitizedUserById(userId, db = getDb()) {
  const row = await fetchUserRowById(userId, db);
  return mapUserRow(row);
}

