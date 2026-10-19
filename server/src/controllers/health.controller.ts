import type { Request, Response, NextFunction } from 'express';
import { healthService } from '../services/health.service.js';
import type { ApiResponse } from '../types/api.js';

export class HealthController {
  async getHealth(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await healthService.getHealth();
      const response: ApiResponse<typeof data> = {
        success: true,
        data,
      };

      // Server is operational; if DB is offline, return 200 with degraded status so monitoring doesn't kill container prematurely
      res.status(200).json(response);
    } catch (err) {
      next(err);
    }
  }
}

export const healthController = new HealthController();
