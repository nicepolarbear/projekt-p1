import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { getClientMeta } from '../services/auditService.js';
import {
  createPosition,
  deletePosition,
  listPositions,
  updatePosition,
} from '../services/positionsService.js';

const router = Router();
router.use(requireAuth);

function parseIdParam(raw) {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy identyfikator stanowiska');
  }
  const num = Number(raw);
  if (!Number.isSafeInteger(num) || num <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy identyfikator stanowiska');
  }
  return num;
}

const positionPayloadSchema = z.object({
  name: z.string().trim().min(2, 'Nazwa stanowiska musi mieć co najmniej 2 znaki').max(100),
  description: z.string().trim().max(500).optional().nullable(),
  priority: z.number().int().min(1).max(10).default(3),
  is_delegatable: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(true),
  is_admin: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_manage_members: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_generate_invites: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_approve_join_requests: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_create_tasks: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(true),
  can_assign_tasks: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(true),
  can_manage_all_tasks: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_delete_tasks: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_triage_bugs: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_convert_bugs_to_tasks: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_manage_applications: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_view_analytics: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_view_audit_logs: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
  can_manage_permissions: z.union([z.boolean(), z.literal(0), z.literal(1)]).default(false),
});

const updatePositionSchema = positionPayloadSchema.partial();

// GET /api/positions
router.get('/', async (_req, res) => {
  const positions = await listPositions();
  res.json({ positions });
});

// POST /api/positions
router.post(
  '/',
  requirePermission('can_manage_permissions'),
  validateBody(positionPayloadSchema),
  async (req, res) => {
    const meta = getClientMeta(req);
    const created = await createPosition(req.body, req.user.id, meta);
    res.status(201).json({ position: created });
  }
);

// PATCH /api/positions/:id
router.patch(
  '/:id',
  requirePermission('can_manage_permissions'),
  validateBody(updatePositionSchema),
  async (req, res) => {
    const id = parseIdParam(req.params.id);
    const meta = getClientMeta(req);
    const updated = await updatePosition(id, req.body, req.user.id, meta);
    res.json({ position: updated });
  }
);

// DELETE /api/positions/:id
router.delete(
  '/:id',
  requirePermission('can_manage_permissions'),
  async (req, res) => {
    const id = parseIdParam(req.params.id);
    const meta = getClientMeta(req);
    const result = await deletePosition(id, req.user.id, meta);
    res.json(result);
  }
);

export default router;
