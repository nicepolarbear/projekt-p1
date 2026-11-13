import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { requirePermission } from '../middleware/rbac.js';
import { validateBody } from '../middleware/validate.js';
import { getClientMeta } from '../services/auditService.js';
import {
  approveJoinRequest,
  generateJoinCode,
  listJoinCodes,
  listJoinRequests,
  rejectJoinRequest,
} from '../services/onboardingService.js';

const router = Router();
router.use(requireAuth);

function requireOrg(req, _res, next) {
  if (!req.user?.organization_id) {
    return next(
      new AppError(403, 'FORBIDDEN', 'Brak przypisania do organizacji')
    );
  }
  return next();
}

router.use(requireOrg);

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

const generateCodeSchema = z.object({
  suggested_position_id: z.number().int().positive().optional().nullable(),
  max_uses: z.number().int().min(1).max(1000).default(1),
});

const approveRequestSchema = z.object({
  assigned_position_id: z.number().int().positive().optional().nullable(),
  role_id: z.number().int().positive().optional().nullable(),
});

// GET /api/organizations/join-codes
router.get(
  '/join-codes',
  requirePermission('can_generate_invites'),
  async (req, res) => {
    const codes = await listJoinCodes(req.user.organization_id);
    res.json({ codes });
  }
);

// POST /api/organizations/join-codes
router.post(
  '/join-codes',
  requirePermission('can_generate_invites'),
  validateBody(generateCodeSchema),
  async (req, res) => {
    const meta = getClientMeta(req);
    const code = await generateJoinCode(
      req.user.organization_id,
      req.user.id,
      req.body,
      meta
    );
    res.status(201).json({ code });
  }
);

// GET /api/organizations/join-requests
router.get(
  '/join-requests',
  requirePermission('can_approve_join_requests'),
  async (req, res) => {
    const requests = await listJoinRequests(req.user.organization_id);
    res.json({ requests });
  }
);

// POST /api/organizations/join-requests/:id/approve
router.post(
  '/join-requests/:id/approve',
  requirePermission('can_approve_join_requests'),
  validateBody(approveRequestSchema),
  async (req, res) => {
    const requestId = parseIdParam(req.params.id);
    const meta = getClientMeta(req);
    const result = await approveJoinRequest(
      requestId,
      req.user.id,
      req.user.organization_id,
      req.body,
      meta
    );
    res.json(result);
  }
);

// POST /api/organizations/join-requests/:id/reject
router.post(
  '/join-requests/:id/reject',
  requirePermission('can_approve_join_requests'),
  async (req, res) => {
    const requestId = parseIdParam(req.params.id);
    const meta = getClientMeta(req);
    const result = await rejectJoinRequest(
      requestId,
      req.user.id,
      req.user.organization_id,
      meta
    );
    res.json(result);
  }
);

export default router;
