export type Session = {
  id: number
  firstName: string
  lastName: string
  group: string
  role: 'student' | 'admin'
  status: 'pending' | 'approved' | 'blocked'
}

// Authentication integration point. Never infer access from localStorage or UI flags.
export function useSession(): Session | null {
  return null
}
