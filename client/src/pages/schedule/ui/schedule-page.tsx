import { useState } from 'react'
import type { Lesson } from '@/entities/lesson'
import { useApiQuery } from '@/shared/api/use-api-query'
import { PageHeading } from '@/shared/ui/page-heading'
import { QueryState } from '@/shared/ui/query-state'

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

export function SchedulePage() {
  const [group, setGroup] = useState('')
  const [day, setDay] = useState(today)
  const path =
    group.trim() && day
      ? `schedule?group=${encodeURIComponent(group.trim())}&day=${day}`
      : null
  const { data, loading, error } = useApiQuery<Lesson[]>(path)

  return (
    <section className="min-h-[65vh]">
      <PageHeading
        title="Расписание"
        description="Выбери группу и дату, чтобы увидеть пары и аудитории."
      />
      <div className="portal-card mb-6 grid gap-4 p-4 sm:grid-cols-[minmax(220px,1fr)_minmax(200px,.8fr)] sm:p-5">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Группа
          <input
            className="portal-field"
            placeholder="Например, ИС-23-1"
            maxLength={50}
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-sm font-semibold text-ink">
          Дата
          <input
            className="portal-field"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
      </div>

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-base font-bold text-ink">Пары на выбранную дату</h2>
        {day && <time className="text-sm text-muted" dateTime={day}>{new Date(`${day}T12:00:00`).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', weekday: 'long' })}</time>}
      </div>

      <QueryState
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyMessage={
          group.trim()
            ? 'На выбранную дату расписание не загружено.'
            : 'Введи свою группу, чтобы посмотреть расписание.'
        }
      >
        <div className="grid gap-3">
          {data?.map((lesson, index) => (
            <article
              className="portal-card grid gap-3 p-4 sm:grid-cols-[110px_minmax(0,1fr)] sm:items-center sm:gap-5 sm:p-5"
              key={lesson.id}
            >
              <div className="flex items-center gap-3 sm:block">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky-50 text-xs font-bold text-sky-800">
                  {String(index + 1).padStart(2, '0')}
                </span>
                <p className="text-sm font-bold tabular-nums text-sky-800">
                  {lesson.starts_at} <span className="font-normal text-slate-400">—</span> {lesson.ends_at}
                </p>
              </div>
              <div className="min-w-0 border-t border-slate-100 pt-3 sm:border-t-0 sm:border-l sm:py-1 sm:pl-5">
                <h3 className="text-base leading-6 font-bold text-ink">{lesson.subject}</h3>
                <p className="mt-1 text-sm leading-5 text-muted">
                  {lesson.teacher} <span className="mx-1.5 text-slate-300">·</span> аудитория {lesson.room}
                </p>
              </div>
            </article>
          ))}
        </div>
      </QueryState>
    </section>
  )
}
