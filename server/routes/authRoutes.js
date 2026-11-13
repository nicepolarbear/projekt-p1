import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { loginRateLimiter } from '../middleware/rateLimit.js';
import { validateBody } from '../middleware/validate.js';
import { getClientMeta } from '../services/auditService.js';
import { changePassword, login, logout } from '../services/authService.js';
import { sanitizeUser } from '../services/userMapper.js';
import { COOKIE_NAME, clearSessionCookie, setSessionCookie } from '../utils/cookies.js';

const router = Router();

const loginSchema = z
  .object({
    email: z.string().trim().email('Nieprawidłowy format adresu e-mail').max(255),
    password: z.string().min(1, 'Hasło jest wymagane').max(256),
  })
  .strict();

const changePasswordSchema = z
  .object({
    current_password: z.string().min(1, 'Obecne hasło jest wymagane').max(256),
    new_password: z
      .string()
      .min(8, 'Nowe hasło musi mieć co najmniej 8 znaków')
      .max(256),
  })
  .strict();

function extractCookieToken(req) {
  if (req.cookies?.[COOKIE_NAME]) {
    return req.cookies[COOKIE_NAME];
  }
  const header = req.headers?.cookie;
  if (typeof header !== 'string') return null;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    if (part.slice(0, idx).trim() === COOKIE_NAME) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return null;
}

router.post('/login', loginRateLimiter, validateBody(loginSchema), async (req, res) => {
  const { ipAddress, userAgent } = getClientMeta(req);
  const { user, signedToken, ttlMs } = await login({
    email: req.body.email,
    password: req.body.password,
    ipAddress,
    userAgent,
  });

  setSessionCookie(res, signedToken, ttlMs);
  res.json({ user: sanitizeUser(user) });
});

router.post('/logout', (req, res) => {
  const { ipAddress, userAgent } = getClientMeta(req);
  logout({
    cookieToken: extractCookieToken(req),
    reqCookies: req.cookies,
    ipAddress,
    userAgent,
  });
  clearSessionCookie(res);
  res.json({ ok: true });
});

router.get('/me', requireAuth, (req, res) => {
  res.json({ user: sanitizeUser(req.user) });
});

router.post(
  '/change-password',
  requireAuth,
  validateBody(changePasswordSchema),
  async (req, res) => {
    const { ipAddress, userAgent } = getClientMeta(req);
    const { signedToken, ttlMs } = await changePassword({
      userId: req.user.id,
      sessionId: req.sessionId,
      currentPassword: req.body.current_password,
      newPassword: req.body.new_password,
      ipAddress,
      userAgent,
    });

    setSessionCookie(res, signedToken, ttlMs);
    res.json({ ok: true, message: 'Hasło zostało zmienione' });
  }
);

export default router;
