import { env } from '../config/env.js';

export class ApiClientError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly details?: unknown[];

  constructor(message: string, statusCode: number, code = 'API_ERROR', details?: unknown[]) {
    super(message);
    this.name = 'ApiClientError';
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
  }
}

export interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined>;
}

export class ApiClient {
  private readonly baseUrl: string;

  constructor(baseUrl: string = env.VITE_API_URL) {
    this.baseUrl = baseUrl.replace(/\/+$/, '');
  }

  private buildUrl(path: string, params?: RequestOptions['params']): string {
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    const url = new URL(`${this.baseUrl}${cleanPath}`, window.location.origin);

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    return url.toString();
  }

  public async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, credentials = 'include', ...rest } = options;
    const url = this.buildUrl(path, params);

    const mergedHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(headers as Record<string, string>),
    };

    const response = await fetch(url, {
      ...rest,
      credentials, // Ensure cookies (sso_session) are always included
      headers: mergedHeaders,
    });

    const isJson = response.headers.get('content-type')?.includes('application/json');
    const data = isJson ? await response.json() : null;

    if (!response.ok) {
      const errorPayload = data?.error || data;
      const message = errorPayload?.message || `HTTP ${response.status} ${response.statusText}`;
      const code = errorPayload?.code || 'HTTP_ERROR';
      const details = errorPayload?.details;

      throw new ApiClientError(message, response.status, code, details);
    }

    return data as T;
  }

  public get<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'GET' });
  }

  public post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'POST',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PUT',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, {
      ...options,
      method: 'PATCH',
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(path: string, options?: RequestOptions): Promise<T> {
    return this.request<T>(path, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
