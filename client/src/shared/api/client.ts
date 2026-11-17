export class ApiError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }
  let response: Response
  try {
    response = await fetch(`/api/v1/${path}`, {
      ...options,
      credentials: 'same-origin',
      headers,
    })
  } catch (reason) {
    if (options.signal?.aborted) throw reason
    throw new ApiError('Не удалось связаться с сервером.', 0)
  }
  if (!response.ok) {
    const payload = await response.json().catch(() => null)
    const message =
      typeof payload?.detail === 'string'
        ? payload.detail
        : response.status === 422
          ? 'Проверьте поля формы: почту, обязательные данные и длину пароля.'
          : 'Не удалось выполнить запрос. Попробуйте ещё раз.'
    throw new ApiError(message, response.status)
  }
  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  return apiRequest<T>(path, { signal })
}
