import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { apiClient, ApiError } from '../src/api/client';
import { authApi } from '../src/api/auth';

describe('Shared API Client & Auth Client Verification (Phase 15)', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('1. should include credentials and content-type in standard GET requests', async () => {
    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ success: true, data: { status: 'healthy' } }),
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const res = await apiClient.get<{ success: boolean; data: { status: string } }>('/health');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/health');
    expect(init?.credentials).toBe('include');
    expect((init?.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    expect(res).toEqual({ success: true, data: { status: 'healthy' } });
  });

  it('2. should deduplicate simultaneous in-flight GET requests to the same endpoint', async () => {
    let resolveFirstFetch: (value: any) => void;
    const fetchPromise = new Promise((resolve) => {
      resolveFirstFetch = resolve;
    });

    const mockResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ success: true, data: { cached: true } }),
    };

    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(() => {
      return fetchPromise.then(() => mockResponse) as any;
    });

    // Fire two identical GET requests concurrently
    const req1 = apiClient.get('/profile/me');
    const req2 = apiClient.get('/profile/me');

    // Both should share the same fetch promise
    resolveFirstFetch!(mockResponse);

    const [res1, res2] = await Promise.all([req1, req2]);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(res1).toEqual({ success: true, data: { cached: true } });
    expect(res2).toEqual({ success: true, data: { cached: true } });
  });

  it('3. should throw typed ApiError on HTTP 401 Unauthorized', async () => {
    const mockErrorResponse = {
      ok: false,
      status: 401,
      statusText: 'Unauthorized',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({
        success: false,
        error: { message: 'Session expired or invalid cookie' },
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockErrorResponse as any);

    await expect(apiClient.get('/attendance/my-summary')).rejects.toThrow(ApiError);
    try {
      await apiClient.get('/attendance/my-summary');
    } catch (err: any) {
      expect(err).toBeInstanceOf(ApiError);
      expect(err.statusCode).toBe(401);
      expect(err.isUnauthorized).toBe(true);
      expect(err.message).toBe('Session expired or invalid cookie');
    }
  });

  it('4. should handle multipart/form-data uploads via upload() without manual Content-Type override', async () => {
    const mockResponse = {
      ok: true,
      status: 201,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({ success: true, data: { fileUrl: '/uploads/doc.pdf' } }),
    };
    const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockResponse as any);

    const formData = new FormData();
    formData.append('title', 'Assignment Solution');

    const result = await apiClient.upload<{ success: boolean; data: { fileUrl: string } }>('/assignments/upload', formData);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0];
    expect(url).toBe('/api/assignments/upload');
    expect(init?.method).toBe('POST');
    expect(init?.body).toBe(formData);
    // Crucial: Content-Type must not be forced to application/json so browser sets multipart boundary
    const headers = init?.headers as Record<string, string> | undefined;
    expect(headers?.['Content-Type']).toBeUndefined();
    expect(result).toEqual({ success: true, data: { fileUrl: '/uploads/doc.pdf' } });
  });

  it('5. authApi.login should NOT store session tokens in localStorage', async () => {
    const mockLoginResponse = {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: vi.fn().mockResolvedValue({
        success: true,
        data: {
          user: {
            id: 'u1',
            email: 'student.dev@dgu.ac.in',
            fullName: 'Test Student',
            role: 'STUDENT',
          },
        },
      }),
    };
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(mockLoginResponse as any);

    // Mock localStorage
    const storage: Record<string, string> = {};
    const localMock = {
      getItem: vi.fn((k: string) => storage[k] || null),
      setItem: vi.fn((k: string, v: string) => { storage[k] = v; }),
      removeItem: vi.fn((k: string) => { delete storage[k]; }),
      clear: vi.fn(() => {}),
      length: 0,
      key: vi.fn(() => null),
    };
    vi.stubGlobal('localStorage', localMock);

    const session = await authApi.login('student.dev@dgu.ac.in', 'Password@Dev123');

    expect(session.email).toBe('student.dev@dgu.ac.in');
    expect(localMock.setItem).not.toHaveBeenCalledWith('dbs_auth_token', expect.anything());
    expect(storage['dbs_auth_token']).toBeUndefined();
  });
});
