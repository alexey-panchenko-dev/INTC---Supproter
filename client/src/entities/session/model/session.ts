export type Session = {
  id: number
  first_name: string
  last_name: string
  email: string
  group_name?: string
  role: 'student' | 'admin'
  status: 'pending' | 'approved' | 'blocked'
}
