import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useSession } from '@/entities/session'
import { EmptyState } from '@/shared/ui/empty-state'

export function AccessGuard({ children }: { children: ReactNode }) {
  // Replace this closed gate with a validated session and approved-status check.
  // The backend independently protects every content endpoint.
  const session = useSession()
  if (session?.status === 'approved') return children

  return (
    <section className="min-h-[65vh] py-10">
      <EmptyState>
        <h1 className="mb-3 text-2xl font-bold text-ink">Нужен аккаунт студента</h1>
        <p>Гостям доступна главная страница.</p>
        <p>Остальные разделы откроются после регистрации и проверки администратором.</p>
        <p className="mt-4 text-xs">Модуль входа и регистрации находится в разработке.</p>
        <Link className="mt-6 inline-flex rounded-lg bg-ink px-5 py-3 text-white" to="/">
          На главную
        </Link>
      </EmptyState>
    </section>
  )
}
