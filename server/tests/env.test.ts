import { describe, it, expect } from 'vitest';
import { validateEnv } from '../src/config/env.js';

describe('Environment Configuration Validation', () => {
  it('should accept valid development configuration with defaults', () => {
    const validConfig = validateEnv({
      NODE_ENV: 'development',
      PORT: '8080',
      DATABASE_URL: 'postgresql://user:pass@localhost:5432/dbs',
    });

    expect(validConfig.NODE_ENV).toBe('development');
    expect(validConfig.PORT).toBe(8080);
    expect(validConfig.DATABASE_URL).toBe('postgresql://user:pass@localhost:5432/dbs');
  });

  it('should reject invalid NODE_ENV', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'invalid_env' as any,
      })
    ).toThrowError(/Invalid environment configuration/);
  });

  it('should reject placeholder JWT_SECRET in production mode', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'placeholder_dev_jwt_secret_min_16_chars',
      })
    ).toThrowError(/Production deployment cannot use placeholder JWT_SECRET/);
  });

  it('should reject placeholder DATABASE_URL in production mode', () => {
    expect(() =>
      validateEnv({
        NODE_ENV: 'production',
        JWT_SECRET: 'super_secure_production_secret_key_32_chars_minimum',
        DATABASE_URL: 'postgresql://dbs_admin:placeholder_password@localhost:5432/dbs_camu?schema=public',
      })
    ).toThrowError(/Production deployment cannot use default placeholder or localhost DATABASE_URL/);
  });

  it('should accept production mode with a custom non-placeholder secret and production database URL', () => {
    const prodConfig = validateEnv({
      NODE_ENV: 'production',
      JWT_SECRET: 'super_secure_production_secret_key_32_chars_minimum',
      DATABASE_URL: 'postgresql://dbs_prod_user:strong_prod_pass_992@db.dgu.ac.in:5432/dbs_camu_prod?sslmode=require',
    });

    expect(prodConfig.NODE_ENV).toBe('production');
    expect(prodConfig.JWT_SECRET).toBe('super_secure_production_secret_key_32_chars_minimum');
    expect(prodConfig.DATABASE_URL).toContain('db.dgu.ac.in');
  });
});
