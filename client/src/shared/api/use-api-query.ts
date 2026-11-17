import { useEffect, useState } from 'react'
import { apiGet } from './client'

export function useApiQuery<T>(path: string | null, revision = 0) {
  const [result, setResult] = useState<{
    path: string | null
    revision: number
    data: T | null
    error: string
  }>({ path: null, revision: -1, data: null, error: '' })

  useEffect(() => {
    const controller = new AbortController()
    if (!path) return () => controller.abort()

    void apiGet<T>(path, controller.signal)
      .then((data) => {
        if (!controller.signal.aborted) setResult({ path, revision, data, error: '' })
      })
      .catch((reason: unknown) => {
        if (!controller.signal.aborted) {
          setResult({
            path,
            revision,
            data: null,
            error: reason instanceof Error ? reason.message : 'Ошибка загрузки',
          })
        }
      })

    return () => controller.abort()
  }, [path, revision])

  const isCurrent = path !== null && result.path === path && result.revision === revision

  return {
    data: isCurrent ? result.data : null,
    loading: path !== null && !isCurrent,
    error: isCurrent ? result.error : '',
  }
}
