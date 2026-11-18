import { LanguageSwitch, useI18n } from '@/shared/i18n'
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/entities/session'
import { navigation } from '@/shared/config/navigation'

export function PortalLayout() {
  const { t } = useI18n()

  const { session, loading, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
    } catch {
      setLogoutError('Не удалось выйти. Попробуйте ещё раз.')
    } finally {
      setLoggingOut(false)
    }
  }
  const { pathname } = useLocation()
  const isAuth = pathname === '/auth'
  const currentTitle =
    navigation.find((item) => item.path === pathname)?.title ??
    (pathname === '/auth' ? 'Вход и регистрация' : 'Страница')

  return (
    <div
      className={
        isAuth
          ? 'min-h-screen bg-canvas'
          : 'min-h-screen'
      }
    >
      {!isAuth && (
        <aside className="sticky top-0 z-30 flex flex-col border-b border-slate-200 bg-white p-4 md:fixed md:inset-y-0 md:left-0 md:w-[220px] md:overflow-y-auto md:border-r md:border-b-0 md:px-5 md:py-10 xl:w-[244px]">
          <Link className="flex items-center gap-3 font-extrabold" to="/">
            <span className="grid h-12 w-11 place-items-center rounded-xl bg-sky-200 text-2xl text-sky-700">
              I.
            </span>
            <span className="text-2xl tracking-tight">
              INTC<small className="block text-[9px] tracking-[0.2em]">SUPPORTER</small>
            </span>
          </Link>
          <p className="mt-14 mb-5 hidden text-[9px] tracking-[0.15em] text-slate-400 md:block">
            {t('ТВОЙ КОЛЛЕДЖ РЯДОМ')}
          </p>
          <nav
            className="mt-4 flex gap-1 overflow-x-auto md:mt-0 md:grid md:gap-2"
            aria-label={t('Основное меню')}
          >
            {navigation.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  `flex min-h-11 items-center gap-3 rounded-xl px-3 py-3 text-xs font-bold whitespace-nowrap ${isActive ? 'bg-sky-50 text-sky-700' : 'hover:bg-slate-50'}`
                }
              >
                <span className="hidden w-6 text-xl md:inline" aria-hidden="true">
                  {item.icon}
                </span>
                {t(item.title)}
              </NavLink>
            ))}
          </nav>
        </aside>
      )}
      <main
        className={
          isAuth
            ? 'w-full min-w-0'
            : 'w-full min-w-0 px-5 md:ml-[220px] md:w-[calc(100%-220px)] md:px-8 xl:ml-[244px] xl:w-[calc(100%-244px)] xl:px-12'
        }
      >
        {!isAuth && (
          <header className="flex min-h-20 flex-wrap items-center justify-between gap-3 py-4 text-[10px] text-slate-400 md:min-h-25">
            <span>
              {t('Студенческий портал /')}{' '}
              <strong className="font-medium text-slate-600">{t(currentTitle)}</strong>
            </span>
            <div className="flex flex-wrap items-center justify-end gap-2 text-xs">
              <LanguageSwitch />
              {!loading &&
                (session ? (
                  <>
                    <Link to="/profile" className="text-ink hover:text-sky-700">
                      {session.first_name} {session.last_name}
                      <span className="ml-2 text-muted">
                        {session.role === 'admin'
                          ? t('Администратор')
                          : session.group_name}
                      </span>
                    </Link>
                    <button
                      onClick={() => void handleLogout()}
                      disabled={loggingOut}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-ink disabled:opacity-50"
                    >
                      {loggingOut ? t('Выходим…') : t('Выйти')}
                    </button>
                  </>
                ) : (
                  <>
                    <Link
                      to="/auth"
                      className="rounded-lg px-4 py-2 text-ink hover:bg-sky-50"
                    >
                      {t('Войти')}
                    </Link>
                    <Link
                      to="/auth?mode=register"
                      className="rounded-lg bg-ink px-4 py-2 text-white"
                    >
                      {t('Регистрация')}
                    </Link>
                  </>
                ))}
              {logoutError && (
                <p role="alert" className="text-red-700">
                  {t(logoutError)}
                </p>
              )}
            </div>
          </header>
        )}
        <Outlet />
        {!isAuth && (
          <footer className="flex justify-between gap-6 border-t border-slate-200 py-6 text-[9px] leading-5 text-slate-400">
            <span>INTC - Supporter</span>
            <span>{t('Создаём для студентов, вместе со студентами.')}</span>
          </footer>
        )}
      </main>
    </div>
  )
}
