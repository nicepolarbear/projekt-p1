import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';

export const loginRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.NODE_ENV === 'test' ? 1000 : 20,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json({
      error: {
        code: 'RATE_LIMIT_EXCEEDED',
        message: 'Zbyt wiele prób logowania. Spróbuj ponownie później.',
        details: null,
      },
    });
  },
});
