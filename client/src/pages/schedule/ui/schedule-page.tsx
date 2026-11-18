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
    <section className="min-h-[65vh]">
      <PageHeading
        title={t('Расписание')}
        description={t('Выбери группу и дату, чтобы увидеть свои пары.')}
      />
      <div className="portal-card mb-6 grid gap-4 p-4 sm:grid-cols-[minmax(220px,1fr)_minmax(200px,.8fr)] sm:p-5">
        <label className="grid gap-2 text-sm font-semibold text-ink">
          {t('Группа')}
          <input
            className="portal-field"
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
        <label className="grid gap-2 text-sm font-semibold text-ink">
          {t('Дата')}
          <input
            className="portal-field"
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
              className="portal-primary px-5"
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
              className="min-h-11 rounded-xl border border-slate-200 bg-white px-5 text-sm font-semibold text-ink transition hover:border-sky-200 hover:bg-sky-50"
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
                <p className="text-sm font-bold text-sky-800 tabular-nums">
                  {lesson.starts_at} <span className="font-normal text-slate-400">—</span>{' '}
                  {lesson.ends_at}
                </p>
              </div>
              <div className="min-w-0 border-t border-slate-100 pt-3 sm:border-t-0 sm:border-l sm:py-1 sm:pl-5">
                <h2 className="text-base leading-6 font-bold text-ink">
                  {lesson.subject}
                </h2>
                <p className="mt-1 text-sm leading-5 text-muted">
                  {[lesson.teacher, lesson.room && `${t('ауд.')} ${lesson.room}`]
                    .filter(Boolean)
                    .join(' · ')}
                </p>
                {lesson.note && <p className="mt-2 text-xs text-muted">{lesson.note}</p>}
              </div>
            </article>
          ))}
        </div>
      </QueryState>
    </section>
  )
}
