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
  return {
    id: row.id,
    first_name: row.first_name,
    last_name: row.last_name,
    email: row.email,
    role: row.role_name,
    role_id: row.role_id,
    role_name: row.role_name,
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
    bio: row.bio,
    phone: row.phone,
    preferences: parsePreferences(row.preferences_json),
    is_active: row.is_active,
    last_login_at: row.last_login_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

const USER_SELECT_SQL = `
  SELECT
    u.id,
    u.first_name,
    u.last_name,
    u.email,
    u.password_hash,
    u.role_id,
    u.position_id,
    u.department_id,
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
    d.code AS department_code,
    d.name AS department_name
  FROM users u
  JOIN roles r ON r.id = u.role_id
  JOIN positions p ON p.id = u.position_id
  LEFT JOIN departments d ON d.id = u.department_id
`;

export function fetchUserRowById(userId, db = getDb()) {
  return db.prepare(`${USER_SELECT_SQL} WHERE u.id = ?`).get(userId) || null;
}

export function fetchUserRowByEmail(email, db = getDb()) {
  return db.prepare(`${USER_SELECT_SQL} WHERE LOWER(u.email) = LOWER(?)`).get(email) || null;
}

export function fetchSanitizedUserById(userId, db = getDb()) {
  const row = fetchUserRowById(userId, db);
  return mapUserRow(row);
}
