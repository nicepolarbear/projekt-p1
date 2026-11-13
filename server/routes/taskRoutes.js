import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { getClientMeta } from '../services/auditService.js';
import {
  assignTask,
  createTask,
  listTasks,
  respondToAssignment,
  restoreTask,
  softDeleteTask,
  updateTask,
  updateTaskStatus,
} from '../services/taskService.js';

const router = Router();
router.use(requireAuth);

function parseIdParam(raw) {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy identyfikator zadania');
  }
  const num = Number(raw);
  if (!Number.isSafeInteger(num) || num <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy identyfikator zadania');
  }
  return num;
}

const listTasksQuerySchema = z
  .object({
    scope: z.enum(['active', 'created', 'deleted', 'all']).default('active'),
  })
  .strict();

const dueDateSchema = z
  .string()
  .trim()
  .refine((v) => v === '' || Number.isFinite(Date.parse(v)), 'Nieprawidłowy format daty')
  .nullable()
  .optional();

const createTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Tytuł zadania jest wymagany').max(200),
    short_desc: z.string().trim().max(500).nullable().optional(),
    full_desc: z.string().trim().max(4000).nullable().optional(),
    due_date: dueDateSchema,
    assignment_mode: z.enum(['self', 'assign', 'share']).default('self'),
    assignee_id: z.number().int().positive().nullable().optional(),
    priority_id: z.number().int().min(1).max(4).default(2),
    status_id: z.literal(1).optional(),
  })
  .strict();

const updateTaskSchema = z
  .object({
    title: z.string().trim().min(1, 'Tytuł zadania nie może być pusty').max(200).optional(),
    short_desc: z.string().trim().max(500).nullable().optional(),
    full_desc: z.string().trim().max(4000).nullable().optional(),
    due_date: dueDateSchema,
  })
  .strict();

const updateStatusSchema = z
  .object({
    status_id: z.number().int().min(1).max(4),
  })
  .strict();

const assignTaskSchema = z
  .object({
    employee_id: z.number().int().positive(),
    priority_id: z.number().int().min(1).max(4).default(2),
    mode: z.enum(['delegate', 'share']).optional(),
    assignment_status: z.enum(['pending', 'accepted', 'rejected']).optional(),
  })
  .strict();

const respondAssignmentSchema = z
  .object({
    assignment_status: z.enum(['accepted', 'rejected']),
    rejection_reason: z.string().trim().max(500).nullable().optional(),
  })
  .strict();

router.get('/', validateQuery(listTasksQuerySchema), (req, res) => {
  const result = listTasks({
    actor: req.user,
    scope: req.query.scope,
  });
  res.json(result);
});

router.post('/', validateBody(createTaskSchema), (req, res) => {
  const { ipAddress, userAgent } = getClientMeta(req);
  const result = createTask({
    actor: req.user,
    payload: req.body,
    ipAddress,
    userAgent,
  });
  res.status(201).json(result);
});

router.patch('/:id', validateBody(updateTaskSchema), (req, res) => {
  const taskId = parseIdParam(req.params.id);
  const { ipAddress, userAgent } = getClientMeta(req);
  const result = updateTask({
    actor: req.user,
    taskId,
    updates: req.body,
    ipAddress,
    userAgent,
  });
  res.json(result);
});

router.patch('/:id/status', validateBody(updateStatusSchema), (req, res) => {
  const taskId = parseIdParam(req.params.id);
  const { ipAddress, userAgent } = getClientMeta(req);
  const result = updateTaskStatus({
    actor: req.user,
    taskId,
    statusId: req.body.status_id,
    ipAddress,
    userAgent,
  });
  res.json(result);
});

router.delete('/:id', (req, res) => {
  const taskId = parseIdParam(req.params.id);
  const { ipAddress, userAgent } = getClientMeta(req);
  const result = softDeleteTask({
    actor: req.user,
    taskId,
    ipAddress,
    userAgent,
  });
  res.json({ ok: true, ...result });
});

router.post('/:id/restore', (req, res) => {
  const taskId = parseIdParam(req.params.id);
  const { ipAddress, userAgent } = getClientMeta(req);
  const result = restoreTask({
    actor: req.user,
    taskId,
    ipAddress,
    userAgent,
  });
  res.json(result);
});

router.post('/:id/assignments', validateBody(assignTaskSchema), (req, res) => {
  const taskId = parseIdParam(req.params.id);
  const { ipAddress, userAgent } = getClientMeta(req);
  const assignment = assignTask({
    actor: req.user,
    taskId,
    employeeId: req.body.employee_id,
    priorityId: req.body.priority_id,
    mode: req.body.mode,
    ipAddress,
    userAgent,
  });
  res.status(201).json({ assignment });
});

function handleRespondToAssignment(req, res) {
  const taskId = parseIdParam(req.params.id);
  const { ipAddress, userAgent } = getClientMeta(req);
  const assignment = respondToAssignment({
    actor: req.user,
    taskId,
    assignmentStatus: req.body.assignment_status,
    rejectionReason: req.body.rejection_reason,
    ipAddress,
    userAgent,
  });
  res.json({ assignment });
}

router.patch(
  '/:id/assignments/respond',
  validateBody(respondAssignmentSchema),
  handleRespondToAssignment
);

router.patch(
  '/:id/assignments/me',
  validateBody(respondAssignmentSchema),
  handleRespondToAssignment
);

export default router;
