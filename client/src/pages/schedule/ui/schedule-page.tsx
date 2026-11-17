import { useI18n } from '@/shared/i18n'
import { useState } from 'react'
import type { Lesson } from '@/entities/lesson'
import { useSession } from '@/entities/session'
import { ScheduleEditor } from '@/features/edit-schedule'
import { ScheduleImport, type ImportResult } from '@/features/import-schedule'
import { useApiQuery } from '@/shared/api/use-api-query'
import { normalizeGroup } from '@/shared/lib/group'
import { PageHeading } from '@/shared/ui/page-heading'
import { QueryState } from '@/shared/ui/query-state'

function today() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function formatDate(value: string) {
  return value.split('-').reverse().join('.')
}

export function SchedulePage() {
  const { t } = useI18n()

  const session = useSession()
  const [group, setGroup] = useState(session?.group_name ?? '')
  const [day, setDay] = useState(today)
  const [mode, setMode] = useState<'view' | 'edit' | 'import'>('view')
  const [revision, setRevision] = useState(0)
  const [success, setSuccess] = useState('')
  const path =
    group.trim() && day
      ? `schedule?group=${encodeURIComponent(group.trim())}&day=${day}`
      : null
  const { data, loading, error } = useApiQuery<Lesson[]>(path, revision)

  const isAdmin = session?.role === 'admin'
  const ownGroup = session?.role === 'student' ? (session.group_name ?? null) : null
  // Admin edits any group, a student — only their own; the server checks it again.
  const canEditDay =
    Boolean(group.trim()) &&
    (isAdmin || (ownGroup !== null && normalizeGroup(group) === normalizeGroup(ownGroup)))
  const canImport = isAdmin || ownGroup !== null

  function published(message: string) {
    setMode('view')
    setRevision((value) => value + 1)
    setSuccess(message)
  }

  return (
    <section className="min-h-[65vh] py-8">
      <PageHeading
        title={t('Расписание')}
        description={t('Выбери группу и дату, чтобы увидеть свои пары.')}
      />
      <div className="mb-8 flex flex-col gap-5 sm:flex-row">
        <label className="grid gap-2 text-xs">
          {t('Группа')}
          <input
            className="rounded-lg border border-slate-200 bg-white p-3"
            placeholder={t('Например, ИС-23-1')}
            maxLength={50}
            value={group}
            disabled={mode !== 'view'}
            onChange={(event) => {
              setGroup(event.target.value)
              setSuccess('')
            }}
          />
        </label>
        <label className="grid gap-2 text-xs">
          {t('Дата')}
          <input
            className="rounded-lg border border-slate-200 bg-white p-3"
            type="date"
            value={day}
            disabled={mode !== 'view'}
            onChange={(event) => {
              setDay(event.target.value)
              setSuccess('')
            }}
          />
        </label>
      </div>
      {success && (
        <p role="status" className="mb-5 text-sm text-emerald-700">
          {t(success)}
        </p>
      )}
      {mode === 'view' && (canEditDay || canImport) && (
        <div className="mb-6 flex flex-wrap gap-3">
          {canImport && (
            <button
              type="button"
              onClick={() => {
                setSuccess('')
                setMode('import')
              }}
              className="min-h-11 rounded-lg bg-accent px-5 text-sm text-white"
            >
              {t('Загрузить фото расписания')}
            </button>
          )}
          {canEditDay && path && data && !loading && !error && (
            <button
              type="button"
              onClick={() => {
                setSuccess('')
                setMode('edit')
              }}
              className="min-h-11 rounded-lg border border-slate-200 bg-white px-5 text-sm"
            >
              {t('Заполнить / изменить расписание дня')}
            </button>
          )}
        </div>
      )}
      {mode === 'import' && (
        <ScheduleImport
          ownGroup={ownGroup}
          isAdmin={isAdmin}
          onCancel={() => setMode('view')}
          onPublished={(result: ImportResult) => {
            setGroup(result.group)
            setDay(result.first_date)
            published(
              `Расписание ${result.group} опубликовано: ${result.lessons_created} занятий, ` +
                `${formatDate(result.first_date)} — ${formatDate(result.last_date)}.`,
            )
          }}
        />
      )}
      {mode === 'edit' && path && data && (
        <ScheduleEditor
          lessons={data}
          path={path}
          onCancel={() => setMode('view')}
          onPublished={() => published('Расписание опубликовано.')}
        />
      )}
      <QueryState
        loading={loading}
        error={t(error)}
        empty={!data?.length}
        emptyMessage={
          group.trim()
            ? t('На выбранную дату пары ещё не добавлены.')
            : t('Введи свою группу, чтобы посмотреть расписание.')
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
              {[lesson.teacher, lesson.room && `${t('ауд.')} ${lesson.room}`]
                .filter(Boolean)
                .join(' · ')}
            </p>
            {lesson.note && <p className="mt-2 text-xs text-muted">{lesson.note}</p>}
          </article>
        ))}
      </QueryState>
    </section>
  )
}
