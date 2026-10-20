import { Router } from 'express';
import { healthRouter } from './health.route.js';
import { authRouter } from './auth.route.js';
import { attendanceRouter } from './attendance.route.js';
import { timetableRouter } from './timetable.route.js';
import { calendarRouter } from './calendar.route.js';
import { assignmentRouter } from './assignment.route.js';
import { financeRouter } from './finance.route.js';
import { leaveRouter } from './leave.route.js';
import { noticeRouter } from './notice.route.js';
import { profileRouter } from './profile.route.js';
import { supportRouter } from './support.route.js';
import { notificationRouter } from './notification.route.js';

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

// Mount Phase 6 Fees & Finance
apiRouter.use('/finance', financeRouter);

// Mount Phase 7 Leave & On-Duty Management
apiRouter.use('/leave-od', leaveRouter);

// Mount Phase 8 Notices & Announcements Management
apiRouter.use('/notices', noticeRouter);

// Mount Phase 9 Student Profile & Academic Records
apiRouter.use('/profile', profileRouter);

// Mount Phase 10 Student Support & Helpdesk
apiRouter.use('/support', supportRouter);

// Mount Phase 11 Notifications & Communication Center
apiRouter.use('/notifications', notificationRouter);
