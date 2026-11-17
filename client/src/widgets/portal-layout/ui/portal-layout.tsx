import { Link, NavLink, Outlet, useLocation } from 'react-router-dom'
import { navigation } from '@/shared/config/navigation'

export function PortalLayout() {
  const { pathname } = useLocation()
  const currentTitle =
    navigation.find((item) => item.path === pathname)?.title ?? 'Страница'

  return (
    <div className="min-h-screen md:grid md:grid-cols-[220px_1fr] xl:grid-cols-[244px_1fr]">
      <aside className="flex flex-col border-b border-slate-200 bg-white p-4 md:border-r md:border-b-0 md:px-5 md:py-10">
        <Link className="flex items-center gap-3 font-extrabold" to="/">
          <span className="grid h-12 w-11 place-items-center rounded-xl bg-sky-200 text-2xl text-sky-700">
            I.
          </span>
          <span className="text-2xl tracking-tight">
            INTC<small className="block text-[9px] tracking-[0.2em]">SUPPORTER</small>
          </span>
        </Link>
        <p className="mt-14 mb-5 hidden text-[9px] tracking-[0.15em] text-slate-400 md:block">
          ТВОЙ КОЛЛЕДЖ РЯДОМ
        </p>
        <nav
          className="mt-4 flex gap-1 overflow-x-auto md:mt-0 md:grid md:gap-2"
          aria-label="Основное меню"
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
              {item.title}
            </NavLink>
          ))}
        </nav>
        <div className="mt-auto hidden pt-16 text-[10px] text-accent md:block">
          ● Начало большого проекта
          <p className="mt-3 text-slate-400">Всё для учёбы — в одном месте.</p>
        </div>
      </aside>
      <main className="mx-auto w-full max-w-7xl min-w-0 px-5 md:px-8 xl:px-12">
        <header className="flex h-20 items-center justify-between gap-4 text-[10px] text-slate-400 md:h-25">
          <span>
            Студенческий портал /{' '}
            <strong className="font-medium text-slate-600">{currentTitle}</strong>
          </span>
          <span className="rounded-full border border-slate-200 px-3 py-2 whitespace-nowrap">
            Версия 0.1
          </span>
        </header>
        <Outlet />
        <footer className="flex justify-between gap-6 border-t border-slate-200 py-6 text-[9px] leading-5 text-slate-400">
          <span>INTC - Supporter</span>
          <span>Создаём для студентов, вместе со студентами.</span>
        </footer>
      </main>
    </div>
  )
}
