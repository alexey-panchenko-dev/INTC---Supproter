export async function apiGet<T>(path: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(`/api/v1/${path}`, { signal })

  if (response.status === 401) {
    throw new Error('Для доступа войдите в подтверждённый аккаунт.')
  }

  if (!response.ok) {
    throw new Error('Не удалось загрузить данные. Проверьте подключение к серверу.')
  }

  return response.json() as Promise<T>
}
