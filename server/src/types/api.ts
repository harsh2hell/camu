/**
 * Standard API Response Structures for Camu-Next Backend
 * Aligned with frontend ApiResponse<T> contract in src/api/client.ts
 */

export interface ApiResponse<T> {
  success: true;
  data: T;
  message?: string;
}

export interface ApiErrorDetail {
  field?: string;
  message: string;
  code?: string;
}

export interface ApiErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: ApiErrorDetail[] | unknown;
  };
}

export type StandardResponse<T> = ApiResponse<T> | ApiErrorResponse;
