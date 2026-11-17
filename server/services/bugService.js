import { getDb, withTransaction } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { logAudit, nowIso } from './auditService.js';
import { recordLiveEvent } from './eventsService.js';

export async function getPublicApplications(db = getDb()) {
  return await db
    .prepare(
      `
      SELECT
        a.id,
        a.organization_id,
        a.name,
        a.url,
        a.description,
        o.name AS organization_name,
        o.slug AS organization_slug
      FROM applications a
      JOIN organizations o ON o.id = a.organization_id
      WHERE a.is_active = 1
      ORDER BY a.organization_id ASC, a.name ASC
      `
    )
    .all();
}

async function generateTrackingCode(db) {
  for (let attempts = 0; attempts < 10; attempts++) {
    const num = Math.floor(1000 + Math.random() * 9000);
    const code = `BUG-${num}`;
    const exists = await db
      .prepare('SELECT id FROM bug_reports WHERE tracking_code = ?')
      .get(code);
    if (!exists) {
      return code;
    }
  }
  return `BUG-${Date.now().toString().slice(-6)}`;
}

export async function submitBugReport(data, actorUser = null, clientMeta = {}, db = getDb()) {
  const title = (data.title || '').trim();
  const description = (data.description || '').trim();
  if (!title || !description) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Tytuł i opis błędu są wymagane');
  }

  let organizationId = data.organization_id;
  let applicationId = data.application_id || null;

  if (applicationId) {
    const app = await db.prepare('SELECT organization_id FROM applications WHERE id = ?').get(applicationId);
    if (app) {
      organizationId = app.organization_id;
    }
  }

  if (!organizationId) {
    if (actorUser?.organization_id) {
      organizationId = actorUser.organization_id;
    } else {
      const firstOrg = await db.prepare('SELECT id FROM organizations ORDER BY id ASC LIMIT 1').get();
      organizationId = firstOrg ? firstOrg.id : 1;
    }
  }

  const isAnonymous = Boolean(data.is_anonymous);
  let reporterUserId = null;
  let guestEmail = null;
  let guestName = null;

  if (isAnonymous) {
    guestName = 'Anonim';
  } else if (actorUser) {
    reporterUserId = actorUser.id;
    guestName = `${actorUser.first_name} ${actorUser.last_name}`;
    guestEmail = actorUser.email;
  } else {
    guestName = (data.guest_name || '').trim() || 'Gość';
    guestEmail = (data.guest_email || '').trim() || null;
  }

  const validSeverities = ['low', 'normal', 'high', 'critical'];
  const severity = validSeverities.includes(data.severity) ? data.severity : 'normal';
  const trackingCode = await generateTrackingCode(db);
  const now = nowIso();

  const stmt = db.prepare(`
    INSERT INTO bug_reports (
      organization_id, application_id, custom_url, reporter_user_id,
      guest_email, guest_name, is_anonymous, title, description,
      attachment_url, severity, status, tracking_code, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'new', ?, ?, ?)
  `);

  const info = await stmt.run(
    organizationId,
    applicationId,
    data.custom_url ? data.custom_url.trim() : null,
    reporterUserId,
    guestEmail,
    guestName,
    isAnonymous ? 1 : 0,
    title,
    description,
    data.attachment_url ? data.attachment_url.trim() : null,
    severity,
    trackingCode,
    now,
    now
  );

  const bugId = Number(info.lastInsertRowid);

  await logAudit(db, {
    actorUserId: reporterUserId,
    action: 'BUG_REPORT_SUBMIT',
    entityType: 'bug_report',
    entityId: bugId,
    details: { tracking_code: trackingCode, severity, organization_id: organizationId },
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
  });

  return {
    success: true,
    bug_id: bugId,
    tracking_code: trackingCode,
  };
}

export async function getMyBugs(userId, db = getDb()) {
  return await db
    .prepare(
      `
      SELECT
        b.id,
        b.organization_id,
        b.application_id,
        b.custom_url,
        b.title,
        b.description,
        b.attachment_url,
        b.severity,
        b.status,
        b.rejection_reason,
        b.tracking_code,
        b.created_at,
        b.updated_at,
        a.name AS application_name,
        o.name AS organization_name,
        (SELECT COUNT(*) FROM bug_comments WHERE bug_report_id = b.id) AS comments_count
      FROM bug_reports b
      LEFT JOIN applications a ON a.id = b.application_id
      LEFT JOIN organizations o ON o.id = b.organization_id
      WHERE b.reporter_user_id = ?
      ORDER BY b.created_at DESC
      `
    )
    .all(userId);
}

export async function trackBugByCode(rawCode, db = getDb()) {
  const code = (rawCode || '').trim().toUpperCase();
  const bug = await db
    .prepare(
      `
      SELECT
        b.id,
        b.organization_id,
        b.application_id,
        b.custom_url,
        b.reporter_user_id,
        b.guest_name,
        b.is_anonymous,
        b.title,
        b.description,
        b.attachment_url,
        b.severity,
        b.status,
        b.rejection_reason,
        b.tracking_code,
        b.created_at,
        b.updated_at,
        a.name AS application_name,
        a.url AS application_url,
        o.name AS organization_name
      FROM bug_reports b
      LEFT JOIN applications a ON a.id = b.application_id
      LEFT JOIN organizations o ON o.id = b.organization_id
      WHERE UPPER(b.tracking_code) = ?
      `
    )
    .get(code);

  if (!bug) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono zgłoszenia o podanym kodzie');
  }

  const comments = await db
    .prepare(
      `
      SELECT
        id,
        bug_report_id,
        user_id,
        author_name,
        is_staff,
        content,
        created_at
      FROM bug_comments
      WHERE bug_report_id = ?
      ORDER BY created_at ASC
      `
    )
    .all(bug.id);

  const linkedTasks = await db
    .prepare(
      `
      SELECT
        t.id,
        t.title,
        ts.name AS status_name
      FROM bug_task_links btl
      JOIN tasks t ON t.id = btl.task_id
      JOIN task_statuses ts ON ts.id = t.status_id
      WHERE btl.bug_report_id = ?
      `
    )
    .all(bug.id);

  return {
    bug: {
      ...bug,
      is_anonymous: Boolean(bug.is_anonymous),
    },
    comments: comments.map((c) => ({
      ...c,
      is_staff: Boolean(c.is_staff),
    })),
    linked_tasks: linkedTasks,
  };
}

export async function addPublicComment(
  rawCode,
  { content, author_name },
  actorUser = null,
  clientMeta = {},
  db = getDb()
) {
  const code = (rawCode || '').trim().toUpperCase();
  const bug = await db
    .prepare('SELECT id, organization_id, guest_name FROM bug_reports WHERE UPPER(tracking_code) = ?')
    .get(code);

  if (!bug) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono zgłoszenia');
  }

  const cleanContent = (content || '').trim();
  if (!cleanContent) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Treść komentarza jest wymagana');
  }

  let finalAuthorName = (author_name || '').trim();
  let userId = null;
  let isStaff = 0;

  if (actorUser) {
    userId = actorUser.id;
    finalAuthorName = `${actorUser.first_name} ${actorUser.last_name}`;
    isStaff = actorUser.organization_id === bug.organization_id ? 1 : 0;
  } else if (!finalAuthorName) {
    finalAuthorName = bug.guest_name || 'Użytkownik';
  }

  const now = nowIso();

  const stmt = db.prepare(`
    INSERT INTO bug_comments (bug_report_id, user_id, author_name, is_staff, content, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const info = await stmt.run(bug.id, userId, finalAuthorName, isStaff, cleanContent, now);

  await db.prepare('UPDATE bug_reports SET updated_at = ? WHERE id = ?').run(now, bug.id);

  const comment = {
    id: Number(info.lastInsertRowid),
    bug_report_id: bug.id,
    user_id: userId,
    author_name: finalAuthorName,
    is_staff: Boolean(isStaff),
    content: cleanContent,
    created_at: now,
  };

  await logAudit(db, {
    actorUserId: userId,
    action: 'BUG_COMMENT_ADD',
    entityType: 'bug_comment',
    entityId: comment.id,
    details: { bug_report_id: bug.id, is_staff: Boolean(isStaff) },
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
  });

  return { success: true, comment };
}

export async function getOrganizationBugs(orgId, filters = {}, db = getDb()) {
  const whereClauses = ['b.organization_id = ?'];
  const params = [orgId];

  if (filters.status) {
    whereClauses.push('b.status = ?');
    params.push(filters.status);
  }

  if (filters.severity) {
    whereClauses.push('b.severity = ?');
    params.push(filters.severity);
  }

  if (filters.application_id) {
    whereClauses.push('b.application_id = ?');
    params.push(Number(filters.application_id));
  }

  if (filters.search) {
    whereClauses.push(
      '(b.title ILIKE ? OR b.tracking_code ILIKE ? OR b.description ILIKE ? OR b.guest_email ILIKE ?)'
    );
    const pattern = `%${filters.search.trim()}%`;
    params.push(pattern, pattern, pattern, pattern);
  }

  const sql = `
    SELECT
      b.id,
      b.organization_id,
      b.application_id,
      b.custom_url,
      b.reporter_user_id,
      b.guest_email,
      b.guest_name,
      b.is_anonymous,
      b.title,
      b.description,
      b.attachment_url,
      b.severity,
      b.status,
      b.rejection_reason,
      b.tracking_code,
      b.created_at,
      b.updated_at,
      a.name AS application_name,
      u.first_name AS reporter_first_name,
      u.last_name AS reporter_last_name,
      u.email AS reporter_email,
      (SELECT COUNT(*) FROM bug_comments WHERE bug_report_id = b.id) AS comments_count,
      (SELECT btl.task_id FROM bug_task_links btl WHERE btl.bug_report_id = b.id LIMIT 1) AS linked_task_id
    FROM bug_reports b
    LEFT JOIN applications a ON a.id = b.application_id
    LEFT JOIN users u ON u.id = b.reporter_user_id
    WHERE ${whereClauses.join(' AND ')}
    ORDER BY
      CASE b.severity
        WHEN 'critical' THEN 1
        WHEN 'high' THEN 2
        WHEN 'normal' THEN 3
        WHEN 'low' THEN 4
      END ASC,
      b.created_at DESC
  `;

  return await db.prepare(sql).all(...params);
}

export async function updateBugStatus(
  bugId,
  orgId,
  { status, rejection_reason = null },
  actorUser,
  clientMeta = {},
  db = getDb()
) {
  const bug = await db
    .prepare('SELECT * FROM bug_reports WHERE id = ? AND organization_id = ?')
    .get(bugId, orgId);

  if (!bug) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono zgłoszenia');
  }

  const validStatuses = ['new', 'in_analysis', 'in_progress', 'resolved', 'rejected'];
  if (!validStatuses.includes(status)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy status zgłoszenia');
  }

  const now = nowIso();
  const reason = status === 'rejected' && rejection_reason ? rejection_reason.trim() : null;

  await withTransaction(async (tx) => {
    await tx.prepare(
      `
      UPDATE bug_reports
      SET status = ?, rejection_reason = ?, updated_at = ?
      WHERE id = ?
      `
    ).run(status, reason, now, bugId);

    const statusLabels = {
      new: 'Nowe',
      in_analysis: 'W analizie',
      in_progress: 'W realizacji',
      resolved: 'Rozwiązane',
      rejected: 'Odrzucone',
    };

    let commentText = `Status zgłoszenia zmieniony na: ${statusLabels[status] || status}.`;
    if (reason) {
      commentText += ` Powód: ${reason}`;
    }

    await tx.prepare(
      `
      INSERT INTO bug_comments (bug_report_id, user_id, author_name, is_staff, content, created_at)
      VALUES (?, ?, ?, 1, ?, ?)
      `
    ).run(
      bugId,
      actorUser.id,
      `${actorUser.first_name} ${actorUser.last_name}`,
      commentText,
      now
    );

    await logAudit(tx, {
      actorUserId: actorUser.id,
      action: 'BUG_STATUS_CHANGE',
      entityType: 'bug_report',
      entityId: bugId,
      details: { old_status: bug.status, new_status: status, rejection_reason: reason },
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
    });
  });

  const updated = await db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(bugId);
  return { success: true, bug: updated };
}

export async function convertBugToTask(
  bugId,
  orgId,
  taskData = {},
  actorUser,
  clientMeta = {},
  db = getDb()
) {
  const bug = await db
    .prepare('SELECT * FROM bug_reports WHERE id = ? AND organization_id = ?')
    .get(bugId, orgId);

  if (!bug) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono zgłoszenia');
  }

  const existingLink = await db
    .prepare('SELECT task_id FROM bug_task_links WHERE bug_report_id = ?')
    .get(bugId);

  if (existingLink) {
    throw new AppError(400, 'ALREADY_CONVERTED', 'Zgłoszenie zostało już powiązane z zadaniem');
  }

  const now = nowIso();
  const taskTitle = (taskData.title || `[${bug.tracking_code}] ${bug.title}`).trim();
  const taskShortDesc = (taskData.short_desc || `Zgłoszenie ${bug.tracking_code}`).trim();
  let taskFullDesc = taskData.full_desc
    ? taskData.full_desc.trim()
    : `Zgłoszenie błędu: ${bug.tracking_code}\n\nOpis błędu:\n${bug.description}`;

  if (bug.custom_url) {
    taskFullDesc += `\n\nDotyczy URL: ${bug.custom_url}`;
  }

  let createdTask;
  await withTransaction(async (tx) => {
    // 1. Create task
    const taskStmt = tx.prepare(`
      INSERT INTO tasks (
        title, short_desc, full_desc, creator_id, status_id,
        due_date, created_at, updated_at
      ) VALUES (?, ?, ?, ?, 1, ?, ?, ?)
    `);

    const taskInfo = await taskStmt.run(
      taskTitle,
      taskShortDesc,
      taskFullDesc,
      actorUser.id,
      taskData.due_date || null,
      now,
      now
    );
    const taskId = Number(taskInfo.lastInsertRowid);

    // 2. Link task
    await tx.prepare(`
      INSERT INTO bug_task_links (bug_report_id, task_id, created_at)
      VALUES (?, ?, ?)
    `).run(bugId, taskId, now);

    // 3. Assign developer if provided
    if (taskData.employee_id) {
      const priorityId = Number.isInteger(taskData.priority_id) ? taskData.priority_id : 2;
      await tx.prepare(`
        INSERT INTO task_assignments (
          task_id, employee_id, assigned_by, priority_id,
          assignment_status, assigned_at
        ) VALUES (?, ?, ?, ?, 'accepted', ?)
      `).run(taskId, taskData.employee_id, actorUser.id, priorityId, now);
    }

    // 4. Update bug status to in_progress
    await tx.prepare(`
      UPDATE bug_reports
      SET status = 'in_progress', updated_at = ?
      WHERE id = ?
    `).run(now, bugId);

    // 5. Add staff comment to bug report
    await tx.prepare(`
      INSERT INTO bug_comments (bug_report_id, user_id, author_name, is_staff, content, created_at)
      VALUES (?, ?, ?, 1, ?, ?)
    `).run(
      bugId,
      actorUser.id,
      `${actorUser.first_name} ${actorUser.last_name}`,
      `Zgłoszenie zostało przekształcone w zadanie #${taskId} ("${taskTitle}").`,
      now
    );

    await logAudit(tx, {
      actorUserId: actorUser.id,
      action: 'BUG_CONVERT_TO_TASK',
      entityType: 'bug_report',
      entityId: bugId,
      details: { task_id: taskId, task_title: taskTitle },
      ipAddress: clientMeta.ipAddress,
      userAgent: clientMeta.userAgent,
    });

    const targetUserIds = taskData.employee_id
      ? Array.from(new Set([actorUser.id, taskData.employee_id]))
      : [actorUser.id];

    const actorFullName = `${actorUser.first_name || ''} ${actorUser.last_name || ''}`.trim() || 'Użytkownik';
    await recordLiveEvent(tx, {
      organizationId: orgId,
      eventType: 'BUG_CONVERTED_TO_TASK',
      entityType: 'task',
      entityId: taskId,
      actorId: actorUser.id,
      actorName: actorFullName,
      targetUserIds,
      title: 'Błąd przekształcony w zadanie',
      description: `${actorFullName} przekształcił zgłoszenie [${bug.tracking_code}] w zadanie: "${taskTitle}"`,
      payload: {
        taskId,
        taskTitle,
        trackingCode: bug.tracking_code,
        employeeId: taskData.employee_id || null,
      },
    });

    createdTask = await tx.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  });

  const updatedBug = await db.prepare('SELECT * FROM bug_reports WHERE id = ?').get(bugId);
  return { task: createdTask, bug: updatedBug };
}

export async function addStaffComment(
  bugId,
  orgId,
  { content },
  actorUser,
  clientMeta = {},
  db = getDb()
) {
  const bug = await db
    .prepare('SELECT id FROM bug_reports WHERE id = ? AND organization_id = ?')
    .get(bugId, orgId);

  if (!bug) {
    throw new AppError(404, 'NOT_FOUND', 'Nie znaleziono zgłoszenia');
  }

  const cleanContent = (content || '').trim();
  if (!cleanContent) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Treść komentarza jest wymagana');
  }

  const now = nowIso();
  const authorName = `${actorUser.first_name} ${actorUser.last_name}`;

  const stmt = db.prepare(`
    INSERT INTO bug_comments (bug_report_id, user_id, author_name, is_staff, content, created_at)
    VALUES (?, ?, ?, 1, ?, ?)
  `);

  const info = await stmt.run(bugId, actorUser.id, authorName, cleanContent, now);
  await db.prepare('UPDATE bug_reports SET updated_at = ? WHERE id = ?').run(now, bugId);

  const comment = {
    id: Number(info.lastInsertRowid),
    bug_report_id: Number(bugId),
    user_id: actorUser.id,
    author_name: authorName,
    is_staff: true,
    content: cleanContent,
    created_at: now,
  };

  await logAudit(db, {
    actorUserId: actorUser.id,
    action: 'BUG_STAFF_COMMENT_ADD',
    entityType: 'bug_comment',
    entityId: comment.id,
    details: { bug_report_id: bugId },
    ipAddress: clientMeta.ipAddress,
    userAgent: clientMeta.userAgent,
  });

  return { success: true, comment };
}
