import { getDb } from '../db/connection.js';
import { buildPermissions, parsePreferences } from '../services/userMapper.js';
import { COOKIE_NAME } from '../utils/cookies.js';
import { verifySignedToken } from '../utils/crypto.js';
import { AppError } from './errorHandler.js';

function parseCookieHeader(cookieHeader, name) {
  if (typeof cookieHeader !== 'string' || cookieHeader.length === 0) {
    return null;
  }

  const pairs = cookieHeader.split(';');
  for (const pair of pairs) {
    const eqIndex = pair.indexOf('=');
    if (eqIndex <= 0) continue;
    const key = pair.slice(0, eqIndex).trim();
    if (key === name) {
      return decodeURIComponent(pair.slice(eqIndex + 1).trim());
    }
  }
  return null;
}

const AUTH_QUERY = `
  SELECT
    s.id AS session_id,
    s.expires_at AS session_expires_at,
    s.revoked_at AS session_revoked_at,
    u.id AS user_id,
    u.first_name,
    u.last_name,
    u.email,
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
  FROM sessions s
  JOIN users u ON u.id = s.user_id
  LEFT JOIN roles r ON r.id = u.role_id
  LEFT JOIN positions p ON p.id = u.position_id
  LEFT JOIN departments d ON d.id = u.department_id
  LEFT JOIN organizations o ON o.id = u.organization_id
  WHERE s.id = ? AND s.user_id = ?
`;

function buildUserFromRow(row) {
  const permissions = buildPermissions(row);

  return {
    id: row.user_id,
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
    token_version: row.token_version,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
  };
}

export async function requireAuth(req, _res, next) {
  const token =
    req.cookies?.[COOKIE_NAME] || parseCookieHeader(req.headers?.cookie, COOKIE_NAME);

  if (!token) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Brak aktywnej sesji'));
  }

  const payload = verifySignedToken(token);
  if (
    !payload ||
    typeof payload.sid !== 'string' ||
    typeof payload.uid !== 'number' ||
    typeof payload.tv !== 'number'
  ) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Nieprawidłowy token sesji'));
  }

  const db = getDb();
  const row = await db.prepare(AUTH_QUERY).get(payload.sid, payload.uid);

  if (!row || row.session_revoked_at !== null) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Sesja wygasła lub została unieważniona'));
  }

  const expiresAtMs = Date.parse(row.session_expires_at);
  if (!Number.isFinite(expiresAtMs) || expiresAtMs <= Date.now()) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Sesja wygasła'));
  }

  if (row.is_active !== 1 || row.token_version !== payload.tv) {
    return next(new AppError(401, 'UNAUTHORIZED', 'Konto jest nieaktywne lub sesja wygasła'));
  }

  req.user = buildUserFromRow(row);
  req.sessionId = row.session_id;

  return next();
}

export async function optionalAuth(req, _res, next) {
  const token =
    req.cookies?.[COOKIE_NAME] || parseCookieHeader(req.headers?.cookie, COOKIE_NAME);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const payload = verifySignedToken(token);
    if (
      !payload ||
      typeof payload.sid !== 'string' ||
      typeof payload.uid !== 'number' ||
      typeof payload.tv !== 'number'
    ) {
      req.user = null;
      return next();
    }

    const db = getDb();
    const row = await db.prepare(AUTH_QUERY).get(payload.sid, payload.uid);

    if (
      !row ||
      row.session_revoked_at !== null ||
      Date.parse(row.session_expires_at) <= Date.now() ||
      row.is_active !== 1 ||
      row.token_version !== payload.tv
    ) {
      req.user = null;
      return next();
    }

    req.user = buildUserFromRow(row);
    req.sessionId = row.session_id;
  } catch {
    req.user = null;
  }

  return next();
}
