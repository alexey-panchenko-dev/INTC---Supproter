import { useEffect, useState } from 'react'
import { apiGet } from './client'

export function useApiQuery<T>(path: string | null) {
  const [result, setResult] = useState<{
    path: string | null
    data: T | null
    error: string
  }>({ path: null, data: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    if (!path) return () => controller.abort()

    void apiGet<T>(path, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, data, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            path,
            data: null,
            error: reason instanceof Error ? reason.message : 'Ошибка загрузки',
          })
        }
      })

    return () => controller.abort()
  }, [path])

  const isCurrent = path !== null && result.path === path

  return {
    data: isCurrent ? result.data : null,
    loading: path !== null && !isCurrent,
    error: isCurrent ? result.error : '',
  }
}
