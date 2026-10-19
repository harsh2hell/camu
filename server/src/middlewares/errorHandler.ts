import type { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { AppError } from '../errors/AppError.js';
import { logger } from '../lib/logger.js';
import { config } from '../config/env.js';
import type { ApiErrorResponse } from '../types/api.js';

export const errorHandler: ErrorRequestHandler = (
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction
): void => {
  let statusCode = 500;
  let code = 'INTERNAL_SERVER_ERROR';
  let message = 'An unexpected internal error occurred';
  let details: unknown = undefined;

  if (err instanceof AppError) {
    statusCode = err.statusCode;
    code = err.code;
    message = err.message;
    details = err.details;
  } else if (err instanceof SyntaxError && 'status' in err && (err as { status: number }).status === 400) {
    // Malformed JSON payload in request body
    statusCode = 400;
    code = 'MALFORMED_JSON';
    message = 'Request body contains invalid JSON';
  } else {
    // Unexpected system error
    logger.error(`Unhandled error during ${req.method} ${req.originalUrl}:`, {
      error: err instanceof Error ? err.message : String(err),
      stack: err instanceof Error ? err.stack : undefined,
    });
  }

  // Hide internal error details in production for 500s
  if (config.NODE_ENV === 'production' && statusCode === 500) {
    message = 'Internal server error';
    details = undefined;
  }

  const responseBody: ApiErrorResponse = {
    success: false,
    error: {
      code,
      message,
      ...(details ? { details } : {}),
    },
  };

  res.status(statusCode).json(responseBody);
};
