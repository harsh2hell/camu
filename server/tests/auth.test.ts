import { describe, it, expect, beforeEach } from 'vitest';
import request from 'supertest';
import { app } from '../src/app.js';
import { sessionRepository } from '../src/repositories/session.repository.js';
import { config } from '../src/config/env.js';

function getCookies(res: request.Response): string[] {
  const raw = res.headers['set-cookie'];
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

describe('Phase 2: Authentication & Identity Management', () => {
  beforeEach(() => {
    // Reset session store between tests for full isolation
    sessionRepository.clearMemoryStore();
  });

  // 1. Valid Login
  it('1. should login successfully with valid development credentials and return safe user with session cookie', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user).toBeDefined();
    expect(res.body.data.user.email).toBe('student.dev@dgu.ac.in');
    expect(res.body.data.user.role).toBe('STUDENT');
    expect(res.body.data.token).toBeDefined();

    // Verify Set-Cookie header contains HttpOnly session cookie
    const cookies = getCookies(res);
    expect(cookies.length).toBeGreaterThan(0);
    const sessionCookie = cookies.find((c) => c.startsWith(`${config.SESSION_COOKIE_NAME}=`));
    expect(sessionCookie).toBeDefined();
    expect(sessionCookie).toContain('HttpOnly');
    expect(sessionCookie).toContain('Path=/');
    expect(sessionCookie).toContain('SameSite=Lax');
  });

  // 1b. Valid Login by Roll Number
  it('1b. should login successfully using student roll number identifier', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: '0251BTCS097',
        password: 'Password@Dev123',
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.studentProfile.rollNumber).toBe('0251BTCS097');
  });

  // 2. Incorrect Password
  it('2. should reject login with incorrect password with 401 Unauthorized', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'WrongPassword999!',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
    expect(res.body.error.message).toBe('Invalid credentials');
  });

  // 3. Missing or Malformed Fields
  it('3. should reject login with missing or malformed fields with 422 Validation Error', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: '',
      });

    expect(res.status).toBe(422);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(Array.isArray(res.body.error.details)).toBe(true);
  });

  // 4. Access /api/auth/me without session
  it('4. should reject accessing /api/auth/me without session with 401 Unauthorized', async () => {
    const res = await request(app).get('/api/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 5. Access /api/auth/me with valid session cookie and Bearer token
  it('5. should allow accessing /api/auth/me with valid session cookie and return safe profile', async () => {
    // Login to obtain cookie
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    const cookies = getCookies(loginRes);
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(meRes.status).toBe(200);
    expect(meRes.body.success).toBe(true);
    expect(meRes.body.data.user.email).toBe('student.dev@dgu.ac.in');
    expect(meRes.body.data.user.fullName).toContain('Harendra Pratap Singh');

    // Also test Bearer token header support
    const bearerRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${loginRes.body.data.token}`);

    expect(bearerRes.status).toBe(200);
    expect(bearerRes.body.data.user.email).toBe('student.dev@dgu.ac.in');
  });

  // 6. Logout and Subsequent Invalidation
  it('6. should logout successfully, clear cookie, and invalidate server session', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    const cookies = getCookies(loginRes);

    // Call logout
    const logoutRes = await request(app)
      .post('/api/auth/logout')
      .set('Cookie', cookies);

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.success).toBe(true);

    // Verify cookie was cleared
    const clearedCookies = getCookies(logoutRes);
    expect(clearedCookies[0]).toMatch(/dbs_session=;/);

    // Subsequent call to /me with the old cookie must now be rejected
    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', cookies);

    expect(meRes.status).toBe(401);
  });

  // 7. Expired Session Handling
  it('7. should reject expired sessions with 401 Unauthorized', async () => {
    const expiredToken = 'expired-test-token-12345';
    await sessionRepository.createSession({
      userId: 'dev-student-uuid-001',
      expiresAt: new Date(Date.now() - 60000), // 1 minute in the past
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.status).toBe(401);
  });

  // 8. Server-Side Role-Based Authorization
  it('8. should enforce server-side RBAC and block students from faculty endpoints with 403 Forbidden', async () => {
    // Login as Student
    const studentLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    const studentCookies = getCookies(studentLogin);

    // Student attempts to access faculty verification endpoint
    const forbiddenRes = await request(app)
      .get('/api/auth/faculty-verify')
      .set('Cookie', studentCookies);

    expect(forbiddenRes.status).toBe(403);
    expect(forbiddenRes.body.success).toBe(false);
    expect(forbiddenRes.body.error.code).toBe('FORBIDDEN');
    expect(forbiddenRes.body.error.message).toContain('Access restricted');

    // Login as Faculty
    const facultyLogin = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'faculty.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    const facultyCookies = getCookies(facultyLogin);

    // Faculty accesses the same endpoint
    const allowedRes = await request(app)
      .get('/api/auth/faculty-verify')
      .set('Cookie', facultyCookies);

    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.success).toBe(true);
    expect(allowedRes.body.data.faculty.role).toBe('FACULTY');
  });

  // 9. Attempt to self-assign privileged role at login
  it('9. should reject student login attempt with mismatched expectedRole FACULTY', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
        expectedRole: 'FACULTY',
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  // 10. Password hashes never returned in API responses
  it('10. should NEVER expose passwordHash or credentials in any API response', async () => {
    const loginRes = await request(app)
      .post('/api/auth/login')
      .send({
        identifier: 'student.dev@dgu.ac.in',
        password: 'Password@Dev123',
      });

    const rawLoginBody = JSON.stringify(loginRes.body);
    expect(rawLoginBody).not.toContain('passwordHash');
    expect(rawLoginBody).not.toContain('$2a$');
    expect(rawLoginBody).not.toContain('$2b$');

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Cookie', getCookies(loginRes));

    const rawMeBody = JSON.stringify(meRes.body);
    expect(rawMeBody).not.toContain('passwordHash');
    expect(rawMeBody).not.toContain('$2a$');
    expect(rawMeBody).not.toContain('$2b$');
  });

  // 11. CORS preflight and credentials
  it('11. should allow credentials and specify explicit origin on CORS requests', async () => {
    const res = await request(app)
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173')
      .set('Access-Control-Request-Method', 'POST');

    expect(res.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(res.headers['access-control-allow-credentials']).toBe('true');
  });
});
