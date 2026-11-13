import { getDb } from '../db/connection.js';
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

function parsePreferences(raw) {
  if (!raw || typeof raw !== 'string') {
    return {};
  }
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
}

export function requireAuth(req, _res, next) {
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
  const row = db
    .prepare(
      `
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
        d.code AS department_code,
        d.name AS department_name
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      JOIN roles r ON r.id = u.role_id
      JOIN positions p ON p.id = u.position_id
      LEFT JOIN departments d ON d.id = u.department_id
      WHERE s.id = ? AND s.user_id = ?
      `
    )
    .get(payload.sid, payload.uid);

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

  req.user = {
    id: row.user_id,
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
    token_version: row.token_version,
    is_active: row.is_active,
    last_login_at: row.last_login_at,
  };
  req.sessionId = row.session_id;

  return next();
}
