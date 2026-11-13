import { getDb, withTransaction } from '../db/connection.js';
import { AppError } from '../middleware/errorHandler.js';
import { canDelegate, canShare } from '../utils/hierarchy.js';
import { logAudit, nowIso } from './auditService.js';
import { fetchUserRowById } from './userMapper.js';

const BASE_TASK_SELECT = `
  SELECT
    t.id,
    t.title,
    t.short_desc,
    t.full_desc,
    t.creator_id,
    t.status_id,
    t.due_date,
    t.completed_at,
    t.deleted_at,
    t.created_at,
    t.updated_at,
    c.first_name AS creator_first_name,
    c.last_name AS creator_last_name,
    c.email AS creator_email,
    c.avatar_color AS creator_avatar_color,
    c.position_id AS creator_position_id,
    cp.priority AS creator_position_priority
  FROM tasks t
  JOIN users c ON c.id = t.creator_id
  JOIN positions cp ON cp.id = c.position_id
`;

function mapAssignmentRow(row) {
  return {
    task_id: row.task_id,
    employee_id: row.employee_id,
    assigned_by: row.assigned_by,
    priority_id: row.priority_id,
    assignment_status: row.assignment_status,
    rejection_reason: row.rejection_reason,
    assigned_at: row.assigned_at,
    responded_at: row.responded_at,
    user: {
      id: row.emp_id,
      first_name: row.emp_first_name,
      last_name: row.emp_last_name,
      email: row.emp_email,
      avatar_color: row.emp_avatar_color,
      position_id: row.emp_position_id,
      position: {
        id: row.emp_position_id,
        name: row.emp_pos_name,
        priority: row.emp_pos_priority,
        is_delegatable: Boolean(row.emp_pos_is_delegatable),
      },
    },
    priority: {
      id: row.prio_id,
      name: row.prio_name,
      level: row.prio_level,
    },
  };
}

export async function fetchAssignmentsForTaskIds(db, taskIds) {
  if (!Array.isArray(taskIds) || taskIds.length === 0) {
    return [];
  }

  const placeholders = taskIds.map(() => '?').join(', ');
  const rows = await db
    .prepare(
      `
      SELECT
        ta.task_id,
        ta.employee_id,
        ta.assigned_by,
        ta.priority_id,
        ta.assignment_status,
        ta.rejection_reason,
        ta.assigned_at,
        ta.responded_at,
        u.id AS emp_id,
        u.first_name AS emp_first_name,
        u.last_name AS emp_last_name,
        u.email AS emp_email,
        u.avatar_color AS emp_avatar_color,
        u.position_id AS emp_position_id,
        p.name AS emp_pos_name,
        p.priority AS emp_pos_priority,
        p.is_delegatable AS emp_pos_is_delegatable,
        pr.id AS prio_id,
        pr.name AS prio_name,
        pr.level AS prio_level
      FROM task_assignments ta
      JOIN users u ON u.id = ta.employee_id
      JOIN positions p ON p.id = u.position_id
      JOIN priorities pr ON pr.id = ta.priority_id
      WHERE ta.task_id IN (${placeholders})
      ORDER BY ta.assigned_at ASC, ta.employee_id ASC
      `
    )
    .all(...taskIds);

  return rows.map(mapAssignmentRow);
}

export async function hydrateTaskRows(db, taskRows) {
  if (!Array.isArray(taskRows) || taskRows.length === 0) {
    return { tasks: [], assignments: [] };
  }

  const taskIds = taskRows.map((row) => row.id);
  const allAssignments = await fetchAssignmentsForTaskIds(db, taskIds);
  const byTaskId = new Map();

  for (const assignment of allAssignments) {
    if (!byTaskId.has(assignment.task_id)) {
      byTaskId.set(assignment.task_id, []);
    }
    byTaskId.get(assignment.task_id).push(assignment);
  }

  const tasks = taskRows.map((row) => ({
    id: row.id,
    title: row.title,
    short_desc: row.short_desc,
    full_desc: row.full_desc,
    creator_id: row.creator_id,
    status_id: row.status_id,
    due_date: row.due_date,
    completed_at: row.completed_at,
    deleted_at: row.deleted_at,
    created_at: row.created_at,
    updated_at: row.updated_at,
    creator: {
      id: row.creator_id,
      first_name: row.creator_first_name,
      last_name: row.creator_last_name,
      email: row.creator_email,
      avatar_color: row.creator_avatar_color,
      position_id: row.creator_position_id,
    },
    assignments: byTaskId.get(row.id) || [],
  }));

  return { tasks, assignments: allAssignments };
}

async function fetchHydratedTaskById(db, taskId) {
  const row = await db.prepare(`${BASE_TASK_SELECT} WHERE t.id = ?`).get(taskId);
  if (!row) return null;
  const { tasks, assignments } = await hydrateTaskRows(db, [row]);
  return { task: tasks[0], assignments };
}

async function fetchAssignmentByCompositeKey(db, taskId, employeeId) {
  const row = await db
    .prepare(
      `
      SELECT
        ta.task_id,
        ta.employee_id,
        ta.assigned_by,
        ta.priority_id,
        ta.assignment_status,
        ta.rejection_reason,
        ta.assigned_at,
        ta.responded_at,
        u.id AS emp_id,
        u.first_name AS emp_first_name,
        u.last_name AS emp_last_name,
        u.email AS emp_email,
        u.avatar_color AS emp_avatar_color,
        u.position_id AS emp_position_id,
        p.name AS emp_pos_name,
        p.priority AS emp_pos_priority,
        p.is_delegatable AS emp_pos_is_delegatable,
        pr.id AS prio_id,
        pr.name AS prio_name,
        pr.level AS prio_level
      FROM task_assignments ta
      JOIN users u ON u.id = ta.employee_id
      JOIN positions p ON p.id = u.position_id
      JOIN priorities pr ON pr.id = ta.priority_id
      WHERE ta.task_id = ? AND ta.employee_id = ?
      `
    )
    .get(taskId, employeeId);

  return row ? mapAssignmentRow(row) : null;
}

function normalizeOptionalText(val) {
  if (val === undefined || val === null) return null;
  const trimmed = String(val).trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizeDueDate(val) {
  if (val === undefined || val === null || val === '') return null;
  const ms = Date.parse(val);
  if (!Number.isFinite(ms)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy format daty terminu realizacji');
  }
  return new Date(ms).toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export async function listTasks({ actor, scope = 'active' }) {
  const db = getDb();
  const isPrivileged = actor.role === 'admin' || actor.role === 'dyrektor';

  if (scope === 'all') {
    if (!isPrivileged) {
      throw new AppError(403, 'FORBIDDEN', 'Brak uprawnień do wyświetlenia wszystkich zadań');
    }
    const rows = await db.prepare(`${BASE_TASK_SELECT} ORDER BY t.created_at DESC, t.id DESC`).all();
    return await hydrateTaskRows(db, rows);
  }

  if (scope === 'created') {
    const rows = await db
      .prepare(
        `${BASE_TASK_SELECT}
         WHERE t.deleted_at IS NULL AND t.creator_id = ?
         ORDER BY t.created_at DESC, t.id DESC`
      )
      .all(actor.id);
    return await hydrateTaskRows(db, rows);
  }

  if (scope === 'deleted') {
    if (isPrivileged) {
      const rows = await db
        .prepare(
          `${BASE_TASK_SELECT}
           WHERE t.deleted_at IS NOT NULL
           ORDER BY t.deleted_at DESC, t.id DESC`
        )
        .all();
      return await hydrateTaskRows(db, rows);
    }

    const rows = await db
      .prepare(
        `${BASE_TASK_SELECT}
         WHERE t.deleted_at IS NOT NULL
           AND (
             t.creator_id = ?
             OR EXISTS (
               SELECT 1 FROM task_assignments ta
               WHERE ta.task_id = t.id AND ta.employee_id = ?
             )
           )
         ORDER BY t.deleted_at DESC, t.id DESC`
      )
      .all(actor.id, actor.id);
    return await hydrateTaskRows(db, rows);
  }

  // scope === 'active'
  if (isPrivileged) {
    const rows = await db
      .prepare(
        `${BASE_TASK_SELECT}
         WHERE t.deleted_at IS NULL
         ORDER BY t.created_at DESC, t.id DESC`
      )
      .all();
    return await hydrateTaskRows(db, rows);
  }

  if (actor.role === 'kierownik') {
    const actorPriority = actor.position?.priority ?? 999;
    const rows = await db
      .prepare(
        `${BASE_TASK_SELECT}
         WHERE t.deleted_at IS NULL
           AND (
             t.creator_id = ?
             OR cp.priority > ?
             OR EXISTS (
               SELECT 1
               FROM task_assignments ta
               JOIN users au ON au.id = ta.employee_id
               JOIN positions ap ON ap.id = au.position_id
               WHERE ta.task_id = t.id
                 AND (ta.employee_id = ? OR ap.priority > ?)
             )
           )
         ORDER BY t.created_at DESC, t.id DESC`
      )
      .all(actor.id, actorPriority, actor.id, actorPriority);
    return await hydrateTaskRows(db, rows);
  }

  // pracownik
  const rows = await db
    .prepare(
      `${BASE_TASK_SELECT}
       WHERE t.deleted_at IS NULL
         AND (
           t.creator_id = ?
           OR EXISTS (
             SELECT 1 FROM task_assignments ta
             WHERE ta.task_id = t.id AND ta.employee_id = ?
           )
         )
       ORDER BY t.created_at DESC, t.id DESC`
    )
    .all(actor.id, actor.id);

  return await hydrateTaskRows(db, rows);
}

export async function createTask({ actor, payload, ipAddress = null, userAgent = null }) {
  const {
    title,
    short_desc = null,
    full_desc = null,
    due_date = null,
    assignment_mode = 'self',
    assignee_id = null,
    priority_id = 2,
  } = payload;

  const db = getDb();
  const normalizedShort = normalizeOptionalText(short_desc);
  const normalizedFull = normalizeOptionalText(full_desc);
  const normalizedDueDate = normalizeDueDate(due_date);

  let targetUser = null;
  if (assignment_mode === 'assign' || assignment_mode === 'share') {
    if (!assignee_id) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Wymagane jest wskazanie pracownika dla wybranego trybu przypisania'
      );
    }
    if (assignee_id === actor.id) {
      throw new AppError(
        400,
        'VALIDATION_ERROR',
        'Nie możesz zlecić ani udostępnić zadania samemu sobie'
      );
    }

    const targetRow = await fetchUserRowById(assignee_id, db);
    if (!targetRow) {
      throw new AppError(404, 'USER_NOT_FOUND', 'Nie znaleziono docelowego użytkownika');
    }
    if (targetRow.is_active !== 1) {
      throw new AppError(400, 'TARGET_INACTIVE', 'Docelowy użytkownik jest nieaktywny');
    }

    targetUser = {
      id: targetRow.id,
      position: {
        id: targetRow.position_id,
        name: targetRow.position_name,
        priority: targetRow.position_priority,
        is_delegatable: targetRow.position_is_delegatable,
      },
    };

    if (assignment_mode === 'assign' && !canDelegate(actor.position, targetUser.position)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Brak uprawnień hierarchii do zlecenia zadania temu użytkownikowi'
      );
    }

    if (assignment_mode === 'share' && !canShare(actor.position, targetUser.position)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Brak uprawnień hierarchii do udostępnienia zadania temu użytkownikowi'
      );
    }
  }

  const now = nowIso();

  const createdTaskId = await withTransaction(async (tx) => {
    const insertResult = await tx
      .prepare(
        `
        INSERT INTO tasks (
          title, short_desc, full_desc, creator_id, status_id,
          due_date, completed_at, deleted_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, 1, ?, NULL, NULL, ?, ?)
        `
      )
      .run(
        title.trim(),
        normalizedShort,
        normalizedFull,
        actor.id,
        normalizedDueDate,
        now,
        now
      );

    const taskId = Number(insertResult.lastInsertRowid);

    const insertAssignment = tx.prepare(
      `
      INSERT INTO task_assignments (
        task_id, employee_id, assigned_by, priority_id,
        assignment_status, rejection_reason, assigned_at, responded_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
      `
    );

    const createdAssignments = [];

    if (assignment_mode === 'self') {
      await insertAssignment.run(taskId, actor.id, actor.id, priority_id, 'accepted', now, now);
      createdAssignments.push({ employee_id: actor.id, assignment_status: 'accepted' });
    } else if (assignment_mode === 'assign') {
      await insertAssignment.run(taskId, targetUser.id, actor.id, priority_id, 'pending', now, null);
      createdAssignments.push({ employee_id: targetUser.id, assignment_status: 'pending' });
    } else if (assignment_mode === 'share') {
      await insertAssignment.run(taskId, actor.id, actor.id, priority_id, 'accepted', now, now);
      await insertAssignment.run(taskId, targetUser.id, actor.id, priority_id, 'accepted', now, now);
      createdAssignments.push(
        { employee_id: actor.id, assignment_status: 'accepted' },
        { employee_id: targetUser.id, assignment_status: 'accepted' }
      );
    }

    await logAudit(tx, {
      actorUserId: actor.id,
      action: 'TASK_CREATED',
      entityType: 'task',
      entityId: taskId,
      details: {
        title: title.trim(),
        assignment_mode,
        priority_id,
      },
      ipAddress,
      userAgent,
    });

    for (const item of createdAssignments) {
      await logAudit(tx, {
        actorUserId: actor.id,
        action: 'TASK_ASSIGNED',
        entityType: 'task_assignment',
        entityId: `${taskId}:${item.employee_id}`,
        details: {
          task_id: taskId,
          employee_id: item.employee_id,
          priority_id,
          assignment_status: item.assignment_status,
        },
        ipAddress,
        userAgent,
      });
    }

    return taskId;
  });

  return await fetchHydratedTaskById(db, createdTaskId);
}

export async function updateTask({ actor, taskId, updates, ipAddress = null, userAgent = null }) {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existing) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Nie znaleziono zadania');
  }
  if (existing.deleted_at !== null) {
    throw new AppError(409, 'TASK_DELETED', 'Nie można edytować zadania znajdującego się w koszu');
  }

  const isPrivileged = actor.role === 'admin' || actor.role === 'dyrektor';
  if (!isPrivileged && existing.creator_id !== actor.id) {
    throw new AppError(403, 'FORBIDDEN', 'Tylko twórca zadania lub administrator może je edytować');
  }

  const setClauses = [];
  const params = [];
  const changedFields = [];

  if (Object.hasOwn(updates, 'title') && updates.title !== undefined) {
    setClauses.push('title = ?');
    params.push(updates.title.trim());
    changedFields.push('title');
  }
  if (Object.hasOwn(updates, 'short_desc') && updates.short_desc !== undefined) {
    setClauses.push('short_desc = ?');
    params.push(normalizeOptionalText(updates.short_desc));
    changedFields.push('short_desc');
  }
  if (Object.hasOwn(updates, 'full_desc') && updates.full_desc !== undefined) {
    setClauses.push('full_desc = ?');
    params.push(normalizeOptionalText(updates.full_desc));
    changedFields.push('full_desc');
  }
  if (Object.hasOwn(updates, 'due_date') && updates.due_date !== undefined) {
    setClauses.push('due_date = ?');
    params.push(normalizeDueDate(updates.due_date));
    changedFields.push('due_date');
  }

  if (setClauses.length > 0) {
    const now = nowIso();
    setClauses.push('updated_at = ?');
    params.push(now, taskId);

    await withTransaction(async (tx) => {
      await tx.prepare(`UPDATE tasks SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);

      await logAudit(tx, {
        actorUserId: actor.id,
        action: 'TASK_UPDATED',
        entityType: 'task',
        entityId: taskId,
        details: { updated_fields: changedFields },
        ipAddress,
        userAgent,
      });
    });
  }

  return await fetchHydratedTaskById(db, taskId);
}

export async function updateTaskStatus({ actor, taskId, statusId, ipAddress = null, userAgent = null }) {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existing) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Nie znaleziono zadania');
  }
  if (existing.deleted_at !== null) {
    throw new AppError(409, 'TASK_DELETED', 'Nie można zmienić statusu zadania w koszu');
  }

  const isPrivileged = actor.role === 'admin' || actor.role === 'dyrektor';
  const isCreator = existing.creator_id === actor.id;
  const actorAssignment = await db
    .prepare('SELECT assignment_status FROM task_assignments WHERE task_id = ? AND employee_id = ?')
    .get(taskId, actor.id);
  const isAcceptedAssignee = actorAssignment?.assignment_status === 'accepted';

  if (!isPrivileged && !isCreator && !isAcceptedAssignee) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Brak uprawnień do zmiany statusu tego zadania'
    );
  }

  if (statusId === 4 && !isPrivileged && !isCreator) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Tylko twórca zadania, dyrektor lub administrator może je anulować'
    );
  }

  const now = nowIso();
  const completedAt = statusId === 3 ? existing.completed_at || now : null;

  await withTransaction(async (tx) => {
    await tx.prepare(
      'UPDATE tasks SET status_id = ?, completed_at = ?, updated_at = ? WHERE id = ?'
    ).run(statusId, completedAt, now, taskId);

    if (statusId === 3) {
      const links = await tx
        .prepare('SELECT bug_report_id FROM bug_task_links WHERE task_id = ?')
        .all(taskId);

      for (const link of links) {
        await tx.prepare(`
          UPDATE bug_reports
          SET status = 'resolved', updated_at = ?
          WHERE id = ? AND status != 'resolved'
        `).run(now, link.bug_report_id);

        const actorName = `${actor.first_name || 'System'} ${actor.last_name || ''}`.trim();
        await tx.prepare(`
          INSERT INTO bug_comments (bug_report_id, user_id, author_name, is_staff, content, created_at)
          VALUES (?, ?, ?, 1, ?, ?)
        `).run(
          link.bug_report_id,
          actor.id,
          actorName,
          `Powiązane zadanie #${taskId} ("${existing.title}") zostało zakończone. Zgłoszenie oznaczono automatycznie jako rozwiązane.`,
          now
        );
      }
    }

    await logAudit(tx, {
      actorUserId: actor.id,
      action: 'TASK_STATUS_CHANGED',
      entityType: 'task',
      entityId: taskId,
      details: {
        from_status_id: existing.status_id,
        to_status_id: statusId,
      },
      ipAddress,
      userAgent,
    });
  });

  return await fetchHydratedTaskById(db, taskId);
}

export async function softDeleteTask({ actor, taskId, ipAddress = null, userAgent = null }) {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existing) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Nie znaleziono zadania');
  }

  const isPrivileged = actor.role === 'admin' || actor.role === 'dyrektor';
  if (!isPrivileged && existing.creator_id !== actor.id) {
    throw new AppError(403, 'FORBIDDEN', 'Brak uprawnień do usunięcia tego zadania');
  }

  if (existing.deleted_at !== null) {
    throw new AppError(409, 'TASK_ALREADY_DELETED', 'Zadanie znajduje się już w koszu');
  }

  const now = nowIso();

  await withTransaction(async (tx) => {
    await tx.prepare('UPDATE tasks SET deleted_at = ?, updated_at = ? WHERE id = ?').run(
      now,
      now,
      taskId
    );

    await logAudit(tx, {
      actorUserId: actor.id,
      action: 'TASK_DELETED',
      entityType: 'task',
      entityId: taskId,
      details: { title: existing.title },
      ipAddress,
      userAgent,
    });
  });

  return await fetchHydratedTaskById(db, taskId);
}

export async function restoreTask({ actor, taskId, ipAddress = null, userAgent = null }) {
  const db = getDb();
  const existing = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existing) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Nie znaleziono zadania');
  }

  const isPrivileged = actor.role === 'admin' || actor.role === 'dyrektor';
  if (!isPrivileged && existing.creator_id !== actor.id) {
    throw new AppError(403, 'FORBIDDEN', 'Brak uprawnień do przywrócenia tego zadania');
  }

  if (existing.deleted_at === null) {
    throw new AppError(409, 'TASK_NOT_DELETED', 'Zadanie nie znajduje się w koszu');
  }

  const now = nowIso();

  await withTransaction(async (tx) => {
    await tx.prepare('UPDATE tasks SET deleted_at = NULL, updated_at = ? WHERE id = ?').run(now, taskId);

    await logAudit(tx, {
      actorUserId: actor.id,
      action: 'TASK_RESTORED',
      entityType: 'task',
      entityId: taskId,
      details: { title: existing.title },
      ipAddress,
      userAgent,
    });
  });

  return await fetchHydratedTaskById(db, taskId);
}

export async function assignTask({
  actor,
  taskId,
  employeeId,
  priorityId = 2,
  mode,
  ipAddress = null,
  userAgent = null,
}) {
  const db = getDb();
  const existingTask = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existingTask) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Nie znaleziono zadania');
  }
  if (existingTask.deleted_at !== null) {
    throw new AppError(409, 'TASK_DELETED', 'Nie można przypisywać osób do zadania w koszu');
  }

  const isPrivileged = actor.role === 'admin' || actor.role === 'dyrektor';
  const isCreator = existingTask.creator_id === actor.id;
  const actorAssignment = await db
    .prepare('SELECT assignment_status FROM task_assignments WHERE task_id = ? AND employee_id = ?')
    .get(taskId, actor.id);
  const isAcceptedAssignee = actorAssignment?.assignment_status === 'accepted';

  if (!isPrivileged && !isCreator && !isAcceptedAssignee) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Brak uprawnień do przypisywania użytkowników do tego zadania'
    );
  }

  if (employeeId === actor.id) {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Nie możesz zlecić ani udostępnić zadania samemu sobie'
    );
  }

  const targetRow = await fetchUserRowById(employeeId, db);
  if (!targetRow) {
    throw new AppError(404, 'USER_NOT_FOUND', 'Nie znaleziono docelowego użytkownika');
  }
  if (targetRow.is_active !== 1) {
    throw new AppError(400, 'TARGET_INACTIVE', 'Docelowy użytkownik jest nieaktywny');
  }

  const duplicate = await db
    .prepare('SELECT 1 FROM task_assignments WHERE task_id = ? AND employee_id = ?')
    .get(taskId, employeeId);
  if (duplicate) {
    throw new AppError(409, 'DUPLICATE_ASSIGNMENT', 'Użytkownik jest już przypisany do tego zadania');
  }

  const targetPosition = {
    id: targetRow.position_id,
    name: targetRow.position_name,
    priority: targetRow.position_priority,
    is_delegatable: targetRow.position_is_delegatable,
  };

  let resolvedStatus;
  let resolvedMode = mode;

  if (mode === 'delegate') {
    if (!canDelegate(actor.position, targetPosition)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Brak uprawnień hierarchii do zlecenia zadania temu użytkownikowi'
      );
    }
    resolvedStatus = 'pending';
  } else if (mode === 'share') {
    if (!canShare(actor.position, targetPosition)) {
      throw new AppError(
        403,
        'FORBIDDEN',
        'Brak uprawnień hierarchii do udostępnienia zadania temu użytkownikowi'
      );
    }
    resolvedStatus = 'accepted';
  } else if (canDelegate(actor.position, targetPosition)) {
    resolvedMode = 'delegate';
    resolvedStatus = 'pending';
  } else if (canShare(actor.position, targetPosition)) {
    resolvedMode = 'share';
    resolvedStatus = 'accepted';
  } else {
    throw new AppError(
      403,
      'FORBIDDEN',
      'Brak uprawnień hierarchii do przypisania zadania temu użytkownikowi'
    );
  }

  const now = nowIso();
  const respondedAt = resolvedStatus === 'accepted' ? now : null;

  await withTransaction(async (tx) => {
    await tx.prepare(
      `
      INSERT INTO task_assignments (
        task_id, employee_id, assigned_by, priority_id,
        assignment_status, rejection_reason, assigned_at, responded_at
      ) VALUES (?, ?, ?, ?, ?, NULL, ?, ?)
      `
    ).run(taskId, employeeId, actor.id, priorityId, resolvedStatus, now, respondedAt);

    await logAudit(tx, {
      actorUserId: actor.id,
      action: 'TASK_ASSIGNED',
      entityType: 'task_assignment',
      entityId: `${taskId}:${employeeId}`,
      details: {
        task_id: taskId,
        employee_id: employeeId,
        priority_id: priorityId,
        mode: resolvedMode,
        assignment_status: resolvedStatus,
      },
      ipAddress,
      userAgent,
    });
  });

  return await fetchAssignmentByCompositeKey(db, taskId, employeeId);
}

export async function respondToAssignment({
  actor,
  taskId,
  assignmentStatus,
  rejectionReason = null,
  ipAddress = null,
  userAgent = null,
}) {
  const db = getDb();
  const existingTask = await db.prepare('SELECT * FROM tasks WHERE id = ?').get(taskId);
  if (!existingTask) {
    throw new AppError(404, 'TASK_NOT_FOUND', 'Nie znaleziono zadania');
  }
  if (existingTask.deleted_at !== null) {
    throw new AppError(409, 'TASK_DELETED', 'Nie można odpowiedzieć na przypisanie zadania z kosza');
  }

  const existingAssignment = await db
    .prepare('SELECT * FROM task_assignments WHERE task_id = ? AND employee_id = ?')
    .get(taskId, actor.id);

  if (!existingAssignment) {
    throw new AppError(403, 'FORBIDDEN', 'Nie jesteś przypisany do tego zadania');
  }

  if (existingAssignment.assignment_status !== 'pending') {
    throw new AppError(
      409,
      'ASSIGNMENT_ALREADY_RESPONDED',
      'Decyzja dotycząca tego przypisania została już podjęta'
    );
  }

  const normalizedReason =
    assignmentStatus === 'rejected' ? normalizeOptionalText(rejectionReason) : null;
  const now = nowIso();

  await withTransaction(async (tx) => {
    await tx.prepare(
      `
      UPDATE task_assignments
      SET assignment_status = ?, rejection_reason = ?, responded_at = ?
      WHERE task_id = ? AND employee_id = ?
      `
    ).run(assignmentStatus, normalizedReason, now, taskId, actor.id);

    await logAudit(tx, {
      actorUserId: actor.id,
      action: 'ASSIGNMENT_UPDATED',
      entityType: 'task_assignment',
      entityId: `${taskId}:${actor.id}`,
      details: {
        task_id: taskId,
        employee_id: actor.id,
        assignment_status: assignmentStatus,
        rejection_reason: normalizedReason,
      },
      ipAddress,
      userAgent,
    });
  });

  return await fetchAssignmentByCompositeKey(db, taskId, actor.id);
}
