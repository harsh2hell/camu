import type { Request, Response, NextFunction } from 'express';
import { type ZodType, ZodError } from 'zod';
import { ValidationError } from '../errors/AppError.js';
import type { ApiErrorDetail } from '../types/api.js';

interface RequestValidationSchema {
  body?: ZodType<any>;
  query?: ZodType<any>;
  params?: ZodType<any>;
}

/**
 * Middleware factory to validate Express request body, query, or params with Zod schemas
 */
export function validate(schema: RequestValidationSchema) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (schema.body) {
        req.body = await schema.body.parseAsync(req.body);
      }
      if (schema.query) {
        const parsedQuery = (await schema.query.parseAsync(req.query)) as Request['query'];
        Object.defineProperty(req, 'query', { value: parsedQuery, writable: true, configurable: true });
      }
      if (schema.params) {
        const parsedParams = (await schema.params.parseAsync(req.params)) as Request['params'];
        Object.defineProperty(req, 'params', { value: parsedParams, writable: true, configurable: true });
      }
      next();
    } catch (err: unknown) {
      if (err instanceof ZodError) {
        const issues = err.issues || (err as any).errors || [];
        const details: ApiErrorDetail[] = issues.map((e: any) => ({
          field: Array.isArray(e.path) ? e.path.join('.') : String(e.path || ''),
          message: e.message,
          code: e.code,
        }));
        next(new ValidationError('Request validation failed', details));
      } else {
        next(err);
      }
    }
  };
}
