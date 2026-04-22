const API_URL = import.meta.env.VITE_API_URL ?? "http://backend:8000/api/v1";
export const API_ORIGIN = API_URL.replace(/\/api\/v\d+\/?$/, "");

export type ApiError = {
  status: number;
  message: string;
  details?: unknown;
};

export type PaginatedResponse<T> = {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
};

function getToken(): string | null {
  return localStorage.getItem("auth_token");
}

function getRefresh(): string | null {
  return localStorage.getItem("auth_refresh");
}

function clearAuthStorage() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_refresh");
  localStorage.removeItem("auth_role");
  localStorage.removeItem("auth_user_id");
}

function buildHeaders(isJson: boolean, extra?: HeadersInit): HeadersInit {
  const headers: HeadersInit = { ...extra };
  if (isJson) {
    // @ts-ignore
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) {
    // @ts-ignore
    headers["Authorization"] = `Bearer ${token}`;
  }
  return headers;
}

function buildUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  return `${API_URL}${path}`;
}

let refreshInFlight: Promise<boolean> | null = null;

async function tryRefreshTokens(): Promise<boolean> {
  if (refreshInFlight) return refreshInFlight;
  const refresh = getRefresh();
  if (!refresh) return false;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${API_URL}/auth/refresh/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refresh }),
      });
      if (!response.ok) {
        clearAuthStorage();
        return false;
      }
      const data = (await response.json()) as { access: string; refresh?: string };
      localStorage.setItem("auth_token", data.access);
      if (data.refresh) {
        localStorage.setItem("auth_refresh", data.refresh);
      }
      return true;
    } catch {
      clearAuthStorage();
      return false;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

export function resolveFileUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}

const REFRESH_PATH = "/auth/refresh/";
const LOGIN_PATH = "/auth/login/";
const REGISTER_PATH = "/auth/register/";

function shouldAttemptRefresh(path: string): boolean {
  return ![REFRESH_PATH, LOGIN_PATH, REGISTER_PATH].some((p) => path.startsWith(p));
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {},
  _retry = true
): Promise<T> {
  const isJson = options.json !== undefined;
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: buildHeaders(isJson, options.headers),
    body: isJson ? JSON.stringify(options.json) : options.body,
  });

  if (response.status === 401 && _retry && shouldAttemptRefresh(path)) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return apiRequest<T>(path, options, false);
    }
  }

  if (!response.ok) {
    let details: unknown = null;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    const error: ApiError = {
      status: response.status,
      message: response.statusText,
      details,
    };
    throw error;
  }

  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export function unwrapList<T>(data: T[] | PaginatedResponse<T>): T[] {
  if (Array.isArray(data)) {
    return data;
  }
  if (data && Array.isArray(data.results)) {
    return data.results;
  }
  return [];
}

export async function apiUpload<T>(
  path: string,
  form: FormData,
  method: "POST" | "PATCH" | "PUT" = "POST",
  _retry = true
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method,
    headers: buildHeaders(false),
    body: form,
  });

  if (response.status === 401 && _retry && shouldAttemptRefresh(path)) {
    const refreshed = await tryRefreshTokens();
    if (refreshed) {
      return apiUpload<T>(path, form, method, false);
    }
  }

  if (!response.ok) {
    let details: unknown = null;
    try {
      details = await response.json();
    } catch {
      details = await response.text();
    }
    const error: ApiError = {
      status: response.status,
      message: response.statusText,
      details,
    };
    throw error;
  }

  return response.json() as Promise<T>;
}

export async function fetchAllPages<T>(path: string): Promise<T[]> {
  let url: string | null = path;
  const results: T[] = [];
  let guard = 0;

  while (url) {
    guard += 1;
    if (guard > 50) {
      break;
    }
    // @ts-ignore
    const data = await apiRequest<PaginatedResponse<T> | T[]>(url);
    if (Array.isArray(data)) {
      return data;
    }
    results.push(...data.results);
    url = data.next;
  }

  return results;
}
