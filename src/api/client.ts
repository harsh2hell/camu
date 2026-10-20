// Central API Client for DBS Global University Portal (Camu-Next)
// Supports development proxy (/api) and production reverse proxy with HTTP-only cookies

export interface ApiResponse<T> {
  success?: boolean;
  status?: string;
  data: T;
  message?: string;
  count?: number;
  unreadCount?: number;
}

export class ApiError extends Error {
  statusCode: number;
  details?: any;

  constructor(message: string, statusCode: number, details?: any) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.details = details;
  }

  get isUnauthorized(): boolean {
    return this.statusCode === 401;
  }

  get isForbidden(): boolean {
    return this.statusCode === 403;
  }
}

// In-flight request cache to deduplicate simultaneous identical GET requests
const inFlightRequests = new Map<string, Promise<any>>();

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl?: string) {
    // Default to relative '/api' to leverage Vite dev proxy and production reverse proxy
    this.baseUrl = baseUrl || (import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL : '/api');
  }

  public getBaseUrl(): string {
    return this.baseUrl;
  }

  private buildUrl(endpoint: string): string {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${this.baseUrl}${cleanEndpoint}`;
  }

  private async parseErrorResponse(response: Response): Promise<string> {
    try {
      const contentType = response.headers.get('content-type');
      if (contentType && contentType.includes('application/json')) {
        const errJson = await response.json();
        if (typeof errJson?.error === 'string') return errJson.error;
        if (errJson?.error?.message) return errJson.error.message;
        if (Array.isArray(errJson?.error) && errJson.error.length > 0) {
          return errJson.error.map((e: any) => e.message || `${e.path?.join('.')}: invalid`).join(', ');
        }
        if (errJson?.message) return errJson.message;
      }
    } catch {
      // Ignore JSON parse errors on error responses
    }
    return `HTTP ${response.status}: ${response.statusText || 'Request failed'}`;
  }

  private handleUnauthorized(status: number) {
    if (status === 401 && typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      // Inform the App shell that session has expired
      window.dispatchEvent(new CustomEvent('dbs-session-expired', { detail: { status: 401 } }));
    }
  }

  async get<T>(endpoint: string, options: { bypassCache?: boolean } = {}): Promise<T> {
    const url = this.buildUrl(endpoint);

    // Deduplicate in-flight GET requests
    if (!options.bypassCache && inFlightRequests.has(url)) {
      return inFlightRequests.get(url)!;
    }

    const requestPromise = (async () => {
      try {
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include', // Automatically passes HTTP-only session cookies
        });

        if (!response.ok) {
          this.handleUnauthorized(response.status);
          const errMsg = await this.parseErrorResponse(response);
          throw new ApiError(errMsg, response.status);
        }

        return (await response.json()) as T;
      } finally {
        inFlightRequests.delete(url);
      }
    })();

    if (!options.bypassCache) {
      inFlightRequests.set(url, requestPromise);
    }

    return requestPromise;
  }

  async post<T>(endpoint: string, body?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      const errMsg = await this.parseErrorResponse(response);
      throw new ApiError(errMsg, response.status);
    }

    return (await response.json()) as T;
  }

  async put<T>(endpoint: string, body?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      const errMsg = await this.parseErrorResponse(response);
      throw new ApiError(errMsg, response.status);
    }

    return (await response.json()) as T;
  }

  async patch<T>(endpoint: string, body?: any): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      const errMsg = await this.parseErrorResponse(response);
      throw new ApiError(errMsg, response.status);
    }

    return (await response.json()) as T;
  }

  async delete<T>(endpoint: string): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      const errMsg = await this.parseErrorResponse(response);
      throw new ApiError(errMsg, response.status);
    }

    return (await response.json()) as T;
  }

  /**
   * Multipart file upload (omits Content-Type so browser sets boundary automatically)
   */
  async upload<T>(endpoint: string, formData: FormData): Promise<T> {
    const url = this.buildUrl(endpoint);
    const response = await fetch(url, {
      method: 'POST',
      credentials: 'include',
      body: formData,
    });

    if (!response.ok) {
      this.handleUnauthorized(response.status);
      const errMsg = await this.parseErrorResponse(response);
      throw new ApiError(errMsg, response.status);
    }

    return (await response.json()) as T;
  }

  async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string; database: { status: string } }>> {
    return this.get('/health');
  }
}

export const apiClient = new ApiClient();
