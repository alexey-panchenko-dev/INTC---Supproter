import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/entities/session'
import { EmptyState } from '@/shared/ui/empty-state'

export function AccessGuard({ children }: { children: ReactNode }) {
  const { session, loading, error, refresh } = useAuth()
  const location = useLocation()
  const next = encodeURIComponent(location.pathname + location.search)
  if (loading)
    return (
      <p className="py-16 text-muted" role="status">
        Проверяем аккаунт…
      </p>
    )
  if (error)
    return (
      <div className="py-16">
        <p role="alert">{error}</p>
        <button onClick={() => void refresh()} className="mt-4 underline">
          Повторить
        </button>
      </div>
    )
  if (session?.status === 'approved') return children

  return (
    <section className="min-h-[65vh] py-10">
      <EmptyState>
        <h1 className="mb-3 text-2xl font-bold text-ink">
          {session ? 'Доступ к аккаунту ограничен' : 'Нужен аккаунт студента'}
        </h1>
        {session ? (
          <p>Обратитесь к администрации колледжа.</p>
        ) : (
          <>
            <p>Гостям доступна главная страница.</p>
            <p>Зарегистрируйтесь или войдите, чтобы открыть остальные разделы.</p>
            <Link
              className="mt-6 inline-flex rounded-lg bg-ink px-5 py-3 text-white"
              to={`/auth?mode=register&next=${next}`}
            >
              Зарегистрироваться
            </Link>
            <Link
              className="ml-5 inline-flex text-accent hover:underline"
              to={`/auth?mode=login&next=${next}`}
            >
              Войти
            </Link>
          </>
        )}
      </EmptyState>
    </section>
  )
}
