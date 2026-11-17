import { useRef, useState } from 'react'
import type { StudyApplication } from '@/entities/application'
import { useSession } from '@/entities/session'
import { ApplicationEditor } from '@/features/edit-application'
import { apiRequest } from '@/shared/api/client'
import { useApiQuery } from '@/shared/api/use-api-query'
import { useI18n } from '@/shared/i18n'
import { safeLink } from '@/shared/lib/safe-link'
import { QueryState } from '@/shared/ui/query-state'

const pricingLabels = {
  free: 'Бесплатно',
  freemium: 'Бесплатно + платные функции',
  paid: 'Платно',
}
const surfaces = [
  'bg-sky-50',
  'bg-slate-100',
  'bg-emerald-50',
  'bg-indigo-50',
  'bg-orange-50',
  'bg-amber-50',
  'bg-teal-50',
  'bg-violet-50',
]

function ApplicationLogo({ url, name }: { url: string; name: string }) {
  const [failed, setFailed] = useState(false)
  const source = url.startsWith('/logos/') && !url.includes('..') ? url : safeLink(url)
  return (
    <span className="grid size-18 place-items-center rounded-2xl bg-white shadow-[0_8px_24px_-12px_rgba(24,43,61,0.25)]">
      {source && !failed ? (
        <img
          src={source}
          alt=""
          width={44}
          height={44}
          className="size-11 object-contain"
          onError={() => setFailed(true)}
        />
      ) : (
        <span className="text-2xl font-extrabold text-accent" aria-hidden="true">
          {name.slice(0, 2)}
        </span>
      )}
    </span>
  )
}

export function ApplicationsPage() {
  const { language, t } = useI18n()
  const session = useSession()
  const admin = session?.role === 'admin'
  const [revision, setRevision] = useState(0)
  const { data, loading, error } = useApiQuery<StudyApplication[]>(
    'applications',
    revision,
  )
  const [editor, setEditor] = useState<StudyApplication | null | undefined>(undefined)
  const [deleting, setDeleting] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')
  const addButton = useRef<HTMLButtonElement>(null)
  const editorSection = useRef<HTMLDivElement>(null)

  function openEditor(application: StudyApplication | null) {
    setEditor(application)
    setDeleting(null)
    setNotice('')
    setMutationError('')
    requestAnimationFrame(() =>
      editorSection.current?.scrollIntoView({
        block: 'nearest',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      }),
    )
  }

  function closeEditor() {
    setEditor(undefined)
    addButton.current?.focus()
  }

  function cancelDelete(id: number) {
    setDeleting(null)
    requestAnimationFrame(() =>
      document.getElementById(`delete-application-${id}`)?.focus(),
    )
  }

  async function remove(id: number) {
    setBusy(true)
    setMutationError('')
    try {
      await apiRequest(`applications/${id}`, { method: 'DELETE' })
      setDeleting(null)
      setRevision((value) => value + 1)
      setNotice('Приложение удалено.')
      addButton.current?.focus()
    } catch (reason) {
      setMutationError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось выполнить запрос. Попробуйте ещё раз.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="min-h-[65vh] w-full min-w-0 pb-12">
      <div className="relative mb-8 w-full min-w-0 overflow-hidden rounded-3xl border border-sky-100 bg-sky-50 px-6 py-8 sm:px-8 sm:py-10">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-16 -right-16 size-64 rounded-full border-[32px] border-white/60"
        />
        <p className="relative mb-4 text-[9px] font-extrabold tracking-[0.18em] text-accent">
          {t('ТВОЙ НАБОР ИНСТРУМЕНТОВ')}
        </p>
        <h1 className="relative text-3xl font-extrabold tracking-tight md:text-4xl">
          {t('Приложения')}
        </h1>
        <h2 className="relative mt-4 text-lg font-semibold tracking-tight">
          {t('Всё, чтобы начать создавать.')}
        </h2>
        <p className="relative mt-3 max-w-xl text-xs leading-7 text-muted">
          {t(
            'Редакторы кода, базы данных и другие инструменты для учёбы. Выбирай приложение и переходи на официальный сайт скачивания.',
          )}
        </p>
      </div>
      <div className="mb-6 flex w-full min-w-0 flex-wrap items-center justify-between gap-4">
        <p className="hidden text-xs text-muted [@media(hover:hover)]:block">
          {t('Наведи на карточку, чтобы узнать больше.')}
        </p>
        {admin && (
          <button
            ref={addButton}
            type="button"
            disabled={busy || editor !== undefined}
            onClick={() => openEditor(null)}
            className="ml-auto inline-flex min-h-11 items-center gap-3 rounded-xl bg-ink px-5 text-xs font-semibold text-white transition hover:bg-slate-700 disabled:opacity-50"
          >
            <span aria-hidden="true" className="text-lg">
              +
            </span>
            {t('Добавить приложение')}
          </button>
        )}
      </div>
      {notice && (
        <p
          role="status"
          className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-800"
        >
          {t(notice)}
        </p>
      )}
      {mutationError && (
        <p role="alert" className="mb-5 rounded-xl bg-red-50 p-4 text-sm text-red-700">
          {t(mutationError)}
        </p>
      )}
      <div ref={editorSection} className="min-w-0">
        {admin && editor !== undefined && (
          <ApplicationEditor
            key={editor?.id ?? 'new'}
            application={editor}
            onCancel={closeEditor}
            onSaved={() => {
              closeEditor()
              setRevision((value) => value + 1)
              setNotice('Приложение сохранено.')
            }}
          />
        )}
      </div>
      <QueryState
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyMessage={t('Каталог пока пуст. Добавьте первое приложение.')}
      >
        <div className="grid w-full min-w-0 grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((application, index) => (
            <article
              key={application.id}
              className="application-card group relative flex min-w-0 flex-col rounded-2xl border border-slate-200 bg-white transition-[border-color,box-shadow] duration-300 focus-within:border-sky-300 focus-within:shadow-lg hover:border-sky-300 hover:shadow-[0_18px_45px_-24px_rgba(22,138,190,0.4)]"
            >
              <a
                href={safeLink(application.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 flex-1 flex-col rounded-2xl focus-visible:-outline-offset-4"
                aria-label={`${application.name} — ${t('Скачать с официального сайта')}`}
                aria-describedby={`application-description-${application.id}`}
              >
                <div
                  className={`relative flex h-36 shrink-0 items-center justify-center overflow-hidden rounded-t-2xl ${surfaces[index % surfaces.length]}`}
                >
                  <span
                    aria-hidden="true"
                    className="absolute top-4 right-4 grid size-7 place-items-center rounded-full bg-white/80 text-sm text-muted transition group-hover:bg-ink group-hover:text-white"
                  >
                    ↗
                  </span>
                  <ApplicationLogo
                    key={application.logo_url}
                    url={application.logo_url}
                    name={application.name}
                  />
                </div>
                <div className="p-5">
                  <h2 className="text-lg font-bold tracking-tight [overflow-wrap:anywhere]">
                    {application.name}
                  </h2>
                  <span
                    className={`mt-4 inline-flex max-w-full items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[9px] leading-4 font-semibold ${application.pricing === 'paid' ? 'bg-amber-50 text-amber-800' : application.pricing === 'freemium' ? 'bg-sky-50 text-sky-800' : 'bg-emerald-50 text-emerald-800'}`}
                  >
                    <span aria-hidden="true">
                      {application.pricing === 'paid' ? '◈' : '●'}
                    </span>
                    {t(pricingLabels[application.pricing])}
                  </span>
                  <div className="application-details">
                    <div className="overflow-hidden">
                      <p
                        id={`application-description-${application.id}`}
                        className="pt-4 text-xs leading-6 text-muted"
                      >
                        {language === 'kk'
                          ? application.description_kk || application.description
                          : application.description}
                      </p>
                      <span className="mt-4 inline-flex items-center gap-2 text-[10px] font-bold text-accent">
                        {t('Скачать с официального сайта')}{' '}
                        <span aria-hidden="true">↗</span>
                      </span>
                    </div>
                  </div>
                </div>
              </a>
              {admin && (
                <div className="border-t border-slate-100 px-5 py-3">
                  {deleting === application.id ? (
                    <div role="group" aria-label={t('Удалить приложение?')}>
                      <p className="text-xs font-bold">{t('Удалить приложение?')}</p>
                      <p className="mt-1 text-[10px] leading-5 text-muted">
                        {t('Карточка исчезнет из общего каталога.')}
                      </p>
                      <div className="mt-2 flex gap-4">
                        <button
                          autoFocus
                          type="button"
                          disabled={busy}
                          onClick={() => cancelDelete(application.id)}
                          className="min-h-10 text-xs"
                        >
                          {t('Отмена')}
                        </button>
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => void remove(application.id)}
                          className="min-h-10 text-xs font-bold text-red-700"
                        >
                          {t(busy ? 'Удаление…' : 'Удалить')}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex justify-between gap-3">
                      <button
                        type="button"
                        disabled={busy || editor !== undefined}
                        onClick={() => openEditor(application)}
                        aria-label={`${t('Редактировать')} ${application.name}`}
                        className="min-h-10 text-[11px] font-semibold text-muted hover:text-accent"
                      >
                        {t('Редактировать')}
                      </button>
                      <button
                        type="button"
                        id={`delete-application-${application.id}`}
                        disabled={busy || editor !== undefined}
                        onClick={() => {
                          setDeleting(application.id)
                          setMutationError('')
                          setNotice('')
                        }}
                        aria-label={`${t('Удалить')} ${application.name}`}
                        className="min-h-10 text-[11px] text-slate-400 hover:text-red-700"
                      >
                        {t('Удалить')}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </article>
          ))}
        </div>
      </QueryState>
    </section>
  )
}
