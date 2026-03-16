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

function buildHeaders(isJson: boolean, extra?: HeadersInit): HeadersInit {
  const headers: HeadersInit = { ...extra };
  if (isJson) {
    headers["Content-Type"] = "application/json";
  }
  const token = getToken();
  if (token) {
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

export function resolveFileUrl(path: string) {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_ORIGIN}${normalized}`;
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit & { json?: unknown } = {}
): Promise<T> {
  const isJson = options.json !== undefined;
  const response = await fetch(buildUrl(path), {
    ...options,
    headers: buildHeaders(isJson, options.headers),
    body: isJson ? JSON.stringify(options.json) : options.body,
  });

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
  method: "POST" | "PATCH" | "PUT" = "POST"
): Promise<T> {
  const response = await fetch(buildUrl(path), {
    method,
    headers: buildHeaders(false),
    body: form,
  });

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
    const data = await apiRequest<PaginatedResponse<T> | T[]>(url);
    if (Array.isArray(data)) {
      return data;
    }
    results.push(...data.results);
    url = data.next;
  }

  return results;
}
