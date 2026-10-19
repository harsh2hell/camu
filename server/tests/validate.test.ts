import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Router } from 'express';
import { z } from 'zod';
import { validate } from '../src/middlewares/validate.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';

describe('Zod Request Validation Middleware', () => {
  const testApp = express();
  testApp.use(express.json());

  const sampleSchema = {
    body: z.object({
      rollNumber: z.string().min(5, 'Roll number must be at least 5 characters'),
      semester: z.number().int().min(1).max(8),
    }),
    query: z.object({
      active: z.enum(['true', 'false']).optional(),
    }),
  };

  const testRouter = Router();
  testRouter.post('/validate-test', validate(sampleSchema), (req, res) => {
    res.json({ success: true, data: req.body });
  });

  testApp.use(testRouter);
  testApp.use(errorHandler);

  it('should accept and pass through valid payload', async () => {
    const res = await request(testApp)
      .post('/validate-test')
      .send({ rollNumber: '0251BTCS097', semester: 5 });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.rollNumber).toBe('0251BTCS097');
  });

  it('should reject invalid payload with 422 and structured field errors', async () => {
    const res = await request(testApp)
      .post('/validate-test')
      .send({ rollNumber: '123', semester: 12 });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.message).toBe('Request validation failed');
    expect(Array.isArray(res.body.error.details)).toBe(true);

    const fields = res.body.error.details.map((d: any) => d.field);
    expect(fields).toContain('rollNumber');
    expect(fields).toContain('semester');
  });
});
