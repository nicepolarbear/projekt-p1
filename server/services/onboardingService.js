import crypto from 'node:crypto';
import { getDb, withTransaction } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { hashPassword } from '../utils/crypto.js';
import { logAudit, nowIso } from './auditService.js';
import { createSessionForUserId } from './authService.js';
import { fetchSanitizedUserById } from './userMapper.js';

export async function checkSlugAvailable(rawSlug, db = getDb()) {
  const slug = (rawSlug || '').trim().toLowerCase();
  if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
    throw new AppError(
      400,
      'INVALID_SLUG',
      'Identyfikator organizacji może zawierać tylko małe litery, cyfry i pojedyncze myślniki'
    );
  }

  const existing = await db
    .prepare('SELECT id FROM organizations WHERE slug = ?')
    .get(slug);

  return {
    available: !existing,
    slug,
  };
}

export async function registerIndividual(
  { first_name, last_name, email, password },
  clientMeta = {},
  db = getDb()
) {
  const normalizedEmail = email.trim().toLowerCase();

  const existing = await db
    .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
    .get(normalizedEmail);

  if (existing) {
    throw new AppError(409, 'DUPLICATE_EMAIL', 'Adres e-mail jest już zajęty');
  }

  const passwordHash = await hashPassword(password);
  const now = nowIso();

  let newUserId;
  await withTransaction(async (tx) => {
    const stmt = tx.prepare(`
      INSERT INTO users (
        first_name, last_name, email, password_hash,
        role_id, position_id, department_id, organization_id,
        account_type, avatar_color, bio, phone, preferences_json,
        token_version, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, NULL, NULL, NULL, NULL, 'individual_reporter', '#6366f1', NULL, NULL, '{}', 1, 1, ?, ?)
    `);

    const info = await stmt.run(
      first_name.trim(),
      last_name.trim(),
      normalizedEmail,
      passwordHash,
      now,
      now
    );
    newUserId = Number(info.lastInsertRowid);

    await logAudit(tx, {
      actorUserId: newUserId,
      action: 'USER_REGISTER_INDIVIDUAL',
      entityType: 'user',
      entityId: newUserId,
      details: { email: normalizedEmail },
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
    });
  });

  const { signedToken, ttlMs } = await createSessionForUserId(newUserId, clientMeta, db);
  const user = await fetchSanitizedUserById(newUserId, db);

  return { user, signedToken, ttlMs };
}

export async function createOrganization(
  { first_name, last_name, email, password, org_name, org_slug, industry, size },
  clientMeta = {},
  db = getDb()
) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedSlug = (org_slug || org_name)
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');

  if (!normalizedSlug || normalizedSlug.length < 2) {
    throw new AppError(400, 'INVALID_SLUG', 'Nieprawidłowy slug organizacji');
  }

  const existingEmail = await db
    .prepare('SELECT id FROM users WHERE LOWER(email) = LOWER(?)')
    .get(normalizedEmail);
  if (existingEmail) {
    throw new AppError(409, 'DUPLICATE_EMAIL', 'Adres e-mail jest już zajęty');
  }

  const existingSlug = await db
    .prepare('SELECT id FROM organizations WHERE slug = ?')
    .get(normalizedSlug);
  if (existingSlug) {
    throw new AppError(409, 'DUPLICATE_SLUG', 'Organizacja o tym identyfikatorze już istnieje');
  }

  const passwordHash = await hashPassword(password);
  const now = nowIso();

  let orgId;
  let newUserId;

  await withTransaction(async (tx) => {
    // 1. Insert organization
    const orgInfo = await tx
      .prepare(`
        INSERT INTO organizations (name, slug, industry, size, created_by_user_id, created_at)
        VALUES (?, ?, ?, ?, NULL, ?)
      `)
      .run(
        org_name.trim(),
        normalizedSlug,
        industry ? industry.trim() : null,
        size ? size.trim() : null,
        now
      );
    orgId = Number(orgInfo.lastInsertRowid);

    // 2. Insert admin user for organization
    const userInfo = await tx
      .prepare(`
        INSERT INTO users (
          first_name, last_name, email, password_hash,
          role_id, position_id, department_id, organization_id,
          account_type, avatar_color, bio, phone, preferences_json,
          token_version, is_active, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, 5, 4, ?, 'business_user', '#6366f1', NULL, NULL, '{}', 1, 1, ?, ?)
      `)
      .run(
        first_name.trim(),
        last_name.trim(),
        normalizedEmail,
        passwordHash,
        orgId,
        now,
        now
      );
    newUserId = Number(userInfo.lastInsertRowid);

    // 3. Update organization creator
    await tx.prepare('UPDATE organizations SET created_by_user_id = ? WHERE id = ?').run(
      newUserId,
      orgId
    );

    // 4. Insert into organization_members
    await tx.prepare(`
      INSERT INTO organization_members (
        organization_id, user_id, role_id, position_id, department_id, status, joined_at
      ) VALUES (?, ?, 1, 5, 4, 'active', ?)
    `).run(orgId, newUserId, now);

    // 5. Create initial application for organization
    await tx.prepare(`
      INSERT INTO applications (
        organization_id, name, url, description, is_active, created_at
      ) VALUES (?, ?, ?, ?, 1, ?)
    `).run(
      orgId,
      `${org_name.trim()} - Portal`,
      `https://${normalizedSlug}.firma.pl`,
      'Główny portal firmowy i monitorowane aplikacje',
      now
    );

    // 6. Generate initial join code
    const initialCode = `TF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    await tx.prepare(`
      INSERT INTO invitation_codes (
        organization_id, code, created_by_user_id, suggested_position_id,
        max_uses, uses_count, is_active, created_at
      ) VALUES (?, ?, ?, 4, 10, 0, 1, ?)
    `).run(orgId, initialCode, newUserId, now);

    await logAudit(tx, {
      actorUserId: newUserId,
      action: 'ORGANIZATION_CREATE',
      entityType: 'organization',
      entityId: orgId,
      details: { name: org_name, slug: normalizedSlug },
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
    });
  });

  const { signedToken, ttlMs } = await createSessionForUserId(newUserId, clientMeta, db);
  const user = await fetchSanitizedUserById(newUserId, db);
  const org = await db.prepare('SELECT id, name, slug, industry, size, created_at FROM organizations WHERE id = ?').get(orgId);

  return { user, organization: org, signedToken, ttlMs };
}

export async function verifyJoinCode(rawCode, db = getDb()) {
  const code = (rawCode || '').trim().toUpperCase();
  if (!code) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Kod zaproszenia jest wymagany');
  }

  const row = await db
    .prepare(`
      SELECT
        ic.id,
        ic.organization_id,
        ic.code,
        ic.suggested_position_id,
        ic.max_uses,
        ic.uses_count,
        ic.is_active,
        o.name AS organization_name,
        o.slug AS organization_slug,
        p.name AS suggested_position_name
      FROM invitation_codes ic
      JOIN organizations o ON o.id = ic.organization_id
      LEFT JOIN positions p ON p.id = ic.suggested_position_id
      WHERE UPPER(ic.code) = ?
    `)
    .get(code);

  if (!row) {
    throw new AppError(404, 'INVALID_CODE', 'Nie znaleziono takiego kodu zaproszenia');
  }

  if (row.is_active !== 1 || row.uses_count >= row.max_uses) {
    throw new AppError(400, 'CODE_EXPIRED', 'Kod zaproszenia wygasł lub został już wykorzystany');
  }

  return {
    valid: true,
    code: row.code,
    organization: {
      id: row.organization_id,
      name: row.organization_name,
      slug: row.organization_slug,
    },
    suggested_position: row.suggested_position_name || null,
  };
}

export async function joinWithCode(
  { code: rawCode, first_name, last_name, email, password },
  clientMeta = {},
  db = getDb()
) {
  const code = (rawCode || '').trim().toUpperCase();
  const normalizedEmail = email.trim().toLowerCase();

  const codeRow = await db
    .prepare(`
      SELECT
        ic.id,
        ic.organization_id,
        ic.suggested_position_id,
        ic.max_uses,
        ic.uses_count,
        ic.is_active,
        o.name AS organization_name
      FROM invitation_codes ic
      JOIN organizations o ON o.id = ic.organization_id
      WHERE UPPER(ic.code) = ?
    `)
    .get(code);

  if (!codeRow) {
    throw new AppError(404, 'INVALID_CODE', 'Nie znaleziono kodu zaproszenia');
  }

  if (codeRow.is_active !== 1 || codeRow.uses_count >= codeRow.max_uses) {
    throw new AppError(400, 'CODE_EXPIRED', 'Kod zaproszenia wygasł lub został już wykorzystany');
  }

  const existingUser = await db
    .prepare('SELECT id, is_active, organization_id, account_type FROM users WHERE LOWER(email) = LOWER(?)')
    .get(normalizedEmail);

  if (existingUser) {
    if (existingUser.organization_id === codeRow.organization_id) {
      throw new AppError(400, 'ALREADY_MEMBER', 'Jesteś już członkiem tej organizacji lub Twój wniosek oczekuje na zatwierdzenie');
    }
    throw new AppError(409, 'DUPLICATE_EMAIL', 'Adres e-mail jest już zajęty w systemie');
  }

  const passwordHash = await hashPassword(password);
  const now = nowIso();
  const assignedPositionId = codeRow.suggested_position_id || 4; // default to Junior Developer

  await withTransaction(async (tx) => {
    // 1. Create user in pending state (is_active = 0)
    const userStmt = tx.prepare(`
      INSERT INTO users (
        first_name, last_name, email, password_hash,
        role_id, position_id, department_id, organization_id,
        account_type, avatar_color, bio, phone, preferences_json,
        token_version, is_active, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 4, ?, 3, ?, 'business_user', '#6366f1', NULL, NULL, '{}', 1, 0, ?, ?)
    `);

    const userInfo = await userStmt.run(
      first_name.trim(),
      last_name.trim(),
      normalizedEmail,
      passwordHash,
      assignedPositionId,
      codeRow.organization_id,
      now,
      now
    );
    const newUserId = Number(userInfo.lastInsertRowid);

    // 2. Insert organization member with status 'pending_approval'
    await tx.prepare(`
      INSERT INTO organization_members (
        organization_id, user_id, role_id, position_id, department_id, status, joined_at
      ) VALUES (?, ?, 4, ?, 3, 'pending_approval', ?)
    `).run(codeRow.organization_id, newUserId, assignedPositionId, now);

    // 3. Insert join_request
    await tx.prepare(`
      INSERT INTO join_requests (
        organization_id, user_id, invitation_code_id, status, assigned_position_id, created_at
      ) VALUES (?, ?, ?, 'pending', ?, ?)
    `).run(codeRow.organization_id, newUserId, codeRow.id, assignedPositionId, now);

    // 4. Update invitation_code usage
    const newCount = codeRow.uses_count + 1;
    const stillActive = newCount < codeRow.max_uses ? 1 : 0;
    await tx.prepare(`
      UPDATE invitation_codes
      SET uses_count = ?, is_active = ?
      WHERE id = ?
    `).run(newCount, stillActive, codeRow.id);

    await logAudit(tx, {
      actorUserId: newUserId,
      action: 'JOIN_REQUEST_SUBMITTED',
      entityType: 'join_request',
      entityId: newUserId,
      details: {
        organization_id: codeRow.organization_id,
        organization_name: codeRow.organization_name,
        code,
      },
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
    });
  });

  return {
    pending: true,
    message: 'Oczekiwanie na zatwierdzenie przez Administratora lub Dyrektora',
  };
}

export async function listJoinCodes(orgId, db = getDb()) {
  return await db
    .prepare(`
      SELECT
        ic.id,
        ic.organization_id,
        ic.code,
        ic.suggested_position_id,
        ic.max_uses,
        ic.uses_count,
        ic.is_active,
        ic.created_at,
        p.name AS suggested_position_name,
        u.first_name || ' ' || u.last_name AS created_by_name
      FROM invitation_codes ic
      LEFT JOIN positions p ON p.id = ic.suggested_position_id
      LEFT JOIN users u ON u.id = ic.created_by_user_id
      WHERE ic.organization_id = ?
      ORDER BY ic.created_at DESC
    `)
    .all(orgId);
}

export async function generateJoinCode(
  orgId,
  actorUserId,
  { suggested_position_id = null, max_uses = 1 } = {},
  clientMeta = {},
  db = getDb()
) {
  const code = `TF-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
  const now = nowIso();

  const stmt = db.prepare(`
    INSERT INTO invitation_codes (
      organization_id, code, created_by_user_id, suggested_position_id,
      max_uses, uses_count, is_active, created_at
    ) VALUES (?, ?, ?, ?, ?, 0, 1, ?)
  `);

  const info = await stmt.run(
    orgId,
    code,
    actorUserId,
    suggested_position_id || null,
    max_uses || 1,
    now
  );

  const created = await db
    .prepare(`
      SELECT
        ic.*,
        p.name AS suggested_position_name
      FROM invitation_codes ic
      LEFT JOIN positions p ON p.id = ic.suggested_position_id
      WHERE ic.id = ?
    `)
    .get(info.lastInsertRowid);

  await logAudit(db, {
    actorUserId,
    action: 'INVITATION_CODE_GENERATE',
    entityType: 'invitation_code',
    entityId: created.id,
    details: { code: created.code, max_uses },
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
  });

  return created;
}

export async function listJoinRequests(orgId, db = getDb()) {
  return await db
    .prepare(`
      SELECT
        jr.id,
        jr.organization_id,
        jr.user_id,
        jr.invitation_code_id,
        jr.status,
        jr.assigned_position_id,
        jr.created_at,
        jr.reviewed_at,
        u.first_name,
        u.last_name,
        u.email,
        u.avatar_color,
        p.name AS assigned_position_name,
        ic.code AS invitation_code
      FROM join_requests jr
      JOIN users u ON u.id = jr.user_id
      LEFT JOIN positions p ON p.id = jr.assigned_position_id
      LEFT JOIN invitation_codes ic ON ic.id = jr.invitation_code_id
      WHERE jr.organization_id = ?
      ORDER BY CASE WHEN jr.status = 'pending' THEN 0 ELSE 1 END, jr.created_at DESC
    `)
    .all(orgId);
}

export async function approveJoinRequest(
  requestId,
  actorUserId,
  orgId,
  { assigned_position_id = null, role_id = null } = {},
  clientMeta = {},
  db = getDb()
) {
  const jr = await db
    .prepare('SELECT * FROM join_requests WHERE id = ? AND organization_id = ?')
    .get(requestId, orgId);

  if (!jr) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono wniosku o dołączenie');
  }

  if (jr.status !== 'pending') {
    throw new AppError(400, 'ALREADY_REVIEWED', 'Wniosek został już rozpatrzony');
  }

  const finalPositionId = assigned_position_id || jr.assigned_position_id || 4;
  const finalRoleId = role_id || 4; // pracownik
  const now = nowIso();

  await withTransaction(async (tx) => {
    // 1. Update request
    await tx.prepare(`
      UPDATE join_requests
      SET status = 'approved',
          reviewed_by_user_id = ?,
          assigned_position_id = ?,
          reviewed_at = ?
      WHERE id = ?
    `).run(actorUserId, finalPositionId, now, requestId);

    // 2. Activate user
    await tx.prepare(`
      UPDATE users
      SET is_active = 1,
          position_id = ?,
          role_id = ?,
          updated_at = ?
      WHERE id = ?
    `).run(finalPositionId, finalRoleId, now, jr.user_id);

    // 3. Update organization member status
    await tx.prepare(`
      UPDATE organization_members
      SET status = 'active',
          position_id = ?,
          role_id = ?
      WHERE organization_id = ? AND user_id = ?
    `).run(finalPositionId, finalRoleId, orgId, jr.user_id);

    await logAudit(tx, {
      actorUserId,
      action: 'JOIN_REQUEST_APPROVED',
      entityType: 'join_request',
      entityId: requestId,
      details: { user_id: jr.user_id, position_id: finalPositionId },
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
    });
  });

  return { success: true, request_id: requestId, status: 'approved' };
}

export async function rejectJoinRequest(
  requestId,
  actorUserId,
  orgId,
  clientMeta = {},
  db = getDb()
) {
  const jr = await db
    .prepare('SELECT * FROM join_requests WHERE id = ? AND organization_id = ?')
    .get(requestId, orgId);

  if (!jr) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono wniosku o dołączenie');
  }

  if (jr.status !== 'pending') {
    throw new AppError(400, 'ALREADY_REVIEWED', 'Wniosek został już rozpatrzony');
  }

  const now = nowIso();

  await withTransaction(async (tx) => {
    await tx.prepare(`
      UPDATE join_requests
      SET status = 'rejected',
          reviewed_by_user_id = ?,
          reviewed_at = ?
      WHERE id = ?
    `).run(actorUserId, now, requestId);

    await tx.prepare(`
      UPDATE organization_members
      SET status = 'pending_approval'
      WHERE organization_id = ? AND user_id = ?
    `).run(orgId, jr.user_id);

    await logAudit(tx, {
      actorUserId,
      action: 'JOIN_REQUEST_REJECTED',
      entityType: 'join_request',
      entityId: requestId,
      details: { user_id: jr.user_id },
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
    });
  });

  return { success: true, request_id: requestId, status: 'rejected' };
}
