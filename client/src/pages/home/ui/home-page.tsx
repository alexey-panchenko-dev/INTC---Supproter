import { Link } from 'react-router-dom'
import { useAuth } from '@/entities/session'
import { navigation } from '@/shared/config/navigation'

const featurePaths = [
  'M4 5h16v15H4z M8 3v4 M16 3v4 M4 10h16 M8 14h3 M13 14h3',
  'M4 4h16v16H4z M8 8h8 M8 12h8 M8 16h5',
  'M4 4h7v7H4z M13 4h7v7h-7z M4 13h7v7H4z M13 13h7v7h-7z',
  'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
]

function FeatureIcon({ index }: { index: number }) {
  return (
    <svg className="size-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={featurePaths[index] ?? featurePaths[0]} />
    </svg>
  )
}

export function HomePage() {
  const { session } = useAuth()

  return (
    <div className="space-y-8 md:space-y-10">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-[#eaf7fd] via-[#f2faff] to-white px-6 py-8 sm:px-9 sm:py-10 lg:px-12 lg:py-12">
        <div className="pointer-events-none absolute -right-16 -top-20 -z-10 size-72 rounded-full border-[38px] border-sky-100/70 sm:right-3 sm:top-2 sm:size-80 sm:border-[46px]" />
        <div className="pointer-events-none absolute right-12 top-16 -z-10 hidden h-48 w-56 rotate-[-7deg] rounded-[28px] border border-sky-200 bg-white/70 shadow-[0_22px_60px_-38px_rgba(20,119,161,.55)] lg:block" />
        <div className="max-w-[650px]">
          <p className="text-[11px] font-extrabold tracking-[0.17em] text-sky-700">
            INTC / STUDENT SUPPORTER
          </p>
          <h2 className="mt-5 text-[clamp(2rem,5vw,3.8rem)] leading-[1.08] font-extrabold tracking-[-0.045em] text-ink">
            Информация об учёбе
            <br className="hidden sm:block" /> собрана в одном месте
          </h2>
          <p className="mt-4 max-w-[500px] text-sm leading-6 text-muted sm:text-base sm:leading-7">
            Расписание, документы колледжа и учебные приложения — в спокойном и понятном студенческом портале.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link className="portal-primary px-5 py-3" to={session ? '/schedule' : '/auth?mode=register'}>
              {session ? 'Открыть расписание' : 'Зарегистрироваться'}
              <span aria-hidden="true">→</span>
            </Link>
            {!session && <Link className="portal-link px-3 py-3 text-sm" to="/auth?mode=login">Войти</Link>}
          </div>
        </div>
        <div className="mt-8 flex items-center gap-3 border-t border-sky-100 pt-5 text-xs text-muted lg:absolute lg:right-10 lg:bottom-9 lg:mt-0 lg:border-0 lg:pt-0">
          <span className="grid size-9 place-items-center rounded-xl bg-white text-sky-700 shadow-sm">
            <FeatureIcon index={0} />
          </span>
          <span><strong className="block text-ink">Учёба без лишнего поиска</strong>Основные разделы рядом</span>
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.16em] text-sky-700">РАЗДЕЛЫ ПОРТАЛА</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">Куда перейти?</h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {navigation.slice(1).map((item, index) => (
            <Link
              className="portal-card group flex min-h-[174px] flex-col p-5 transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-[0_18px_35px_-28px_rgba(20,119,161,.42)] sm:p-6"
              key={item.path}
              to={item.path}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-700 transition group-hover:bg-sky-100">
                <FeatureIcon index={index} />
              </span>
              <h3 className="mt-5 text-base font-bold text-ink">{item.title}</h3>
              <p className="mt-2 text-sm leading-5 text-muted">{item.description}</p>
              <span className="mt-auto flex justify-end pt-4 text-sm font-semibold text-sky-700" aria-hidden="true">Открыть →</span>
            </Link>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-4 rounded-2xl border border-sky-100 bg-[#eff9fd] p-5 sm:flex-row sm:items-center sm:p-6">
        <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-white text-sky-700 shadow-sm">
          <FeatureIcon index={3} />
        </span>
        <div className="max-w-3xl">
          <h2 className="font-bold text-ink">ИИ-помощник по документам колледжа</h2>
          <p className="mt-1 text-sm leading-6 text-muted">
            Помощник опирается на доступные документы, показывает источники и сообщает, если в материалах недостаточно сведений.
          </p>
        </div>
        <Link className="portal-link shrink-0 text-sm sm:ml-auto" to="/chat">Об ИИ-помощнике →</Link>
      </section>
    </div>
  )
}
