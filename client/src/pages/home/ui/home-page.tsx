import { Link } from 'react-router-dom'
import { navigation } from '@/shared/config/navigation'

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden rounded-3xl bg-sky-100 px-6 py-10 md:px-10 xl:px-12">
        <p className="text-[9px] font-extrabold tracking-[0.2em] text-muted">
          УЧИСЬ. СОЗДАВАЙ. БУДЬ В КУРСЕ.
        </p>
        <h1 className="mt-6 text-4xl leading-[1.08] font-extrabold tracking-tighter lg:text-5xl xl:text-6xl">
          Твоя жизнь
          <br />в колледже.
          <br />
          <span className="text-accent">В одном месте.</span>
        </h1>
        <p className="mt-5 max-w-sm text-xs leading-7 text-muted">
          Расписание, полезные документы и инструменты для учёбы. Меньше поисков — больше
          времени на важное.
        </p>
        <Link
          className="mt-6 inline-flex items-center gap-8 rounded-xl bg-ink px-5 py-4 text-xs text-white"
          to="/schedule"
        >
          Открыть расписание <span aria-hidden="true">↗</span>
        </Link>
        <div
          className="absolute top-14 right-8 hidden h-80 w-64 xl:block"
          aria-hidden="true"
        >
          <div className="absolute inset-0 rounded-full border border-sky-200" />
          <span className="absolute -top-6 -right-2 z-10 text-8xl text-white">✳</span>
          <div className="absolute inset-x-6 top-6 rotate-9 rounded-xl bg-sky-300 p-6 text-sky-900 shadow-[12px_20px_0_#c7e9fa]">
            <span className="text-[8px] tracking-widest">INTC / CAMPUS</span>
            <strong className="my-8 block text-4xl leading-tight tracking-tighter">
              Твоё
              <br />
              место
              <br />
              развития.
            </strong>
            <div className="border-t border-sky-500 pt-4 text-[8px] tracking-widest">
              STUDENT SUPPORTER ↗
            </div>
          </div>
        </div>
      </section>
      <section className="mt-10 mb-5 flex items-center justify-between">
        <div>
          <p className="mb-2 text-[9px] font-extrabold tracking-[0.2em] text-muted">
            БЫСТРЫЙ ДОСТУП
          </p>
          <h2 className="text-2xl font-bold tracking-tight">Что нужно сегодня?</h2>
        </div>
        <span className="hidden text-[10px] text-slate-400 lg:inline">
          Сосредоточься на учёбе
        </span>
      </section>
      <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
        {navigation.slice(1).map((item, index) => (
          <Link
            className="rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-sky-300 motion-safe:hover:-translate-y-1"
            key={item.path}
            to={item.path}
          >
            <span className="flex items-center justify-between">
              <span className="text-3xl text-accent" aria-hidden="true">
                {item.icon}
              </span>
              <span className="text-[9px] text-slate-400">0{index + 1} ↗</span>
            </span>
            <h3 className="mt-6 mb-3 text-sm font-bold">{item.title}</h3>
            <p className="text-[10px] leading-6 text-muted">{item.description}</p>
          </Link>
        ))}
      </div>
      <section className="my-6 flex items-center gap-5 rounded-2xl border border-sky-100 bg-sky-50 p-6">
        <span className="text-4xl text-accent" aria-hidden="true">
          ✧
        </span>
        <div>
          <h3 className="mb-2 text-sm font-bold">Помощник, который знает твой колледж</h3>
          <p className="text-[10px] leading-6 text-muted">
            Здесь появится чат с ответами по официальным документам и ссылками на
            источники.
          </p>
        </div>
        <Link
          className="ml-auto grid size-11 shrink-0 place-items-center rounded-full border border-sky-100 bg-white"
          to="/chat"
          aria-label="Открыть ИИ-помощника"
        >
          ↗
        </Link>
      </section>
    </>
  )
}
