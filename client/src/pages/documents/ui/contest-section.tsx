import { useI18n, type Language } from '@/shared/i18n'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  contests,
  type Contest,
  type ContestCreate,
  type ContestRecord,
  type ContestRegistration,
} from '@/entities/contest'
import { useAuth } from '@/entities/session'
import { apiRequest } from '@/shared/api/client'
import { useApiQuery } from '@/shared/api/use-api-query'

function isDeadlinePassed(deadline: string): boolean {
  const [year, month, day] = deadline.split('-').map(Number)
  return new Date(year, month - 1, day, 23, 59, 59).getTime() < Date.now()
}

function formatDeadline(deadline: string, language: Language): string {
  const [year, month, day] = deadline.split('-').map(Number)
  if (language === 'kk') {
    const months = [
      'қаңтар',
      'ақпан',
      'наурыз',
      'сәуір',
      'мамыр',
      'маусым',
      'шілде',
      'тамыз',
      'қыркүйек',
      'қазан',
      'қараша',
      'желтоқсан',
    ]
    return `${year} жылғы ${day} ${months[month - 1]}`
  }
  return new Intl.DateTimeFormat('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1, day))
}

function fromContestRecord(record: ContestRecord): Contest {
  const [year, month, day] = record.signup_deadline.split('-').map(Number)
  const deadlineDate = new Date(year, month - 1, day)
  return {
    id: record.slug,
    title: record.title,
    description: record.description,
    dates: record.dates,
    signupDeadline: record.signup_deadline,
    signupDeadlineLabel: new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(deadlineDate),
    format: record.format,
    eligibility: record.eligibility,
    curator: record.curator,
    photoFilename: record.photo_filename ?? '',
    details: record.details,
  }
}

function ContestPhoto({
  contest,
  detailed = false,
}: {
  contest: Contest
  detailed?: boolean
}) {
  const { t } = useI18n()

  const hasImage = Boolean(contest.photoFilename)

  return (
    <figure
      className={`relative flex items-center justify-center overflow-hidden bg-slate-100 text-center text-sm text-slate-500 ${detailed ? 'min-h-72 p-5' : 'h-36'}`}
    >
      {hasImage ? (
        <img
          alt={contest.photoAlt ?? `${t('Фото:')} ${contest.title}`}
          className={
            detailed
              ? 'max-h-[28rem] max-w-full object-contain'
              : 'h-full w-full object-cover'
          }
          loading="lazy"
          src={`/contest-images/${encodeURIComponent(contest.photoFilename)}`}
        />
      ) : (
        <div>
          <svg
            aria-hidden="true"
            className="mx-auto mb-2 h-8 w-8 text-sky-800"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth="1.6"
          >
            <rect x="3" y="4" width="18" height="16" rx="2" />
            <circle cx="8.5" cy="9" r="1.5" />
            <path strokeLinecap="round" strokeLinejoin="round" d="m21 15-5-5L5 20" />
          </svg>
          <span>{t('Фото конкурса пока не добавлено')}</span>
        </div>
      )}
      {hasImage && contest.photoSource && (
        <a
          className="absolute right-2 bottom-2 max-w-[90%] truncate rounded-md bg-white/95 px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm hover:text-sky-800"
          href={contest.photoSource}
          rel="noreferrer"
          target="_blank"
        >
          {t('Фото:')} {contest.photoCredit ?? t('источник')}
        </a>
      )}
    </figure>
  )
}

function AddContestDialog({
  initial,
  onClose,
  onSaved,
}: {
  initial: ContestRecord | null
  onClose: () => void
  onSaved: (contest: ContestRecord, isNew: boolean) => void
}) {
  const { t } = useI18n()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [dates, setDates] = useState(initial?.dates ?? '')
  const [signupDeadline, setSignupDeadline] = useState(initial?.signup_deadline ?? '')
  const [format, setFormat] = useState(initial?.format ?? '')
  const [eligibility, setEligibility] = useState(initial?.eligibility ?? '')
  const [curator, setCurator] = useState(initial?.curator ?? '')
  const [detailsText, setDetailsText] = useState(initial?.details.join('\n') ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const details = detailsText
      .split(/\r?\n/)
      .map((item) => item.trim())
      .filter(Boolean)
    if (!details.length) {
      setError('Добавьте хотя бы один пункт с подробностями конкурса.')
      return
    }
    const payload: ContestCreate = {
      title: title.trim(),
      description: description.trim(),
      dates: dates.trim(),
      signup_deadline: signupDeadline,
      format: format.trim(),
      eligibility: eligibility.trim(),
      curator: curator.trim(),
      photo_filename: initial?.photo_filename ?? null,
      details,
    }
    setSaving(true)
    setError('')
    try {
      const contest = await apiRequest<ContestRecord>(
        initial ? `contests/${encodeURIComponent(initial.slug)}` : 'contests',
        {
          method: initial ? 'PUT' : 'POST',
          body: JSON.stringify(payload),
        },
      )
      onSaved(contest, !initial)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось добавить конкурс.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <form
        aria-labelledby="contest-create-title"
        aria-modal="true"
        className="my-5 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl md:p-7"
        onSubmit={(event) => void submit(event)}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
              {t('Управление конкурсами')}{' '}
            </p>
            <h2 id="contest-create-title" className="mt-2 text-xl font-extrabold">
              {initial ? t('Изменить конкурс') : t('Добавить конкурс')}
            </h2>
          </div>
          <button
            aria-label={t('Закрыть')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink sm:col-span-2">
            {t('Название')}{' '}
            <input
              autoFocus
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={250}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className="text-sm font-semibold text-ink sm:col-span-2">
            {t('Краткое описание')}{' '}
            <textarea
              className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
              maxLength={2000}
              onChange={(event) => setDescription(event.target.value)}
              required
              value={description}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Даты проведения')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={250}
              onChange={(event) => setDates(event.target.value)}
              placeholder={t('Например, 12–13 декабря 2026')}
              required
              value={dates}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Запись до')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              onChange={(event) => setSignupDeadline(event.target.value)}
              required
              type="date"
              value={signupDeadline}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Формат')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={250}
              onChange={(event) => setFormat(event.target.value)}
              required
              value={format}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Кто может участвовать')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              onChange={(event) => setEligibility(event.target.value)}
              required
              value={eligibility}
            />
          </label>
          <label className="text-sm font-semibold text-ink sm:col-span-2">
            {t('Куратор / организатор')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={200}
              onChange={(event) => setCurator(event.target.value)}
              required
              value={curator}
            />
          </label>
          <label className="text-sm font-semibold text-ink sm:col-span-2">
            {t('Подробности — по одному пункту на строку')}{' '}
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
              maxLength={4000}
              onChange={(event) => setDetailsText(event.target.value)}
              placeholder={t('Требования к работе\nЭтапы конкурса\nЧто подготовить')}
              required
              value={detailsText}
            />
          </label>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {t(error)}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            {t('Отмена')}{' '}
          </button>
          <button
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            {saving ? t('Сохраняем…') : t('Сохранить конкурс')}
          </button>
        </div>
      </form>
    </div>
  )
}

type ContestRegistrationDialogProps = {
  contest: Contest
  onClose: () => void
  onRegistered: (id: number) => void
}

function ContestRegistrationDialog({
  contest,
  onClose,
  onRegistered,
}: ContestRegistrationDialogProps) {
  const { t } = useI18n()

  const { session } = useAuth()
  const [fullName, setFullName] = useState(
    session ? `${session.first_name} ${session.last_name}` : '',
  )
  const [group, setGroup] = useState(session?.group_name ?? '')
  const [course, setCourse] = useState('')
  const [contact, setContact] = useState('')
  const [isTeam, setIsTeam] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [teamMembers, setTeamMembers] = useState('')
  const [comment, setComment] = useState('')
  const [consent, setConsent] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  async function submitRegistration(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError('')
    const payload: ContestRegistration = {
      contest_id: contest.id,
      contest_title: contest.title,
      full_name: fullName.trim(),
      group_name: group.trim(),
      course: course.trim(),
      contact: contact.trim(),
      is_team: isTeam,
      team_name: isTeam ? teamName.trim() : undefined,
      team_members: isTeam ? teamMembers.trim() : undefined,
      comment: comment.trim() || undefined,
      consent: true,
    }
    try {
      const result = await apiRequest<{ id: number }>('contest-signups', {
        method: 'POST',
        body: JSON.stringify({ ...payload, consent }),
      })
      onRegistered(result.id)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось отправить заявку.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !submitting) onClose()
      }}
    >
      <form
        aria-labelledby="contest-registration-title"
        aria-modal="true"
        className="my-5 w-full max-w-2xl rounded-2xl bg-white p-5 shadow-2xl md:p-7"
        onSubmit={(event) => void submitRegistration(event)}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
              {t('Форма записи')}{' '}
            </p>
            <h2 id="contest-registration-title" className="mt-2 text-xl font-extrabold">
              {t(contest.title)}
            </h2>
          </div>
          <button
            aria-label={t('Закрыть форму')}
            className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-ink">
            {t('ФИО')}{' '}
            <input
              autoFocus
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={250}
              onChange={(event) => setFullName(event.target.value)}
              required
              value={fullName}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Группа')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={50}
              onChange={(event) => setGroup(event.target.value)}
              required
              value={group}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Курс')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              max="6"
              min="1"
              onChange={(event) => setCourse(event.target.value)}
              required
              type="number"
              value={course}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Телефон / Telegram')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={200}
              onChange={(event) => setContact(event.target.value)}
              placeholder={t('+7... или @username')}
              required
              value={contact}
            />
          </label>
          <fieldset className="sm:col-span-2">
            <legend className="text-sm font-semibold text-ink">
              {t('Командное участие')}
            </legend>
            <div className="mt-2 flex gap-3">
              {[false, true].map((teamChoice) => (
                <label
                  className="flex min-h-10 items-center gap-2 rounded-lg border border-slate-200 px-3 text-sm"
                  key={String(teamChoice)}
                >
                  <input
                    checked={isTeam === teamChoice}
                    name="team-participation"
                    onChange={() => setIsTeam(teamChoice)}
                    type="radio"
                  />
                  {teamChoice ? t('Да') : t('Нет')}
                </label>
              ))}
            </div>
          </fieldset>
          {isTeam && (
            <>
              <label className="text-sm font-semibold text-ink">
                {t('Название команды')}{' '}
                <input
                  className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
                  maxLength={200}
                  onChange={(event) => setTeamName(event.target.value)}
                  required
                  value={teamName}
                />
              </label>
              <label className="text-sm font-semibold text-ink">
                {t('ФИО участников команды')}{' '}
                <textarea
                  className="mt-2 min-h-11 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
                  maxLength={2000}
                  onChange={(event) => setTeamMembers(event.target.value)}
                  placeholder={t('Перечислите участников')}
                  required
                  value={teamMembers}
                />
              </label>
            </>
          )}
          <label className="text-sm font-semibold text-ink sm:col-span-2">
            {t('Комментарий')}{' '}
            <span className="font-normal text-muted">{t('(необязательно)')}</span>
            <textarea
              className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
              maxLength={2000}
              onChange={(event) => setComment(event.target.value)}
              value={comment}
            />
          </label>
          <label className="flex items-start gap-3 text-sm leading-5 text-muted sm:col-span-2">
            <input
              checked={consent}
              className="mt-1"
              onChange={(event) => setConsent(event.target.checked)}
              required
              type="checkbox"
            />
            <span>
              {t(
                'Согласен(на) на обработку персональных данных для организации участия в конкурсе.',
              )}{' '}
            </span>
          </label>
        </div>

        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {t(error)}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            disabled={submitting}
            onClick={onClose}
            type="button"
          >
            {t('Отмена')}{' '}
          </button>
          <button
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            disabled={submitting}
            type="submit"
          >
            {submitting ? t('Отправляем…') : t('Отправить заявку')}
          </button>
        </div>
      </form>
    </div>
  )
}

export function ContestSection({
  onBack,
  isAdmin,
}: {
  onBack: () => void
  isAdmin: boolean
}) {
  const { t, language } = useI18n()

  const [searchParams, setSearchParams] = useSearchParams()
  const { data: savedContests } = useApiQuery<ContestRecord[]>('contests')
  const [localContestRecords, setLocalContestRecords] = useState<ContestRecord[]>([])
  const [deletedContestSlugs, setDeletedContestSlugs] = useState<string[]>([])
  const [createOpen, setCreateOpen] = useState(false)
  const [editingContest, setEditingContest] = useState<ContestRecord | null>(null)
  const seedStarted = useRef(false)
  const recordsBySlug = new Map<string, ContestRecord>()
  for (const record of savedContests ?? []) recordsBySlug.set(record.slug, record)
  for (const record of localContestRecords) recordsBySlug.set(record.slug, record)
  const availableContests = [
    ...contests.map((contest) =>
      recordsBySlug.has(contest.id)
        ? fromContestRecord(recordsBySlug.get(contest.id)!)
        : contest,
    ),
    ...Array.from(recordsBySlug.values())
      .filter((record) => !contests.some((contest) => contest.id === record.slug))
      .map(fromContestRecord),
  ].filter((contest) => !deletedContestSlugs.includes(contest.id))

  useEffect(() => {
    if (!isAdmin || !savedContests || seedStarted.current) return
    seedStarted.current = true
    const existing = new Set(savedContests.map((record) => record.slug))
    const missing = contests.filter((contest) => !existing.has(contest.id))
    void Promise.all(
      missing.map((contest) =>
        apiRequest<ContestRecord>(`contests/seed/${encodeURIComponent(contest.id)}`, {
          method: 'POST',
          body: JSON.stringify({
            title: contest.title,
            description: contest.description,
            dates: contest.dates,
            signup_deadline: contest.signupDeadline,
            format: contest.format,
            eligibility: contest.eligibility,
            curator: contest.curator,
            photo_filename: contest.photoFilename || null,
            details: contest.details,
          }),
        }),
      ),
    ).then((records) => {
      setLocalContestRecords((current) => [
        ...current,
        ...records.filter((record) => record.is_active),
      ])
      setDeletedContestSlugs((current) => [
        ...current,
        ...records.filter((record) => !record.is_active).map((record) => record.slug),
      ])
    })
  }, [isAdmin, savedContests])
  const selectedContest = availableContests.find(
    (contest) => contest.id === searchParams.get('contest'),
  )
  const [registrationContest, setRegistrationContest] = useState<Contest | null>(null)
  const [registeredId, setRegisteredId] = useState<number | null>(null)
  const addContestButton = isAdmin && (
    <button
      aria-label={t('Добавить конкурс')}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-700 text-white shadow-sm transition hover:bg-sky-800"
      onClick={() => setCreateOpen(true)}
      title={t('Добавить конкурс')}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )

  function showContest(contestId: string) {
    setRegisteredId(null)
    setSearchParams({ section: 'contests', contest: contestId })
  }

  function backToContestList() {
    setSearchParams({ section: 'contests' })
  }

  async function deleteContest(contest: Contest) {
    if (!recordFor(contest)) return
    if (!window.confirm(`${t('Удалить конкурс «')}${contest.title}${t('»?')}`)) return
    await apiRequest<void>(`contests/${encodeURIComponent(contest.id)}`, {
      method: 'DELETE',
    })
    setDeletedContestSlugs((items) => [...items, contest.id])
    setLocalContestRecords((items) => items.filter((item) => item.slug !== contest.id))
    setSearchParams({ section: 'contests' })
  }

  function recordFor(contest: Contest) {
    return (
      localContestRecords.find((item) => item.slug === contest.id) ??
      (savedContests ?? []).find((item) => item.slug === contest.id) ??
      null
    )
  }

  return (
    <>
      <button
        className="mb-5 rounded-lg px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
        onClick={selectedContest ? backToContestList : onBack}
        type="button"
      >
        ← {selectedContest ? t('Все конкурсы') : t('Все разделы')}
      </button>

      {!selectedContest ? (
        <>
          <div className="mt-1 flex items-start justify-between gap-4 rounded-2xl border border-slate-100 bg-white p-5 shadow-sm md:p-7">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
                {t('Отдел конкурсов')}{' '}
              </p>
              <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                {t('IT конкурсы 2026. Запись участников')}{' '}
              </h2>
              <p className="mt-3 text-sm leading-6 text-muted">
                {t('Хочешь проявить себя? Выбери конкурс и запишись!')}{' '}
              </p>
              <p className="mt-3 text-sm text-muted">
                {t('По вопросам участия обращайтесь к куратору конкурса.')}{' '}
              </p>
            </div>
            {addContestButton}
          </div>

          {registeredId !== null && (
            <p
              className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
              role="status"
            >
              {t('Заявка №')}
              {registeredId} {t('принята. Спасибо за регистрацию!')}
            </p>
          )}

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {availableContests.map((contest) => {
              const closed = isDeadlinePassed(contest.signupDeadline)
              return (
                <article
                  className="flex min-h-full flex-col overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                  key={contest.id}
                >
                  <button
                    aria-label={`${t('Открыть конкурс:')} ${contest.title}`}
                    className="group flex w-full flex-1 flex-col text-left focus-visible:outline-2 focus-visible:outline-offset-[-3px] focus-visible:outline-sky-700"
                    onClick={() => showContest(contest.id)}
                    type="button"
                  >
                    <ContestPhoto contest={contest} />
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-lg leading-snug font-extrabold text-ink group-hover:text-sky-800">
                        {t(contest.title)}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                        {t(contest.description)}
                      </p>
                      <p className="mt-auto pt-4 text-xs font-semibold text-slate-600">
                        {t('Даты:')} {contest.dates}
                      </p>
                      <p className="mt-1 text-xs text-slate-500">
                        {t('Запись до:')}{' '}
                        {formatDeadline(contest.signupDeadline, language)}
                      </p>
                    </div>
                  </button>
                  <div className="flex flex-wrap gap-2 px-5 pb-5">
                    {closed ? (
                      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-semibold text-slate-500">
                        {t('Запись закрыта')}{' '}
                      </span>
                    ) : (
                      <button
                        className="rounded-lg bg-sky-700 px-3 py-2 text-sm font-bold text-white hover:bg-sky-800"
                        onClick={() => setRegistrationContest(contest)}
                        type="button"
                      >
                        {t('Записаться')}{' '}
                      </button>
                    )}
                    {isAdmin && recordFor(contest) && (
                      <div className="ml-auto flex gap-2">
                        <button
                          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-sky-800"
                          onClick={() => {
                            const record = recordFor(contest)
                            if (record) setEditingContest(record)
                          }}
                          type="button"
                        >
                          {t('Изменить')}
                        </button>
                        <button
                          className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                          onClick={() => void deleteContest(contest)}
                          type="button"
                        >
                          {t('Удалить')}
                        </button>
                      </div>
                    )}
                  </div>
                </article>
              )
            })}
          </div>
        </>
      ) : (
        <>
          {registeredId !== null && (
            <p
              className="mt-5 rounded-xl bg-emerald-50 p-4 text-sm font-semibold text-emerald-900"
              role="status"
            >
              {t('Заявка №')}
              {registeredId} {t('принята. Спасибо за регистрацию!')}
            </p>
          )}
          <article className="mt-5 overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm">
            <div className="grid md:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
              <ContestPhoto contest={selectedContest} detailed />
              <div className="min-w-0 p-5 md:p-7">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
                      {selectedContest.dates}
                    </p>
                    <h2 className="mt-2 text-2xl font-extrabold tracking-tight md:text-3xl">
                      {t(selectedContest.title)}
                    </h2>
                    <p className="mt-3 text-sm leading-6 text-muted">
                      {t(selectedContest.description)}
                    </p>
                  </div>
                  {isAdmin && recordFor(selectedContest) ? (
                    <div className="flex gap-2">
                      {' '}
                      <button
                        className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-sky-800"
                        onClick={() => {
                          const record = recordFor(selectedContest)
                          if (record) setEditingContest(record)
                        }}
                        type="button"
                      >
                        {t('Изменить')}
                      </button>
                      <button
                        className="rounded-lg border border-red-200 px-3 py-2 text-sm font-semibold text-red-700"
                        onClick={() => void deleteContest(selectedContest)}
                        type="button"
                      >
                        {t('Удалить')}
                      </button>
                    </div>
                  ) : (
                    addContestButton
                  )}
                </div>
                <div className="mt-5 grid gap-4 rounded-xl bg-slate-50 p-4 text-sm sm:grid-cols-2">
                  <p>
                    <strong>{t('Запись до:')}</strong>{' '}
                    {formatDeadline(selectedContest.signupDeadline, language)}
                  </p>
                  <p>
                    <strong>{t('Формат:')}</strong> {selectedContest.format}
                  </p>
                  <p>
                    <strong>{t('Кто может участвовать:')}</strong>{' '}
                    {selectedContest.eligibility}
                  </p>
                  <p>
                    <strong>{t('Куратор:')}</strong> {selectedContest.curator}
                  </p>
                </div>
                <ul className="mt-5 list-disc space-y-2 pl-5 text-sm leading-6 text-muted">
                  {selectedContest.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
                <div className="mt-6">
                  {isDeadlinePassed(selectedContest.signupDeadline) ? (
                    <span className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-500">
                      {t('Запись закрыта')}{' '}
                    </span>
                  ) : (
                    <button
                      className="rounded-lg bg-sky-700 px-5 py-3 text-sm font-bold text-white hover:bg-sky-800"
                      onClick={() => setRegistrationContest(selectedContest)}
                      type="button"
                    >
                      {t('Записаться')}{' '}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </article>
        </>
      )}

      {registrationContest && (
        <ContestRegistrationDialog
          contest={registrationContest}
          onClose={() => setRegistrationContest(null)}
          onRegistered={setRegisteredId}
        />
      )}
      {(createOpen || editingContest) && (
        <AddContestDialog
          initial={editingContest}
          onClose={() => {
            setCreateOpen(false)
            setEditingContest(null)
          }}
          onSaved={(record) =>
            setLocalContestRecords((current) => [
              ...current.filter((item) => item.slug !== record.slug),
              record,
            ])
          }
        />
      )}
    </>
  )
}
