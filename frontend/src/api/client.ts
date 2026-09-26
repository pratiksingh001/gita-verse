// Empty in development (Vite proxies /api to FastAPI); set VITE_API_URL in production.
const BASE_URL = import.meta.env.VITE_API_URL ?? ''

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function request<T>(method: string, path: string, init: RequestInit = {}): Promise<T> {
  // "include" sends the session cookie even when the API is on another origin in production.
  const res = await fetch(`${BASE_URL}${path}`, { method, credentials: 'include', ...init })
  if (!res.ok) {
    const body = await res.json().catch(() => null)
    // FastAPI validation errors put a list in `detail`; show the first message.
    const detail = Array.isArray(body?.detail) ? body.detail[0]?.msg : body?.detail
    throw new ApiError(res.status, detail ?? `Request failed (${res.status})`)
  }
  return res.status === 204 ? (null as T) : res.json()
}

export function apiGet<T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> {
  const query = new URLSearchParams()
  for (const [key, value] of Object.entries(params ?? {})) {
    if (value !== undefined) query.set(key, String(value))
  }
  return request<T>('GET', `${path}${query.size ? `?${query}` : ''}`)
}

export function apiSend<T>(method: 'POST' | 'PUT' | 'DELETE', path: string, body?: unknown): Promise<T> {
  return request<T>(method, path, {
    headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
}
