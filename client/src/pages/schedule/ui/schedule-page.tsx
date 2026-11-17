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
    <section className="min-h-[65vh] py-8">
      <PageHeading
        title="Расписание"
        description="Выбери группу и дату, чтобы увидеть свои пары."
      />
      <div className="mb-8 flex flex-col gap-5 sm:flex-row">
        <label className="grid gap-2 text-xs">
          Группа
          <input
            className="rounded-lg border border-slate-200 bg-white p-3"
            placeholder="Например, ИС-23-1"
            maxLength={50}
            value={group}
            onChange={(event) => setGroup(event.target.value)}
          />
        </label>
        <label className="grid gap-2 text-xs">
          Дата
          <input
            className="rounded-lg border border-slate-200 bg-white p-3"
            type="date"
            value={day}
            onChange={(event) => setDay(event.target.value)}
          />
        </label>
      </div>
      <QueryState
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyMessage={
          group.trim()
            ? 'На выбранную дату пары ещё не добавлены.'
            : 'Введи свою группу, чтобы посмотреть расписание.'
        }
      >
        {data?.map((lesson) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-6"
            key={lesson.id}
          >
            <p className="text-xs text-accent">
              {lesson.starts_at} — {lesson.ends_at}
            </p>
            <h2 className="my-3 font-bold">{lesson.subject}</h2>
            <p className="text-sm text-muted">
              {lesson.teacher} · ауд. {lesson.room}
            </p>
          </article>
        ))}
      </QueryState>
    </section>
  )
}
