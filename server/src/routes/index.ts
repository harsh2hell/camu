import { Router } from 'express';
import { healthRouter } from './health.route.js';
import { authRouter } from './auth.route.js';
import { attendanceRouter } from './attendance.route.js';

export const apiRouter: Router = Router();

// Mount Phase 1 Health & Diagnostics
apiRouter.use('/health', healthRouter);

// Mount Phase 2 Authentication & Identity Management
apiRouter.use('/auth', authRouter);

// Mount Phase 3 Attendance & Academic Persistence
apiRouter.use('/attendance', attendanceRouter);

