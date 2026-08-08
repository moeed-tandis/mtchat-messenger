/**
 * Transport helper for the service layer.
 *
 * Today every service resolves against the in-memory mock database.
 * To connect a real backend, replace `request` with a fetch implementation
 * and swap the mock calls inside src/services/api/* for `request(...)`.
 */

export const API_BASE_URL = "/api";

export function delay(ms = 220) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

export class ApiError extends Error {
  code: string;
  constructor(message: string, code = "error") {
    super(message);
    this.code = code;
  }
}

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("mtchat.session");
    return raw ? (JSON.parse(raw).token as string) : null;
  } catch {
    return null;
  }
}

/** Real backend transport (unused while the mock layer is active). */
export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const token = getToken();
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    throw new ApiError(`Request failed: ${res.status}`, String(res.status));
  }
  return (await res.json()) as T;
}

export function paginate<T>(items: T[], page = 1, pageSize = 20) {
  const start = (page - 1) * pageSize;
  return {
    items: items.slice(start, start + pageSize),
    total: items.length,
    page,
    pageSize,
  };
}
