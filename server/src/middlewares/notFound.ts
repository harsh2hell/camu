import type { Request, Response } from 'express';
import type { ApiErrorResponse } from '../types/api.js';

export function notFoundHandler(req: Request, res: Response): void {
  const response: ApiErrorResponse = {
    success: false,
    error: {
      code: 'ROUTE_NOT_FOUND',
      message: `Cannot ${req.method} ${req.originalUrl} - Endpoint does not exist`,
    },
  };
  res.status(404).json(response);
}
