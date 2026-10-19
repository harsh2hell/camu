import { Router } from 'express';
import { authController } from '../controllers/auth.controller.js';
import { validate } from '../middlewares/validate.js';
import { requireAuth, requireRole } from '../middlewares/auth.middleware.js';
import { loginRateLimiter } from '../middlewares/rateLimiter.js';
import { loginSchema } from '../types/auth.js';

export const authRouter: Router = Router();

// 1. Session Login with rate limit protection
authRouter.post('/login', loginRateLimiter, validate({ body: loginSchema }), (req, res, next) =>
  authController.login(req, res, next)
);

// 2. Session Logout
authRouter.post('/logout', (req, res, next) =>
  authController.logout(req, res, next)
);

// 3. Current Authenticated User Profile
authRouter.get('/me', requireAuth, (req, res, next) =>
  authController.getCurrentUser(req, res, next)
);

// 4. Server-Side RBAC Guard Test Endpoint (Faculty & Admin access only)
authRouter.get(
  '/faculty-verify',
  requireAuth,
  requireRole('FACULTY', 'HOD', 'DEAN', 'REGISTRAR_ADMIN'),
  (req, res) => {
    res.status(200).json({
      success: true,
      data: {
        message: 'Faculty authorization verified by server',
        faculty: req.user,
      },
    });
  }
);
