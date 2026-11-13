import { getDb, withTransaction } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/crypto.js';
import { logAudit, nowIso } from './auditService.js';
import { fetchSanitizedUserById, fetchUserRowById, mapUserRow } from './userMapper.js';

function normalizeIsActive(value) {
  if (value === undefined) return undefined;
  return value === true || value === 1 || value === '1' ? 1 : 0;
}

function assertForeignKeysExist(db, { roleId, positionId, departmentId }) {
  if (roleId !== undefined) {
    const role = db.prepare('SELECT id, name FROM roles WHERE id = ?').get(roleId);
    if (!role) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Wybrana rola nie istnieje');
    }
  }
  if (positionId !== undefined) {
    const pos = db.prepare('SELECT id FROM positions WHERE id = ?').get(positionId);
    if (!pos) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Wybrane stanowisko nie istnieje');
    }
  }
  if (departmentId !== undefined) {
    const dept = db.prepare('SELECT id FROM departments WHERE id = ?').get(departmentId);
    if (!dept) {
      throw new AppError(400, 'VALIDATION_ERROR', 'Wybrany dział nie istnieje');
    }
  }
}

export function listAdminUsers(filters = {}) {
  const db = getDb();
  const conditions = [];
  const params = [];

  if (filters.search) {
    const pattern = `%${filters.search}%`;
    conditions.push(
      "(u.first_name LIKE ? OR u.last_name LIKE ? OR u.email LIKE ? OR (u.first_name || ' ' || u.last_name) LIKE ?)"
    );
    params.push(pattern, pattern, pattern, pattern);
  }

  if (filters.role) {
    conditions.push('r.name = ?');
    params.push(filters.role);
  }

  if (filters.position_id !== undefined) {
    conditions.push('u.position_id = ?');
    params.push(filters.position_id);
  }

  if (filters.is_active !== undefined) {
    conditions.push('u.is_active = ?');
    params.push(normalizeIsActive(filters.is_active));
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const rows = db
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
        u.bio,
        u.phone,
        u.preferences_json,
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
        d.name AS department_name,
        (
          SELECT COUNT(DISTINCT t.id)
          FROM task_assignments ta
          JOIN tasks t ON t.id = ta.task_id
          WHERE ta.employee_id = u.id
            AND ta.assignment_status != 'rejected'
            AND t.deleted_at IS NULL
            AND t.status_id NOT IN (3, 4)
        ) AS active_tasks_count
      FROM users u
      JOIN roles r ON r.id = u.role_id
      JOIN positions p ON p.id = u.position_id
      LEFT JOIN departments d ON d.id = u.department_id
      ${whereClause}
      ORDER BY p.priority ASC, u.last_name ASC, u.first_name ASC
      `
    )
    .all(...params);

  const users = rows.map((row) => ({
    ...mapUserRow(row),
    active_tasks_count: Number(row.active_tasks_count ?? 0),
  }));

  return { users };
}

export async function createAdminUser({ actor, payload, ipAddress = null, userAgent = null }) {
  const db = getDb();
  const normalizedEmail = payload.email.trim().toLowerCase();

  const existing = db
    .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
    .get(normalizedEmail);
  if (existing) {
    throw new AppError(409, 'EMAIL_EXISTS', 'Użytkownik z tym adresem e-mail już istnieje');
  }

  assertForeignKeysExist(db, {
    roleId: payload.role_id,
    positionId: payload.position_id,
    departmentId: payload.department_id,
  });

  const passwordHash = await hashPassword(payload.password);
  const now = nowIso();
  const isActive = payload.is_active === undefined ? 1 : normalizeIsActive(payload.is_active);
  const phone = payload.phone && payload.phone.trim() !== '' ? payload.phone.trim() : null;
  const bio = payload.bio && payload.bio.trim() !== '' ? payload.bio.trim() : null;

  const userId = withTransaction((tx) => {
    const result = tx
      .prepare(
        `
        INSERT INTO users (
          first_name, last_name, email, password_hash,
          role_id, position_id, department_id, avatar_color,
          bio, phone, preferences_json, token_version, is_active,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, '{}', 1, ?, ?, ?)
        `
      )
      .run(
        payload.first_name.trim(),
        payload.last_name.trim(),
        normalizedEmail,
        passwordHash,
        payload.role_id,
        payload.position_id,
        payload.department_id,
        payload.avatar_color || '#6366f1',
        bio,
        phone,
        isActive,
        now,
        now
      );

    const newId = Number(result.lastInsertRowid);

    logAudit(tx, {
      actorUserId: actor.id,
      action: 'USER_CREATED',
      entityType: 'user',
      entityId: newId,
      details: {
        email: normalizedEmail,
        role_id: payload.role_id,
        position_id: payload.position_id,
        department_id: payload.department_id,
      },
      ipAddress,
      userAgent,
    });

    return newId;
  });

  return fetchSanitizedUserById(userId, db);
}

export async function updateAdminUser({
  actor,
  targetUserId,
  updates,
  ipAddress = null,
  userAgent = null,
}) {
  const db = getDb();
  const target = fetchUserRowById(targetUserId, db);
  if (!target) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Nie znaleziono użytkownika');
  }

  const providedKeys = Object.keys(updates).filter((k) => updates[k] !== undefined);

  if (actor.role === 'dyrektor') {
    if (target.role_name === 'admin' || target.role_name === 'dyrektor') {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Dyrektor nie może modyfikować kont administratorów ani dyrektorów'
      );
    }

    const forbiddenForDirector = providedKeys.filter(
      (k) => k !== 'position_id' && k !== 'department_id'
    );
    if (forbiddenForDirector.length > 0) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Dyrektor może zmieniać wyłącznie stanowisko i dział pracowników'
      );
    }
  } else if (actor.role !== 'admin') {
    throw new AppError(403, 'FORBIDDEN', 'Brak uprawnień do modyfikacji użytkownika');
  }

  assertForeignKeysExist(db, {
    roleId: updates.role_id,
    positionId: updates.position_id,
    departmentId: updates.department_id,
  });

  const nextIsActive =
    updates.is_active !== undefined ? normalizeIsActive(updates.is_active) : target.is_active;

  let nextRoleName = target.role_name;
  if (updates.role_id !== undefined && updates.role_id !== target.role_id) {
    const newRoleRow = db.prepare('SELECT name FROM roles WHERE id = ?').get(updates.role_id);
    nextRoleName = newRoleRow.name;
  }

  if (target.id === actor.id) {
    if (nextIsActive === 0) {
      throw new AppError(409, 'SELF_LOCKOUT', 'Nie możesz dezaktywować własnego konta');
    }
    if (nextRoleName !== 'admin') {
      throw new AppError(409, 'SELF_LOCKOUT', 'Nie możesz odebrać sobie roli administratora');
    }
  }

  if (
    target.role_name === 'admin' &&
    target.is_active === 1 &&
    (nextIsActive === 0 || nextRoleName !== 'admin')
  ) {
    const activeAdmins = db
      .prepare(
        `
        SELECT COUNT(*) AS cnt
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'admin' AND u.is_active = 1
        `
      )
      .get();

    if (Number(activeAdmins?.cnt ?? 0) <= 1) {
      throw new AppError(
        409,
        'LAST_ADMIN_PROTECTED',
        'Nie można dezaktywować ani zdegradować ostatniego aktywnego administratora'
      );
    }
  }

  if (updates.email !== undefined) {
    const normalizedEmail = updates.email.trim().toLowerCase();
    if (normalizedEmail !== target.email.toLowerCase()) {
      const emailOwner = db
        .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?) AND id != ?')
        .get(normalizedEmail, target.id);
      if (emailOwner) {
        throw new AppError(409, 'EMAIL_EXISTS', 'Podany adres e-mail jest już zajęty');
      }
    }
  }

  const setClauses = [];
  const params = [];
  const changedFields = [];

  if (updates.first_name !== undefined) {
    setClauses.push('first_name = ?');
    params.push(updates.first_name.trim());
    changedFields.push('first_name');
  }
  if (updates.last_name !== undefined) {
    setClauses.push('last_name = ?');
    params.push(updates.last_name.trim());
    changedFields.push('last_name');
  }
  if (updates.email !== undefined) {
    setClauses.push('email = ?');
    params.push(updates.email.trim().toLowerCase());
    changedFields.push('email');
  }
  if (updates.role_id !== undefined) {
    setClauses.push('role_id = ?');
    params.push(updates.role_id);
    changedFields.push('role_id');
  }
  if (updates.position_id !== undefined) {
    setClauses.push('position_id = ?');
    params.push(updates.position_id);
    changedFields.push('position_id');
  }
  if (updates.department_id !== undefined) {
    setClauses.push('department_id = ?');
    params.push(updates.department_id);
    changedFields.push('department_id');
  }
  if (updates.phone !== undefined) {
    setClauses.push('phone = ?');
    params.push(updates.phone && updates.phone.trim() !== '' ? updates.phone.trim() : null);
    changedFields.push('phone');
  }
  if (updates.bio !== undefined) {
    setClauses.push('bio = ?');
    params.push(updates.bio && updates.bio.trim() !== '' ? updates.bio.trim() : null);
    changedFields.push('bio');
  }
  if (updates.avatar_color !== undefined) {
    setClauses.push('avatar_color = ?');
    params.push(updates.avatar_color);
    changedFields.push('avatar_color');
  }
  if (updates.is_active !== undefined) {
    setClauses.push('is_active = ?');
    params.push(nextIsActive);
    changedFields.push('is_active');
  }

  let passwordReset = false;
  if (updates.password !== undefined) {
    const newHash = await hashPassword(updates.password);
    setClauses.push('password_hash = ?');
    params.push(newHash);
    changedFields.push('password');
    passwordReset = true;
  }

  const roleChanged = updates.role_id !== undefined && updates.role_id !== target.role_id;
  const deactivated = updates.is_active !== undefined && nextIsActive === 0 && target.is_active === 1;
  const shouldInvalidateSessions = deactivated || roleChanged || passwordReset;

  if (shouldInvalidateSessions) {
    setClauses.push('token_version = token_version + 1');
  }

  if (setClauses.length > 0) {
    const now = nowIso();
    setClauses.push('updated_at = ?');
    params.push(now, target.id);

    withTransaction((tx) => {
      tx.prepare(`UPDATE users SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

      if (shouldInvalidateSessions) {
        tx.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(
          now,
          target.id
        );
      }

      if (roleChanged) {
        logAudit(tx, {
          actorUserId: actor.id,
          action: 'ROLE_CHANGED',
          entityType: 'user',
          entityId: target.id,
          details: {
            from_role_id: target.role_id,
            to_role_id: updates.role_id,
            from_role: target.role_name,
            to_role: nextRoleName,
          },
          ipAddress,
          userAgent,
        });
      }

      logAudit(tx, {
        actorUserId: actor.id,
        action: 'USER_UPDATED',
        entityType: 'user',
        entityId: target.id,
        details: {
          updated_fields: changedFields,
          sessions_revoked: shouldInvalidateSessions,
        },
        ipAddress,
        userAgent,
      });
    });
  }

  return fetchSanitizedUserById(target.id, db);
}

export function deactivateAdminUser({
  actor,
  targetUserId,
  ipAddress = null,
  userAgent = null,
}) {
  const db = getDb();
  const target = fetchUserRowById(targetUserId, db);
  if (!target) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Nie znaleziono użytkownika');
  }

  if (target.id === actor.id) {
    throw new AppError(409, 'SELF_LOCKOUT', 'Nie możesz dezaktywować własnego konta');
  }

  if (target.role_name === 'admin' && target.is_active === 1) {
    const activeAdmins = db
      .prepare(
        `
        SELECT COUNT(*) AS cnt
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE r.name = 'admin' AND u.is_active = 1
        `
      )
      .get();

    if (Number(activeAdmins?.cnt ?? 0) <= 1) {
      throw new AppError(
        409,
        'LAST_ADMIN_PROTECTED',
        'Nie można dezaktywować ostatniego aktywnego administratora'
      );
    }
  }

  const now = nowIso();

  withTransaction((tx) => {
    tx.prepare(
      'UPDATE users SET is_active = 0, token_version = token_version + 1, updated_at = ? WHERE id = ?'
    ).run(now, target.id);

    tx.prepare('UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND revoked_at IS NULL').run(
      now,
      target.id
    );

    logAudit(tx, {
      actorUserId: actor.id,
      action: 'USER_DEACTIVATED',
      entityType: 'user',
      entityId: target.id,
      details: { email: target.email },
      ipAddress,
      userAgent,
    });
  });

  return fetchSanitizedUserById(target.id, db);
}
