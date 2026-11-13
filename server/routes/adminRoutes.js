import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { AppError } from '../middleware/errorHandler.js';
import { requireRoles } from '../middleware/rbac.js';
import { validateBody, validateQuery } from '../middleware/validate.js';
import {
  createAdminUser,
  deactivateAdminUser,
  listAdminUsers,
  updateAdminUser,
} from '../services/adminUserService.js';
import { getClientMeta } from '../services/auditService.js';
import { sanitizeUser } from '../services/userMapper.js';

const router = Router();
router.use(requireAuth);

function parseIdParam(raw) {
  if (typeof raw !== 'string' || !/^\d+$/.test(raw)) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy identyfikator użytkownika');
  }
  const num = Number(raw);
  if (!Number.isSafeInteger(num) || num <= 0) {
    throw new AppError(400, 'VALIDATION_ERROR', 'Nieprawidłowy identyfikator użytkownika');
  }
  return num;
}

const listUsersQuerySchema = z
  .object({
    search: z.string().trim().max(200).optional(),
    role: z.string().trim().max(50).optional(),
    position_id: z.coerce.number().int().positive().optional(),
    is_active: z.enum(['0', '1', 'true', 'false']).optional(),
  })
  .strict();

const createUserSchema = z
  .object({
    first_name: z.string().trim().min(1, 'Imię jest wymagane').max(80),
    last_name: z.string().trim().min(1, 'Nazwisko jest wymagane').max(80),
    email: z.string().trim().email('Nieprawidłowy adres e-mail').max(255),
    password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').max(256),
    role_id: z.number().int().positive(),
    position_id: z.number().int().positive(),
    department_id: z.number().int().positive().default(3),
    phone: z.string().trim().max(40).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    avatar_color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .default('#6366f1'),
    is_active: z.union([z.literal(0), z.literal(1), z.boolean()]).optional(),
  })
  .strict();

const updateUserSchema = z
  .object({
    first_name: z.string().trim().min(1).max(80).optional(),
    last_name: z.string().trim().min(1).max(80).optional(),
    email: z.string().trim().email().max(255).optional(),
    role_id: z.number().int().positive().optional(),
    position_id: z.number().int().positive().optional(),
    department_id: z.number().int().positive().optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    avatar_color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
    is_active: z.union([z.literal(0), z.literal(1), z.boolean()]).optional(),
    password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').max(256).optional(),
  })
  .strict();

router.get(
  '/users',
  requireRoles('admin', 'dyrektor'),
  validateQuery(listUsersQuerySchema),
  (req, res) => {
    const { users } = listAdminUsers(req.query);
    res.json({ users: users.map(sanitizeUser) });
  }
);

router.post(
  '/users',
  requireRoles('admin'),
  validateBody(createUserSchema),
  async (req, res) => {
    const { ipAddress, userAgent } = getClientMeta(req);
    const user = await createAdminUser({
      actor: req.user,
      payload: req.body,
      ipAddress,
      userAgent,
    });
    res.status(201).json({ user: sanitizeUser(user) });
  }
);

router.patch(
  '/users/:id',
  requireRoles('admin', 'dyrektor'),
  validateBody(updateUserSchema),
  async (req, res) => {
    const targetUserId = parseIdParam(req.params.id);
    const { ipAddress, userAgent } = getClientMeta(req);
    const user = await updateAdminUser({
      actor: req.user,
      targetUserId,
      updates: req.body,
      ipAddress,
      userAgent,
    });
    res.json({ user: sanitizeUser(user) });
  }
);

router.delete('/users/:id', requireRoles('admin'), (req, res) => {
  const targetUserId = parseIdParam(req.params.id);
  const { ipAddress, userAgent } = getClientMeta(req);
  const user = deactivateAdminUser({
    actor: req.user,
    targetUserId,
    ipAddress,
    userAgent,
  });
  res.json({ ok: true, user: sanitizeUser(user) });
});

export default router;
