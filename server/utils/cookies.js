import { env } from '../config/env.js';

export const COOKIE_NAME = 'taskflow_sid';

const BASE_COOKIE_OPTIONS = {
  httpOnly: true,
  sameSite: 'lax',
  secure: env.NODE_ENV === 'production',
  path: '/',
};

export function setSessionCookie(res, token, maxAgeMs) {
  res.cookie(COOKIE_NAME, token, {
    ...BASE_COOKIE_OPTIONS,
    ...(typeof maxAgeMs === 'number' ? { maxAge: maxAgeMs } : {}),
  });
}

export function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, BASE_COOKIE_OPTIONS);
}
