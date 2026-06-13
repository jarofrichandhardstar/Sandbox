export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('token')

  const headers: Record<string, string> = {
    ...(init.headers as Record<string, string>),
  }

  if (!(init.headers as Record<string, string>)?.['Content-Type']) {
    headers['Content-Type'] = 'application/json'
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const base = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')
  const res = await fetch(`${base}/api${path}`, { ...init, headers })

  if (res.status === 401) {
    localStorage.removeItem('token')
    window.location.href = '/login'
    throw new ApiError(401, 'Session expired')
  }

  const body = await res.json().catch(() => ({ message: res.statusText }))

  if (!res.ok) {
    throw new ApiError(res.status, body?.message ?? 'An error occurred')
  }

  return body as T
}

export const client = {
  get: <T>(path: string) => request<T>(path),

  post: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'POST', body: JSON.stringify(body) }),

  put: <T>(path: string, body: unknown) =>
    request<T>(path, { method: 'PUT', body: JSON.stringify(body) }),

  delete: <T>(path: string) => request<T>(path, { method: 'DELETE' }),

  postBinary: <T>(path: string, file: File | ArrayBuffer) =>
    request<T>(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream' },
      body: file,
    }),
}
