import { z } from 'zod';
import dotenv from 'dotenv';

// Load local environment files (.env) if present
dotenv.config();

export const envSchema = z
  .object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().int().positive().default(8000),
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
    SESSION_COOKIE_NAME: z.string().default('dbs_session'),
    SESSION_MAX_AGE_DAYS: z.coerce.number().int().positive().default(7),
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
