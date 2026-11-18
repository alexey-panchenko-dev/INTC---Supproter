import { createContext, useContext } from 'react'
import type { Session } from './session'

type SessionContextValue = {
  session: Session | null
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  login: (email: string, password: string) => Promise<Session>
  logout: () => Promise<void>
}

export const SessionContext = createContext<SessionContextValue | null>(null)

export function useAuth() {
  const context = useContext(SessionContext)
  if (!context) throw new Error('SessionProvider is required')
  return context
}

export function useSession() {
  return useAuth().session
}
