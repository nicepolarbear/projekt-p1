import { Router } from 'express';
import { z } from 'zod';
import { optionalAuth, requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import { getClientMeta } from '../services/auditService.js';
import {
  addPublicComment,
  addStaffComment,
  convertBugToTask,
  getMyBugs,
  getOrganizationBugs,
  getPublicApplications,
  submitBugReport,
  trackBugByCode,
  updateBugStatus,
} from '../services/bugService.js';

function parseIdParam(raw) {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy identyfikator');
  }
  const num = Number(raw);
  if (!Number.isSafeInteger(num) || num <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy identyfikator');
  }
  return num;
}

// ---------------------------------------------------------------------------
// 1. Applications Router (mounted at /api/applications)
// ---------------------------------------------------------------------------
export const applicationRouter = Router();

applicationRouter.get('/public', async (_req, res) => {
  const applications = await getPublicApplications();
  res.json({ applications });
});

// ---------------------------------------------------------------------------
// 2. Bugs Router (mounted at /api/bugs)
// ---------------------------------------------------------------------------
export const bugRouter = Router();

const submitBugSchema = z.object({
  application_id: z.number().int().positive().optional().nullable(),
  custom_url: z.string().trim().url().optional().nullable(),
  organization_id: z.number().int().positive().optional().nullable(),
  title: z.string().trim().min(3, 'Tytuł musi mieć co najmniej 3 znaki').max(200),
  description: z.string().trim().min(5, 'Opis musi mieć co najmniej 5 znaków').max(5000),
  severity: z.enum(['low', 'normal', 'high', 'critical']).default('normal'),
  attachment_url: z.string().trim().max(1000).optional().nullable(),
  is_anonymous: z.union([z.boolean(), z.literal(0), z.literal(1)]).optional(),
  guest_name: z.string().trim().max(100).optional().nullable(),
  guest_email: z.string().trim().email('Nieprawidłowy email').max(255).optional().nullable(),
});

const publicCommentSchema = z.object({
  content: z.string().trim().min(1, 'Komentarz nie może być pusty').max(2000),
  author_name: z.string().trim().max(100).optional().nullable(),
});

// POST /api/bugs/submit (supports auth or guest or anonymous)
bugRouter.post('/submit', optionalAuth, validateBody(submitBugSchema), async (req, res) => {
  const meta = getClientMeta(req);
  const result = await submitBugReport(req.body, req.user, meta);
  res.status(201).json(result);
});

// GET /api/bugs/my (logged in user's reported bugs)
bugRouter.get('/my', requireAuth, async (req, res) => {
  const bugs = await getMyBugs(req.user.id);
  res.json({ bugs });
});

// GET /api/bugs/track/:trackingCode
bugRouter.get('/track/:trackingCode', async (req, res) => {
  const result = await trackBugByCode(req.params.trackingCode);
  res.json(result);
});

// POST /api/bugs/track/:trackingCode/comments
bugRouter.post(
  '/track/:trackingCode/comments',
  optionalAuth,
  validateBody(publicCommentSchema),
  async (req, res) => {
    const meta = getClientMeta(req);
    const result = await addPublicComment(
      req.params.trackingCode,
      req.body,
      req.user,
      meta
    );
    res.status(201).json(result);
  }
);

// ---------------------------------------------------------------------------
// 3. Organization Bugs Router (mounted at /api/organization/bugs and /api/organizations/bugs)
// ---------------------------------------------------------------------------
export const orgBugRouter = Router();
orgBugRouter.use(requireAuth);

function requireOrg(req, _res, next) {
  if (!req.user?.organization_id) {
    return next(new AppError(403, 'FORBIDDEN', 'Brak przypisania do organizacji'));
  }
  return next();
}
orgBugRouter.use(requireOrg);

const filterBugsSchema = z.object({
  status: z.enum(['new', 'in_analysis', 'in_progress', 'resolved', 'rejected']).optional(),
  severity: z.enum(['low', 'normal', 'high', 'critical']).optional(),
  application_id: z.coerce.number().int().positive().optional(),
  search: z.string().trim().max(200).optional(),
});

const updateBugStatusSchema = z.object({
  status: z.enum(['new', 'in_analysis', 'in_progress', 'resolved', 'rejected']),
  rejection_reason: z.string().trim().max(500).optional().nullable(),
});

const convertBugToTaskSchema = z.object({
  title: z.string().trim().max(200).optional(),
  short_desc: z.string().trim().max(300).optional(),
  full_desc: z.string().trim().max(5000).optional(),
  due_date: z.string().trim().optional().nullable(),
  employee_id: z.number().int().positive().optional().nullable(),
  priority_id: z.number().int().min(1).max(4).optional(),
});

const staffCommentSchema = z.object({
  content: z.string().trim().min(1, 'Treść komentarza jest wymagana').max(2000),
});

// GET /api/organization/bugs
orgBugRouter.get(
  '/',
  requirePermission('can_triage_bugs'),
  validateQuery(filterBugsSchema),
  async (req, res) => {
    const bugs = await getOrganizationBugs(req.user.organization_id, req.query);
    res.json({ bugs });
  }
);

// PATCH /api/organization/bugs/:id/status
orgBugRouter.patch(
  '/:id/status',
  requirePermission('can_triage_bugs'),
  validateBody(updateBugStatusSchema),
  async (req, res) => {
    const bugId = parseIdParam(req.params.id);
    const meta = getClientMeta(req);
    const result = await updateBugStatus(
      bugId,
      req.user.organization_id,
      req.body,
      req.user,
      meta
    );
    res.json(result);
  }
);

// POST /api/organization/bugs/:id/convert-to-task
orgBugRouter.post(
  '/:id/convert-to-task',
  requirePermission('can_convert_bugs_to_tasks'),
  validateBody(convertBugToTaskSchema),
  async (req, res) => {
    const bugId = parseIdParam(req.params.id);
    const meta = getClientMeta(req);
    const result = await convertBugToTask(
      bugId,
      req.user.organization_id,
      req.body,
      req.user,
      meta
    );
    res.status(201).json(result);
  }
);

// POST /api/organization/bugs/:id/comments
orgBugRouter.post(
  '/:id/comments',
  requirePermission('can_triage_bugs'),
  validateBody(staffCommentSchema),
  async (req, res) => {
    const bugId = parseIdParam(req.params.id);
    const meta = getClientMeta(req);
    const result = await addStaffComment(
      bugId,
      req.user.organization_id,
      req.body,
      req.user,
      meta
    );
    res.status(201).json(result);
  }
);
