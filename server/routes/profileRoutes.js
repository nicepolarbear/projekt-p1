import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { validateBody } from '../middleware/validate.js';
import { getClientMeta } from '../services/auditService.js';
import {
  getProfileStats,
  updatePreferences,
  updateProfile,
} from '../services/profileService.js';
import { sanitizeUser } from '../services/userMapper.js';

const router = Router();
router.use(requireAuth);

const updateProfileSchema = z
  .object({
    first_name: z.string().trim().min(1, 'Imię nie może być puste').max(80).optional(),
    last_name: z.string().trim().min(1, 'Nazwisko nie może być puste').max(80).optional(),
    phone: z.string().trim().max(40).nullable().optional(),
    bio: z.string().trim().max(500).nullable().optional(),
    avatar_color: z
      .string()
      .trim()
      .regex(/^#[0-9a-fA-F]{6}$/, 'Kolor awatara musi być w formacie hex #RRGGBB')
      .optional(),
  })
  .strict();

const updatePreferencesSchema = z
  .object({
    compact_cards: z.boolean().optional(),
    auto_open_todo: z.boolean().optional(),
    confirm_delete: z.boolean().optional(),
  })
  .strict();

router.get('/', (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.patch('/', validateBody(updateProfileSchema), (req, res) => {
  const { ipAddress, userAgent } = getClientMeta(req);
  const user = updateProfile({
    userId: req.user.id,
    updates: req.body,
    ipAddress,
    userAgent,
  });
  res.json({ user: sanitizeUser(user) });
});

router.patch('/preferences', validateBody(updatePreferencesSchema), (req, res) => {
  const { ipAddress, userAgent } = getClientMeta(req);
  const preferences = updatePreferences({
    userId: req.user.id,
    prefs: req.body,
    ipAddress,
    userAgent,
  });
  res.json({ preferences });
});

router.get('/stats', (req, res) => {
  res.json(getProfileStats(req.user.id));
});

export default router;
