import { Router } from 'express';
import { healthRouter } from './health.route.js';
import { authRouter } from './auth.route.js';
import { attendanceRouter } from './attendance.route.js';
import { timetableRouter } from './timetable.route.js';
import { calendarRouter } from './calendar.route.js';
import { assignmentRouter } from './assignment.route.js';

export const apiRouter: Router = Router();

// Mount Phase 1 Health & Diagnostics
apiRouter.use('/health', healthRouter);

// Mount Phase 2 Authentication & Identity Management
apiRouter.use('/auth', authRouter);

// Mount Phase 3 Attendance & Academic Persistence
apiRouter.use('/attendance', attendanceRouter);

// Mount Phase 4 Timetable & Academic Calendar Integration
apiRouter.use('/timetable', timetableRouter);
apiRouter.use('/calendar', calendarRouter);

// Mount Phase 5 Assignments & LMS Implementation
apiRouter.use('/assignments', assignmentRouter);


