import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { useState } from 'react'
import { useAuth } from '@/entities/session'
import { navigation } from '@/shared/config/navigation'

type IconName = 'home' | 'calendar' | 'library' | 'apps' | 'spark' | 'menu' | 'close' | 'lock' | 'logout'

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true as const,
  }
  const paths: Record<IconName, React.ReactNode> = {
    home: <><path d="m3 10 9-7 9 7" /><path d="M5 9v11h14V9M9 20v-6h6v6" /></>,
    calendar: <><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></>,
    library: <><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v17H6.5A2.5 2.5 0 0 1 4 17.5z" /><path d="M4 17.5A2.5 2.5 0 0 1 6.5 15H20M8 7h8M8 10h8" /></>,
    apps: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /></>,
    spark: <><path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="m19 16 .9 2.1L22 19l-2.1.9L19 22l-.9-2.1L16 19l2.1-.9z" /></>,
    menu: <><path d="M4 6h16M4 12h16M4 18h16" /></>,
    close: <><path d="m6 6 12 12M18 6 6 18" /></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3M12 14v3" /></>,
    logout: <><path d="M10 17l5-5-5-5M15 12H3" /><path d="M12 3h7a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-7" /></>,
  }
  return <svg {...common}>{paths[name]}</svg>
}

function iconForPath(path: string): IconName {
  if (path === '/') return 'home'
  if (path === '/schedule') return 'calendar'
  if (path === '/documents') return 'library'
  if (path === '/applications') return 'apps'
  return 'spark'
}

export function PortalLayout() {
  const { session, loading, logout } = useAuth()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)

  async function handleLogout() {
    setLoggingOut(true)
    setLogoutError('')
    try {
      await logout()
      setMenuOpen(false)
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
    (isAuth ? 'Вход и регистрация' : 'Страница')

  const sidebar = (
    <aside className="flex h-full flex-col border-r border-slate-200 bg-white px-4 py-5 md:px-5 md:py-7">
      <Link
        className="flex items-center gap-3 rounded-xl px-1 py-1 text-ink"
        to="/"
        onClick={() => setMenuOpen(false)}
      >
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-sky-100 text-accent">
          <Icon name="library" size={21} />
        </span>
        <span className="text-[15px] leading-tight font-extrabold tracking-tight">
          INTC - Supporter
          <span className="mt-1 block text-[10px] font-medium tracking-wide text-muted">
            Студенческий портал
          </span>
        </span>
      </Link>

      <p className="mb-2 mt-9 px-3 text-[10px] font-bold tracking-[0.13em] text-slate-400">
        ОСНОВНОЕ
      </p>
      <nav className="grid gap-1" aria-label="Основное меню">
        {navigation.map((item) => {
          const locked = item.path !== '/' && (!session || session.status !== 'approved')
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              onClick={() => setMenuOpen(false)}
              aria-label={locked ? `${item.title}, нужен вход` : item.title}
              className={({ isActive }) =>
                `group flex min-h-11 items-center gap-3 rounded-xl px-3 text-sm font-semibold transition ${isActive ? 'bg-sky-50 text-sky-800' : 'text-slate-600 hover:bg-slate-50 hover:text-ink'}`
              }
            >
              {({ isActive }) => (
                <>
                  <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${isActive ? 'bg-white text-accent' : 'text-slate-400 group-hover:text-accent'}`}>
                    <Icon name={iconForPath(item.path)} size={19} />
                  </span>
                  <span className="min-w-0 flex-1">{item.title}</span>
                  {locked && <span className="text-slate-400"><Icon name="lock" size={15} /></span>}
                </>
              )}
            </NavLink>
          )
        })}
      </nav>

      {session && (
        <div className="mt-auto border-t border-slate-100 pt-4">
          <div className="mb-3 flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sky-100 text-xs font-bold text-sky-800">
              {session.first_name.slice(0, 1)}{session.last_name.slice(0, 1)}
            </span>
            <span className="min-w-0 text-xs">
              <strong className="block truncate text-ink">{session.first_name} {session.last_name}</strong>
              <span className="mt-0.5 block truncate text-muted">
                {session.role === 'admin' ? 'Администратор' : session.group_name}
              </span>
            </span>
          </div>
          <button
            onClick={() => void handleLogout()}
            disabled={loggingOut}
            className="flex min-h-10 w-full items-center gap-3 rounded-xl px-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-ink disabled:opacity-50"
          >
            <Icon name="logout" size={18} />
            {loggingOut ? 'Выходим…' : 'Выйти'}
          </button>
          {logoutError && <p role="alert" className="mt-2 px-3 text-xs text-red-700">{logoutError}</p>}
        </div>
      )}
    </aside>
  )

  if (isAuth) {
    return <div className="min-h-dvh bg-canvas"><main className="w-full min-w-0"><Outlet /></main></div>
  }

  return (
    <div className="min-h-dvh md:grid md:grid-cols-[252px_minmax(0,1fr)]">
      <div className="hidden md:block">{sidebar}</div>
      {menuOpen && (
        <div className="fixed inset-0 z-40 bg-ink/30 md:hidden" onClick={() => setMenuOpen(false)} />
      )}
      <div className={`fixed inset-y-0 left-0 z-50 w-[min(86vw,292px)] transition-transform duration-200 md:hidden ${menuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        {sidebar}
      </div>

      <main className="min-w-0">
        <header className="sticky top-0 z-30 flex min-h-[68px] items-center justify-between gap-3 border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur md:min-h-[76px] md:px-8 xl:px-10">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              aria-label={menuOpen ? 'Закрыть меню' : 'Открыть меню'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="grid size-10 shrink-0 place-items-center rounded-xl border border-slate-200 text-ink md:hidden"
            >
              <Icon name={menuOpen ? 'close' : 'menu'} size={20} />
            </button>
            <div className="min-w-0">
              <p className="hidden text-[11px] font-medium text-slate-400 sm:block">INTC - Supporter</p>
              <h1 className="truncate text-[15px] font-bold text-ink md:mt-0.5 md:text-lg">{currentTitle}</h1>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!loading && (
              session ? (
                <span className="hidden items-center gap-2 rounded-full border border-slate-200 bg-white py-1.5 pl-1.5 pr-3 text-xs font-semibold text-ink sm:flex">
                  <span className="grid size-7 place-items-center rounded-full bg-sky-100 text-[10px] text-sky-800">
                    {session.first_name.slice(0, 1)}{session.last_name.slice(0, 1)}
                  </span>
                  {session.first_name} {session.last_name}
                </span>
              ) : (
                <>
                  <Link to="/auth?mode=login" className="rounded-xl px-3 py-2 text-xs font-semibold text-ink transition hover:bg-sky-50 sm:px-4">
                    Войти
                  </Link>
                  <Link to="/auth?mode=register" className="portal-primary min-h-9 px-3 py-2 text-xs sm:px-4">
                    Регистрация
                  </Link>
                </>
              )
            )}
          </div>
        </header>

        <div className="mx-auto w-full max-w-[1320px] px-4 py-6 md:px-8 md:py-8 xl:px-10">
          <Outlet />
        </div>

        <footer className="mx-auto flex max-w-[1320px] flex-wrap justify-between gap-2 border-t border-slate-200 px-4 py-5 text-xs text-muted md:px-8 xl:px-10">
          <span className="font-semibold text-ink">INTC - Supporter</span>
          <span>Студенческий портал</span>
        </footer>
      </main>
    </div>
  )
}
