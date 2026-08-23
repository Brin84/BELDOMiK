import { API_ENDPOINTS } from './endpoints';
import { useAuthStore } from '@/features/auth/authStore';

const API_BASE_URL = import.meta.env.VITE_API_URL || '';

class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly message: string,
    public readonly data?: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }

  static async fromResponse(response: Response): Promise<ApiError> {
    let data: unknown;
    let message = response.statusText;

    try {
      data = await response.json();
      if (typeof data === 'object' && data !== null && 'detail' in data) {
        const detail = (data as { detail: unknown }).detail;
        message = typeof detail === 'string' ? detail : JSON.stringify(detail);
      }
    } catch {
      message = response.statusText;
    }

    return new ApiError(response.status, message, data);
  }
}

class AuthError extends Error {
  constructor() {
    super('Authentication required');
    this.name = 'AuthError';
  }
}

interface RequestOptions extends RequestInit {
  params?: Record<string, string | number | boolean | undefined | null>;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
  const url = new URL(path, API_BASE_URL);
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        if (Array.isArray(value)) {
          value.forEach(v => url.searchParams.append(key, String(v)));
        } else {
          url.searchParams.set(key, String(value));
        }
      }
    });
  }
  return url.toString();
}

class ApiClient {
  private refreshPromise: Promise<boolean> | null = null;

  private getAccessToken(): string | null {
    return useAuthStore.getState().accessToken;
  }

  private getRefreshToken(): string | null {
    return useAuthStore.getState().refreshToken;
  }

  private setTokens(accessToken: string, refreshToken: string): void {
    useAuthStore.getState().setTokens(accessToken, refreshToken);
  }

  private clearTokens(): void {
    useAuthStore.getState().logout();
  }

  private async doRefresh(): Promise<boolean> {
    const refreshToken = this.getRefreshToken();
    if (!refreshToken) return false;

    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = (async () => {
      try {
        const response = await fetch(buildUrl(API_ENDPOINTS.auth.refresh), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refresh_token: refreshToken }),
        });

        if (!response.ok) {
          this.clearTokens();
          return false;
        }

        const data = await response.json();
        this.setTokens(data.access_token, data.refresh_token);
        return true;
      } catch {
        this.clearTokens();
        return false;
      } finally {
        this.refreshPromise = null;
      }
    })();

    return this.refreshPromise;
  }

  async request<T>(path: string, options: RequestOptions = {}): Promise<T> {
    const { params, headers, ...init } = options;
    const url = buildUrl(path, params);

    const makeRequest = async (): Promise<Response> => {
      return fetch(url, {
        ...init,
        headers: {
          'Content-Type': 'application/json',
          ...(this.getAccessToken() ? { Authorization: `Bearer ${this.getAccessToken()}` } : {}),
          ...headers,
        },
      });
    };

    let response = await makeRequest();

    if (response.status === 401 && this.getRefreshToken() && path !== API_ENDPOINTS.auth.refresh) {
      const refreshed = await this.doRefresh();
      if (refreshed) {
        response = await makeRequest();
      } else {
        throw new AuthError();
      }
    }

    if (!response.ok) {
      throw await ApiError.fromResponse(response);
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return response.json() as Promise<T>;
  }

  get<T>(path: string, params?: RequestOptions['params']): Promise<T> {
    return this.request<T>(path, { method: 'GET', params });
  }

  post<T>(path: string, body?: unknown, params?: RequestOptions['params']): Promise<T> {
    return this.request<T>(path, {
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
      params,
    });
  }

  put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>(path, {
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  delete<T>(path: string): Promise<T> {
    return this.request<T>(path, { method: 'DELETE' });
  }
}

export const api = new ApiClient();
export { ApiError, AuthError };