import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useAuth } from '@/entities/session'

export function AdminGuard({ children }: { children: ReactNode }) {
  const { session } = useAuth()
  return session?.role === 'admin' ? children : <Navigate to="/" replace />
}
