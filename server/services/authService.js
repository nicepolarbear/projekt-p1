import crypto from 'node:crypto';
import { getDb, withTransaction } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { COOKIE_NAME } from '../utils/cookies.js';
import {
  dummyVerify,
  hashPassword,
  sha256Hex,
  signToken,
  verifyPassword,
  verifySignedToken,
} from '../utils/crypto.js';
import { logAudit, nowIso } from './auditService.js';
import {
  fetchSanitizedUserById,
  fetchUserRowByEmail,
  fetchUserRowById,
  mapUserRow,
} from './userMapper.js';

export const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

export async function login({ email, password, ipAddress = null, userAgent = null }) {
  const normalizedEmail = email.trim().toLowerCase();
  const db = getDb();
  const row = await fetchUserRowByEmail(normalizedEmail, db);

  if (!row) {
    await dummyVerify();
    await logAudit(db, {
      actorUserId: null,
      action: 'LOGIN_FAILED',
      entityType: 'auth',
      entityId: null,
      details: { email: normalizedEmail, reason: 'USER_NOT_FOUND' },
      ipAddress,
      userAgent,
    });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Nieprawidłowy adres e-mail lub hasło');
  }

  const passwordValid = await verifyPassword(password, row.password_hash);
  if (!passwordValid) {
    await logAudit(db, {
      actorUserId: row.id,
      action: 'LOGIN_FAILED',
      entityType: 'auth',
      entityId: row.id,
      details: { email: row.email, reason: 'INVALID_PASSWORD' },
      ipAddress,
      userAgent,
    });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Nieprawidłowy adres e-mail lub hasło');
  }

  if (row.is_active !== 1) {
    await logAudit(db, {
      actorUserId: row.id,
      action: 'LOGIN_FAILED',
      entityType: 'auth',
      entityId: row.id,
      details: { email: row.email, reason: 'ACCOUNT_INACTIVE' },
      ipAddress,
      userAgent,
    });
    throw new AppError(401, 'INVALID_CREDENTIALS', 'Nieprawidłowy adres e-mail lub hasło');
  }

  const sessionId = crypto.randomUUID();
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256Hex(rawToken);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString().replace(/\.\d{3}Z$/, 'Z');

  await withTransaction(async (tx) => {
    await tx.prepare(
      `
      INSERT INTO sessions (
        id, user_id, token_hash, ip_address, user_agent, created_at, expires_at, last_seen_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `
    ).run(sessionId, row.id, tokenHash, ipAddress, userAgent, now, expiresAt, now);

    await tx.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(
      now,
      now,
      row.id
    );

    await logAudit(tx, {
      actorUserId: row.id,
      action: 'LOGIN_SUCCESS',
      entityType: 'session',
      entityId: sessionId,
      details: { email: row.email },
      ipAddress,
      userAgent,
    });
  });

  const signedToken = signToken({
    sid: sessionId,
    uid: row.id,
    tv: row.token_version,
  });

  const freshUser = (await fetchSanitizedUserById(row.id, db)) || mapUserRow(row);
  return { user: freshUser, signedToken, ttlMs: SESSION_TTL_MS };
}

export async function logout({ cookieToken, reqCookies, ipAddress = null, userAgent = null }) {
  const token = reqCookies?.[COOKIE_NAME] || cookieToken || null;
  if (!token) {
    return;
  }

  const payload = verifySignedToken(token);
  if (!payload || typeof payload.sid !== 'string' || typeof payload.uid !== 'number') {
    return;
  }

  const now = nowIso();

  await withTransaction(async (tx) => {
    const result = await tx
      .prepare(
        'UPDATE sessions SET revoked_at = ? WHERE id = ? AND user_id = ? AND revoked_at IS NULL'
      )
      .run(now, payload.sid, payload.uid);

    if (result.changes > 0) {
      await logAudit(tx, {
        actorUserId: payload.uid,
        action: 'LOGOUT',
        entityType: 'session',
        entityId: payload.sid,
        details: {},
        ipAddress,
        userAgent,
      });
    }
  });
}

export async function changePassword({
  userId,
  sessionId,
  currentPassword,
  newPassword,
  ipAddress = null,
  userAgent = null,
}) {
  if (currentPassword === newPassword) {
    throw new AppError(
      400,
      'VALIDATION_ERROR',
      'Nowe hasło musi różnić się od obecnego hasła'
    );
  }

  const db = getDb();
  const row = await fetchUserRowById(userId, db);
  if (!row || row.is_active !== 1) {
    throw new AppError(401, 'UNAUTHORIZED', 'Nie znaleziono aktywnego użytkownika');
  }

  const currentValid = await verifyPassword(currentPassword, row.password_hash);
  if (!currentValid) {
    throw new AppError(400, 'INVALID_PASSWORD', 'Obecne hasło jest nieprawidłowe');
  }

  const newHash = await hashPassword(newPassword);
  const now = nowIso();

  const newTokenVersion = await withTransaction(async (tx) => {
    await tx.prepare(
      'UPDATE users SET password_hash = ?, token_version = token_version + 1, updated_at = ? WHERE id = ?'
    ).run(newHash, now, userId);

    await tx.prepare(
      'UPDATE sessions SET revoked_at = ? WHERE user_id = ? AND id != ? AND revoked_at IS NULL'
    ).run(now, userId, sessionId);

    const updated = await tx.prepare('SELECT token_version FROM users WHERE id = ?').get(userId);

    await logAudit(tx, {
      actorUserId: userId,
      action: 'PASSWORD_CHANGED',
      entityType: 'user',
      entityId: userId,
      details: { revoked_other_sessions: true },
      ipAddress,
      userAgent,
    });

    return updated.token_version;
  });

  const signedToken = signToken({
    sid: sessionId,
    uid: userId,
    tv: newTokenVersion,
  });

  return { signedToken, ttlMs: SESSION_TTL_MS };
}

export async function createSessionForUserId(
  userId,
  { ipAddress = null, userAgent = null } = {},
  db = getDb()
) {
  const sessionId = crypto.randomUUID();
  const rawToken = crypto.randomBytes(32).toString('base64url');
  const tokenHash = sha256Hex(rawToken);
  const now = nowIso();
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS).toISOString().replace(/\.\d{3}Z$/, 'Z');

  const row = await db.prepare('SELECT id, token_version FROM users WHERE id = ?').get(userId);
  if (!row) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono użytkownika');
  }

  await db.prepare(
    `
    INSERT INTO sessions (
      id, user_id, token_hash, ip_address, user_agent, created_at, expires_at, last_seen_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `
  ).run(sessionId, userId, tokenHash, ipAddress, userAgent, now, expiresAt, now);

  await db.prepare('UPDATE users SET last_login_at = ?, updated_at = ? WHERE id = ?').run(
    now,
    now,
    userId
  );

  const signedToken = signToken({
    sid: sessionId,
    uid: userId,
    tv: row.token_version,
  });

  return { signedToken, ttlMs: SESSION_TTL_MS };
}
