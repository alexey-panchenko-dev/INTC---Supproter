import { useEffect, useState, type ReactNode } from 'react'
import { apiRequest, ApiError } from '@/shared/api/client'
import type { Session } from './session'
import { SessionContext } from './use-session'

export function SessionProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  async function loadSession() {
    try {
      const user = await apiRequest<Session>('auth/me')
      setSession(user)
    } catch (cause) {
      setSession(null)
      if (!(cause instanceof ApiError && cause.status === 401)) {
        setError('Не удалось проверить аккаунт. Попробуйте ещё раз.')
      }
    } finally {
      setLoading(false)
    }
  }

  async function refresh() {
    setLoading(true)
    setError(null)
    await loadSession()
  }

  useEffect(() => {
    let active = true
    void apiRequest<Session>('auth/me')
      .then((user) => {
        if (active) setSession(user)
      })
      .catch((cause: unknown) => {
        if (active && !(cause instanceof ApiError && cause.status === 401)) {
          setError('Не удалось проверить аккаунт. Попробуйте ещё раз.')
        }
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  async function login(email: string, password: string) {
    const user = await apiRequest<Session>('auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setSession(user)
    setError(null)
    return user
  }

  async function logout() {
    await apiRequest('auth/logout', { method: 'POST' })
    setSession(null)
  }

  return (
    <SessionContext.Provider value={{ session, loading, error, refresh, login, logout }}>
      {children}
    </SessionContext.Provider>
  )
}
