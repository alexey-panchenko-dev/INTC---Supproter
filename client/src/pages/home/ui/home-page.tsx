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

function CampusIllustration() {
  return (
    <div className="relative hidden min-h-[300px] items-center justify-center lg:flex" aria-hidden="true">
      <div className="absolute right-3 top-2 size-[290px] rounded-full border border-sky-200/80" />
      <div className="absolute right-11 top-10 size-[220px] rounded-full border border-sky-200/60" />
      <div className="relative z-10 w-full max-w-[380px] rotate-[2deg] rounded-[26px] border border-white bg-white/80 p-4 shadow-[0_26px_70px_-38px_rgba(20,119,161,.5)] backdrop-blur-sm">
        <div className="flex items-center justify-between rounded-t-[18px] bg-[#eaf7fd] px-4 py-3">
          <span className="text-[10px] font-extrabold tracking-[0.14em] text-sky-800">INTC / CAMPUS</span>
          <span className="size-2 rounded-full bg-sky-400" />
        </div>
        <svg className="h-[214px] w-full rounded-b-[18px] bg-gradient-to-br from-[#eaf7fd] to-[#d8eff9]" viewBox="0 0 360 214" fill="none">
          <path d="M0 171c54-24 95-22 144 0 60 27 118 24 216-9v52H0z" fill="#BFE6F5" />
          <path d="M78 166V94l102-53 102 53v72" stroke="#1886B1" strokeWidth="5" strokeLinejoin="round" />
          <path d="M101 165V105l79-41 79 41v60" fill="#F8FCFE" stroke="#1886B1" strokeWidth="4" strokeLinejoin="round" />
          <path d="M143 165v-38a37 37 0 0 1 74 0v38" fill="#DDF2FA" stroke="#1886B1" strokeWidth="4" />
          <path d="M117 112h20v20h-20zM223 112h20v20h-20zM151 89h18v18h-18zM191 89h18v18h-18z" fill="#9BD7EF" stroke="#1886B1" strokeWidth="3" />
          <path d="M61 166h238M48 174h264" stroke="#1886B1" strokeWidth="4" strokeLinecap="round" />
          <circle cx="291" cy="52" r="20" fill="#C8EAF7" />
          <path d="M298 42v20M288 52h20" stroke="#1886B1" strokeWidth="3" strokeLinecap="round" />
        </svg>
        <div className="flex items-center justify-between px-2 pt-3">
          <span className="text-[10px] font-bold tracking-[0.12em] text-slate-500">STUDENT SUPPORTER</span>
          <span className="text-[10px] text-sky-700">ALMATY</span>
        </div>
      </div>
      <div className="absolute bottom-7 left-0 z-20 grid size-12 place-items-center rounded-2xl border border-sky-100 bg-white text-sky-700 shadow-lg">
        <FeatureIcon index={0} />
      </div>
    </div>
  )
}

export function HomePage() {
  const { session } = useAuth()

  return (
    <div className="space-y-8 md:space-y-10">
      <section className="relative isolate overflow-hidden rounded-[28px] border border-sky-100 bg-gradient-to-br from-[#e8f6fd] via-[#eff9fd] to-[#f8fcfe] px-6 py-7 sm:px-9 sm:py-9 lg:grid lg:min-h-[430px] lg:grid-cols-[minmax(0,1.05fr)_minmax(300px,.8fr)] lg:items-center lg:gap-5 lg:px-12 lg:py-10">
        <div className="pointer-events-none absolute -right-20 -top-24 -z-10 size-64 rounded-full bg-white/50 blur-2xl lg:hidden" />
        <div className="max-w-[640px]">
          <p className="text-[11px] font-extrabold tracking-[0.17em] text-sky-700">
            INTC / STUDENT SUPPORTER
          </p>
          <h2 className="mt-5 text-[clamp(2rem,5vw,3.65rem)] leading-[1.08] font-extrabold tracking-[-0.045em] text-ink">
            Твоя жизнь
            <br className="hidden sm:block" /> в колледже.
            <br />
            <span className="text-accent">В одном месте.</span>
          </h2>
          <p className="mt-4 max-w-[480px] text-sm leading-6 text-muted sm:text-base sm:leading-7">
            Расписание, документы и учебные приложения собраны в одном студенческом портале.
          </p>
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link className="portal-primary px-5 py-3" to={session ? '/schedule' : '/auth?mode=register'}>
              {session ? 'Открыть расписание' : 'Зарегистрироваться'}
              <span aria-hidden="true">→</span>
            </Link>
            {!session && <Link className="portal-link px-3 py-3 text-sm" to="/auth?mode=login">Войти</Link>}
          </div>
        </div>
        <CampusIllustration />
      </section>

      <section>
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <p className="text-[10px] font-extrabold tracking-[0.16em] text-sky-700">БЫСТРЫЙ ДОСТУП</p>
            <h2 className="mt-1.5 text-xl font-bold tracking-tight text-ink sm:text-2xl">Что нужно сегодня?</h2>
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
