// API utilities for handling backend requests

export interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

/**
 * Generic fetcher function that handles API requests
 */
async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const defaultHeaders: HeadersInit = {
      'Content-Type': 'application/json',
    };

    // Add authorization header if token exists
    const token = typeof window !== 'undefined' ? localStorage.getItem('auth-token') : null;
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    }

    // Add correlation ID for security tracking
    const correlationId = typeof window !== 'undefined' 
      ? `client-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
      : undefined;
    if (correlationId) {
      defaultHeaders['X-Correlation-ID'] = correlationId;
    }

    const response = await fetch(url, {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    });

    // Handle 204 No Content responses
    if (response.status === 204) {
      return { status: 204, data: undefined };
    }

    // Try to parse JSON response
    let data;
    try {
      data = await response.json();
    } catch (e) {
      data = {};
    }

    if (!response.ok) {
      return {
        error: data.message || 'An error occurred',
        status: response.status,
      };
    }

    return {
      data: data as T,
      status: response.status,
    };
  } catch (error) {
    console.error('API request failed:', error);
    return {
      error: 'Network error',
      status: 500,
    };
  }
}

// Export common HTTP methods
export const api = {
  get: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { method: 'GET', ...options }),

  post: <T>(endpoint: string, data: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options,
    }),

  put: <T>(endpoint: string, data: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options,
    }),

  patch: <T>(endpoint: string, data: unknown, options?: RequestInit) =>
    fetchApi<T>(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(data),
      ...options,
    }),

  delete: <T>(endpoint: string, options?: RequestInit) =>
    fetchApi<T>(endpoint, { method: 'DELETE', ...options }),
};
