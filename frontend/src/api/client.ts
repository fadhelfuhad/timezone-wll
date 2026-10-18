import axios, { type AxiosInstance, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios';

const BASE_URL = (import.meta.env.VITE_API_URL ?? '') + '/api';
const TOKEN_KEY = 'timezone_token';
const REFRESH_TOKEN_KEY = 'timezone_refresh_token';

const axiosInstance: AxiosInstance = axios.create({
  baseURL: BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30_000,
});

axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

axiosInstance.interceptors.response.use(
  (response: AxiosResponse) => {
    // Unwrap data.data from success responses when present
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(REFRESH_TOKEN_KEY);
      // Avoid redirect loop on login page
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    return Promise.reject(error.response?.data ?? error);
  },
);

// The response interceptor unwraps `response.data.data` and returns the payload
// directly, so at runtime these resolve to T. Axios's own types still describe
// the raw AxiosResponse, so we cast through unknown to the real resolved shape.
export function get<T>(url: string, params?: Record<string, unknown>): Promise<T> {
  return axiosInstance.get(url, { params }) as unknown as Promise<T>;
}

export function post<T>(url: string, data?: unknown, config?: Record<string, unknown>): Promise<T> {
  return axiosInstance.post(url, data, config) as unknown as Promise<T>;
}

export function patch<T>(url: string, data?: unknown): Promise<T> {
  return axiosInstance.patch(url, data) as unknown as Promise<T>;
}

export function del<T = void>(url: string): Promise<T> {
  return axiosInstance.delete(url) as unknown as Promise<T>;
}

export { TOKEN_KEY, REFRESH_TOKEN_KEY };
export default axiosInstance;
