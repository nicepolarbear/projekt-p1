import { Router } from 'express';
import { z } from 'zod';
import { validateBody } from '../middleware/validate.js';
import { getClientMeta } from '../services/auditService.js';
import {
  checkSlugAvailable,
  createOrganization,
  joinWithCode,
  registerIndividual,
  verifyJoinCode,
} from '../services/onboardingService.js';
import { sanitizeUser } from '../services/userMapper.js';
import { setSessionCookie } from '../utils/cookies.js';

const router = Router();

const checkSlugSchema = z.object({
  slug: z.string().trim().min(2, 'Slug musi mieć co najmniej 2 znaki').max(80),
});

const registerIndividualSchema = z.object({
  first_name: z.string().trim().min(1, 'Imię jest wymagane').max(80),
  last_name: z.string().trim().min(1, 'Nazwisko jest wymagane').max(80),
  email: z.string().trim().email('Nieprawidłowy adres e-mail').max(255),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').max(256),
});

const createOrgSchema = z.object({
  first_name: z.string().trim().min(1, 'Imię jest wymagane').max(80),
  last_name: z.string().trim().min(1, 'Nazwisko jest wymagane').max(80),
  email: z.string().trim().email('Nieprawidłowy adres e-mail').max(255),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').max(256),
  org_name: z.string().trim().min(2, 'Nazwa firmy musi mieć co najmniej 2 znaki').max(120),
  org_slug: z.string().trim().min(2).max(80).optional(),
  industry: z.string().trim().max(100).optional(),
  size: z.string().trim().max(50).optional(),
});

const verifyCodeSchema = z.object({
  code: z.string().trim().min(2, 'Kod jest wymagany'),
});

const joinWithCodeSchema = z.object({
  code: z.string().trim().min(2, 'Kod jest wymagany'),
  first_name: z.string().trim().min(1, 'Imię jest wymagane').max(80),
  last_name: z.string().trim().min(1, 'Nazwisko jest wymagane').max(80),
  email: z.string().trim().email('Nieprawidłowy adres e-mail').max(255),
  password: z.string().min(8, 'Hasło musi mieć co najmniej 8 znaków').max(256),
});

// POST /api/onboarding/check-slug
router.post('/check-slug', validateBody(checkSlugSchema), async (req, res) => {
  const result = await checkSlugAvailable(req.body.slug);
  res.json(result);
});

// POST /api/onboarding/register-individual
router.post('/register-individual', validateBody(registerIndividualSchema), async (req, res) => {
  const meta = getClientMeta(req);
  const { user, signedToken, ttlMs } = await registerIndividual(req.body, meta);
  setSessionCookie(res, signedToken, ttlMs);
  res.status(201).json({ success: true, user: sanitizeUser(user) });
});

// POST /api/onboarding/create-organization
router.post('/create-organization', validateBody(createOrgSchema), async (req, res) => {
  const meta = getClientMeta(req);
  const { user, organization, signedToken, ttlMs } = await createOrganization(req.body, meta);
  setSessionCookie(res, signedToken, ttlMs);
  res.status(201).json({
    success: true,
    user: sanitizeUser(user),
    organization,
  });
});

// POST /api/onboarding/verify-join-code
router.post('/verify-join-code', validateBody(verifyCodeSchema), async (req, res) => {
  const result = await verifyJoinCode(req.body.code);
  res.json(result);
});

// POST /api/onboarding/join-with-code
router.post('/join-with-code', validateBody(joinWithCodeSchema), async (req, res) => {
  const meta = getClientMeta(req);
  const result = await joinWithCode(req.body, meta);
  res.status(201).json(result);
});

export default router;
