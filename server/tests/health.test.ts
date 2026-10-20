import { describe, it, expect } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';

describe('GET /api/health', () => {
  it('should return 200 with standard health check structure', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('success', true);
    expect(res.body).toHaveProperty('data');

    const { data } = res.body;
    expect(['ok', 'degraded']).toContain(data.status);
    expect(typeof data.timestamp).toBe('string');
    expect(typeof data.uptimeSeconds).toBe('number');
    expect(data.environment).toBeDefined();
    expect(data.system).toBeDefined();
    expect(data.system.nodeVersion).toBeDefined();
    expect(data.system.memoryUsageMb).toBeDefined();
    expect(data.database).toBeDefined();
    expect(['connected', 'disconnected']).toContain(data.database.status);
    expect(data.backgroundJobs).toBeDefined();
    expect(typeof data.backgroundJobs.isRunning).toBe('boolean');
  });

  it('should not expose database credentials, secrets or environment variables in health payload', async () => {
    const res = await request(app).get('/api/health');

    const jsonString = JSON.stringify(res.body);
    expect(jsonString).not.toContain('postgresql://');
    expect(jsonString).not.toContain('password');
    expect(jsonString).not.toContain('JWT_SECRET');
    expect(jsonString).not.toContain('DATABASE_URL');
  });

  it('should also respond successfully on root /health convenience shortcut', async () => {
    const res = await request(app).get('/health');

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.status).toBeDefined();
  });
});
