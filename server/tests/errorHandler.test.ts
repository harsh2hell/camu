import { describe, it, expect } from 'vitest';
import request from 'supertest';
import express, { Router } from 'express';
import { createApp } from '../src/app.js';
import { BadRequestError, NotFoundError } from '../src/errors/AppError.js';
import { errorHandler } from '../src/middlewares/errorHandler.js';

describe('Centralized Error Handler & 404 Routing', () => {
  const app = createApp();

  it('should return 404 with structured JSON on non-existent endpoints', async () => {
    const res = await request(app).get('/api/v1/non-existent-route-xyz');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      success: false,
      error: {
        code: 'ROUTE_NOT_FOUND',
        message: expect.stringContaining('/api/v1/non-existent-route-xyz'),
      },
    });
  });

  it('should return 400 for malformed JSON payloads', async () => {
    const res = await request(app)
      .post('/api/health')
      .set('Content-Type', 'application/json')
      .send('{"broken_json": ');

    expect(res.status).toBe(400);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('MALFORMED_JSON');
  });

  it('should properly format custom AppErrors with correct status code and details', async () => {
    const testApp = express();
    testApp.use(express.json());

    const testRouter = Router();
    testRouter.get('/bad-request', () => {
      throw new BadRequestError('Invalid query parameters provided', { field: 'page', issue: 'must be positive' });
    });
    testRouter.get('/not-found', () => {
      throw new NotFoundError('Student record could not be found');
    });

    testApp.use(testRouter);
    testApp.use(errorHandler);

    const badReqRes = await request(testApp).get('/bad-request');
    expect(badReqRes.status).toBe(400);
    expect(badReqRes.body).toEqual({
      success: false,
      error: {
        code: 'BAD_REQUEST',
        message: 'Invalid query parameters provided',
        details: { field: 'page', issue: 'must be positive' },
      },
    });

    const notFoundRes = await request(testApp).get('/not-found');
    expect(notFoundRes.status).toBe(404);
    expect(notFoundRes.body).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Student record could not be found',
      },
    });
  });
});
