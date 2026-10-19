// Central API Client for DBS Global University Portal
// Ready to switch between local backend and production endpoints

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private getAuthHeaders(): HeadersInit {
    const token = localStorage.getItem('dbs_auth_token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    };
  }

  async get<T>(endpoint: string): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'GET',
        headers: this.getAuthHeaders(),
        credentials: 'include',
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('dbs-session-expired', { detail: { status: 401 } }));
        }
        let errMsg = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMsg = errData.error.message;
        } catch {
          // ignore json parse error
        }
        throw new Error(errMsg);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[API GET Failed: ${endpoint}]`, err);
      throw err;
    }
  }

  async post<T>(endpoint: string, body: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'POST',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('dbs-session-expired', { detail: { status: 401 } }));
        }
        let errMsg = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMsg = errData.error.message;
        } catch {
          // ignore json parse error
        }
        throw new Error(errMsg);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[API POST Failed: ${endpoint}]`, err);
      throw err;
    }
  }

  async put<T>(endpoint: string, body: any): Promise<T> {
    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        method: 'PUT',
        headers: this.getAuthHeaders(),
        credentials: 'include',
        body: JSON.stringify(body),
      });
      if (!response.ok) {
        if (response.status === 401) {
          window.dispatchEvent(new CustomEvent('dbs-session-expired', { detail: { status: 401 } }));
        }
        let errMsg = `HTTP Error: ${response.status} ${response.statusText}`;
        try {
          const errData = await response.json();
          if (errData?.error?.message) errMsg = errData.error.message;
        } catch {
          // ignore json parse error
        }
        throw new Error(errMsg);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[API PUT Failed: ${endpoint}]`, err);
      throw err;
    }
  }

  async checkHealth(): Promise<ApiResponse<{ status: string; timestamp: string; database: { status: string } }>> {
    return this.get('/health');
  }
}

export const apiClient = new ApiClient(API_BASE_URL);
