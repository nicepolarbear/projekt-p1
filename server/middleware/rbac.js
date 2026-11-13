import { AppError } from './errorHandler.js';

export function requireRoles(...allowedRoles) {
  return (req, _res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, 'FORBIDDEN', 'Brak uprawnień do wykonania tej operacji')
      );
    }
    return next();
  };
}

export function requirePermission(permissionName) {
  return (req, _res, next) => {
    if (!req.user) {
      return next(new AppError(401, 'UNAUTHORIZED', 'Wymagane logowanie'));
    }
    const perms = req.user.permissions || {};
    const hasPerm =
      perms.is_admin ||
      req.user.role === 'admin' ||
      req.user.role === 'dyrektor' ||
      Boolean(perms[permissionName]);

    if (!hasPerm) {
      return next(
        new AppError(403, 'FORBIDDEN', 'Brak wymaganych uprawnień do wykonania tej operacji')
      );
    }
    return next();
  };
}
