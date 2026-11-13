import { AppError } from './errorHandler.js';

function formatZodIssues(issues) {
  return issues.map((issue) => ({
    path: issue.path.join('.'),
    message: issue.message,
    code: issue.code,
  }));
}

export function validateBody(zodSchema) {
  return (req, _res, next) => {
    const result = zodSchema.safeParse(req.body ?? {});
    if (!result.success) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Nieprawidłowe dane wejściowe',
          formatZodIssues(result.error.issues)
        )
      );
    }

    req.body = result.data;
    return next();
  };
}

export function validateQuery(zodSchema) {
  return (req, _res, next) => {
    const result = zodSchema.safeParse(req.query ?? {});
    if (!result.success) {
      return next(
        new AppError(
          400,
          'VALIDATION_ERROR',
          'Nieprawidłowe parametry zapytania',
          formatZodIssues(result.error.issues)
        )
      );
    }

    req.validatedQuery = result.data;
    Object.defineProperty(req, 'query', {
      value: result.data,
      writable: true,
      enumerable: true,
      configurable: true,
    });
    return next();
  };
}
