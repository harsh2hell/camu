import express, { type Application, type Request, type Response, type NextFunction } from 'express';
import cookieParser from 'cookie-parser';
import { corsMiddleware } from './middlewares/cors.js';
import { errorHandler } from './middlewares/errorHandler.js';
import { notFoundHandler } from './middlewares/notFound.js';
import { apiRouter } from './routes/index.js';
import { healthRouter } from './routes/health.route.js';
import { logger } from './lib/logger.js';
import { config } from './config/env.js';

export function createApp(): Application {
  const app: Application = express();

  // 0. Reverse Proxy Configuration (Strictly configured for trusted hops or networks, never blindly 'true')
  if (config.TRUST_PROXY === 'false' || config.TRUST_PROXY === '0') {
    app.set('trust proxy', false);
  } else if (/^\d+$/.test(config.TRUST_PROXY)) {
    app.set('trust proxy', parseInt(config.TRUST_PROXY, 10));
  } else {
    app.set('trust proxy', config.TRUST_PROXY);
  }

  // 1. Security & CORS
  app.use(corsMiddleware);

  // 1b. Defense-in-depth HTTP Security Headers
  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    if (config.NODE_ENV === 'production') {
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    }
    next();
  });

  // 2. Cookie Parser & Body Parser with explicit payload size limits (15mb for assignment submissions)
  app.use(cookieParser());
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // 3. Request Logging & Correlation (without logging passwords or secrets)
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const durationMs = Date.now() - start;
      logger.info(`${req.method} ${req.originalUrl} ${res.statusCode} [${durationMs}ms]`);
    });
    next();
  });

  // 4. Primary API Routers
  // Root health convenience shortcut
  app.use('/health', healthRouter);

  // Mount API prefix (default: /api)
  app.use(config.API_PREFIX, apiRouter);

  // 5. 404 Catch-All Handler
  app.use(notFoundHandler);

  // 6. Centralized Error Handler
  app.use(errorHandler);

  return app;
}

export const app = createApp();
