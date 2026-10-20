import { z } from 'zod';
import dotenv from 'dotenv';

// Load local environment files (.env) if present
dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8000),
    HOST: z.string().default('127.0.0.1'),
    API_PREFIX: z.string().default('/api'),
    DATABASE_URL: z
      .string()
      .min(1, 'DATABASE_URL is required')
      .default('postgresql://dbs_admin:placeholder_password@localhost:5432/dbs_camu?schema=public'),
    CORS_ORIGINS: z
      .string()
      .default('http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173,https://autonex.studio,https://student.autonex.studio,https://teacher.autonex.studio'),
    LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
    JWT_SECRET: z.string().min(16, 'JWT_SECRET must be at least 16 characters').default('placeholder_dev_jwt_secret_minimum_16_chars'),
    RECEIPT_SIGNING_SECRET: z
      .string()
      .min(16, 'RECEIPT_SIGNING_SECRET must be at least 16 characters')
      .default('placeholder_dev_receipt_signing_secret_v1_min_16_chars'),
    RECEIPT_SIGNING_KEY_VERSION: z.string().min(1, 'RECEIPT_SIGNING_KEY_VERSION cannot be empty').default('v1'),
    RECEIPT_HISTORICAL_SIGNING_KEYS: z.string().default('{}'),
    SESSION_COOKIE_NAME: z.string().default('dbs_session'),
    SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(7),
    UPLOAD_DIR: z.string().default('server/uploads'),
    TRUST_PROXY: z.string().default('false'),
  })
  .refine(
    (data) => {
      // In production, reject default placeholder secrets
      if (data.NODE_ENV === 'production' && data.JWT_SECRET.includes('placeholder')) {
        return false;
      }
      return true;
    },
    {
      message: 'Production deployment cannot use placeholder JWT_SECRET',
      path: ['JWT_SECRET'],
    }
  )
  .refine(
    (data) => {
      // In production, reject placeholder receipt signing secret
      if (data.NODE_ENV === 'production' && data.RECEIPT_SIGNING_SECRET.includes('placeholder')) {
        return false;
      }
      return true;
    },
    {
      message: 'Production deployment cannot use placeholder RECEIPT_SIGNING_SECRET',
      path: ['RECEIPT_SIGNING_SECRET'],
    }
  )
  .refine(
    (data) => {
      // Validate RECEIPT_HISTORICAL_SIGNING_KEYS is valid JSON mapping string -> string (min 16 chars)
      try {
        const parsed = JSON.parse(data.RECEIPT_HISTORICAL_SIGNING_KEYS);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          return false;
        }
        for (const [key, secret] of Object.entries(parsed)) {
          if (typeof key !== 'string' || typeof secret !== 'string' || secret.length < 16) {
            return false;
          }
        }
        return true;
      } catch {
        return false;
      }
    },
    {
      message: 'RECEIPT_HISTORICAL_SIGNING_KEYS must be valid JSON object with secret strings of length >= 16',
      path: ['RECEIPT_HISTORICAL_SIGNING_KEYS'],
    }
  )
  .refine(
    (data) => {
      // In production, require real, non-placeholder DATABASE_URL
      if (
        data.NODE_ENV === 'production' &&
        (data.DATABASE_URL.includes('placeholder_password') || data.DATABASE_URL.includes('localhost'))
      ) {
        return false;
      }
      return true;
    },
    {
      message: 'Production deployment cannot use default placeholder or localhost DATABASE_URL',
      path: ['DATABASE_URL'],
    }
  );

export type EnvConfig = z.infer<typeof envSchema>;

/**
 * Validates raw environment dictionary without leaking sensitive values in error logs
 */
export function validateEnv(rawEnv: NodeJS.ProcessEnv = process.env): EnvConfig {
  const result = envSchema.safeParse(rawEnv);
  if (!result.success) {
    const issues = result.error.issues || (result.error as any).errors || [];
    const errorDetails = issues
      .map((err) => `${err.path.join('.')}: ${err.message}`)
      .join('; ');
    throw new Error(`[Configuration Error] Invalid environment configuration: ${errorDetails}`);
  }
  return result.data;
}

// Global parsed and validated configuration instance
export const config = validateEnv();

/**
 * Safely parses and returns configured historical receipt signing keys for rotation
 */
export function getHistoricalReceiptKeys(rawJson?: string): Record<string, string> {
  try {
    const jsonStr = rawJson ?? config.RECEIPT_HISTORICAL_SIGNING_KEYS;
    const parsed = JSON.parse(jsonStr);
    if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, string>;
    }
    return {};
  } catch {
    return {};
  }
}

