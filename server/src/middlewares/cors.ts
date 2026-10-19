import cors, { type CorsOptions } from 'cors';
import { config } from '../config/env.js';
import { ForbiddenError } from '../errors/AppError.js';

const rawOrigins = config.CORS_ORIGINS.split(',').map((o) => o.trim());

export const corsOptions: CorsOptions = {
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, server-to-server) where origin is undefined
    if (!origin) {
      return callback(null, true);
    }

    // Check exact matches
    if (rawOrigins.includes(origin)) {
      return callback(null, true);
    }

    // Check subdomain matching for university & project domains
    try {
      const url = new URL(origin);
      if (
        url.hostname.endsWith('.autonex.studio') ||
        url.hostname === 'autonex.studio' ||
        url.hostname.endsWith('.dgu.ac.in') ||
        url.hostname === 'dgu.ac.in' ||
        url.hostname === 'localhost' ||
        url.hostname.endsWith('.localhost')
      ) {
        return callback(null, true);
      }
    } catch {
      // Ignore URL parsing error
    }

    return callback(new ForbiddenError(`Origin ${origin} not allowed by CORS policy`), false);
  },

  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  maxAge: 86400, // 24 hours preflight cache
};

export const corsMiddleware = cors(corsOptions);
