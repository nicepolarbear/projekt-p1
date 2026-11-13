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
