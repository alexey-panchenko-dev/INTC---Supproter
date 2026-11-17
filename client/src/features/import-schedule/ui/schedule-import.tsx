import { useEffect, useState, type FormEvent } from 'react'
import { ApiError, apiRequest } from '@/shared/api/client'
import { normalizeGroup } from '@/shared/lib/group'
import { prepareImage } from '../lib/prepare-image'
import { humanDate, isValidIsoDate, shortDate, studyWeeks, todayIso } from '../lib/weeks'
import {
  weekdays,
  weekOptions,
  type DraftLesson,
  type ImportResult,
  type ScheduleDraft,
  type Week,
} from '../model/types'

type Row = DraftLesson & { key: string }

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/
const input =
  'min-h-10 w-full rounded-lg border border-slate-200 bg-white p-2 text-sm focus:border-accent'

const weekStyle: Record<Week, string> = {
  every: 'border-slate-200',
  odd: 'border-slate-500 font-medium',
  even: 'border-red-400 text-red-700 font-medium',
}

function toRows(lessons: DraftLesson[]): Row[] {
  return lessons.map((lesson) => ({ ...lesson, key: crypto.randomUUID() }))
}

function emptyRow(kind: ScheduleDraft['kind'], previous?: Row): Row {
  return {
    key: crypto.randomUUID(),
    weekday: kind === 'weekly' ? (previous?.weekday ?? 1) : null,
    date: kind === 'dated' ? (previous?.date ?? todayIso()) : null,
    pair: null,
    starts_at: '',
    ends_at: '',
    subject: '',
    teacher: '',
    room: '',
    week: 'every',
    note: null,
  }
}

function validate(rows: Row[], kind: ScheduleDraft['kind']) {
  if (!rows.length) return 'Добавьте хотя бы одно занятие.'
  for (const [index, row] of rows.entries()) {
    const label = `Строка ${index + 1}${row.subject ? ` («${row.subject}»)` : ''}`
    if (!row.subject.trim()) return `${label}: укажите предмет.`
    if (!TIME.test(row.starts_at) || !TIME.test(row.ends_at))
      return `${label}: укажите время в формате ЧЧ:ММ.`
    if (row.starts_at >= row.ends_at)
      return `${label}: окончание должно быть позже начала.`
    if (kind === 'dated' && !row.date) return `${label}: укажите дату.`
  }
  return ''
}

export function ScheduleImport({
  ownGroup,
  isAdmin,
  onPublished,
  onCancel,
}: {
  /** Group of the signed-in student; students can publish only for it. */
  ownGroup: string | null
  isAdmin: boolean
  onPublished: (result: ImportResult) => void
  onCancel: () => void
}) {
  const [stage, setStage] = useState<'pick' | 'recognizing' | 'review'>('pick')
  const [preview, setPreview] = useState('')
  const [draft, setDraft] = useState<ScheduleDraft | null>(null)
  const [rows, setRows] = useState<Row[]>([])
  const [group, setGroup] = useState(ownGroup ?? '')
  const [startDate, setStartDate] = useState('')
  const [weeks, setWeeks] = useState(1)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [aiNotice, setAiNotice] = useState('')

  useEffect(() => () => URL.revokeObjectURL(preview), [preview])

  async function recognize(file: File) {
    setError('')
    setAiNotice('')
    setPreview(URL.createObjectURL(file))
    setStage('recognizing')
    try {
      const image = await prepareImage(file)
      const result = await apiRequest<ScheduleDraft>('schedule/recognize', {
        method: 'POST',
        body: JSON.stringify({ image }),
      })
      setDraft(result)
      setRows(toRows(result.lessons))
      if (isAdmin && result.group) setGroup(result.group)
      setWeeks(result.weeks_count ?? 1)
      setStartDate(result.start_date ?? '')
      setStage('review')
    } catch (reason) {
      if (reason instanceof ApiError && reason.status === 402) {
        setAiNotice(reason.message)
      } else {
        setError(reason instanceof Error ? reason.message : 'Не удалось распознать фото.')
      }
      setStage('pick')
    }
  }

  function update(key: string, changes: Partial<Row>) {
    setRows((previous) =>
      previous.map((row) => (row.key === key ? { ...row, ...changes } : row)),
    )
  }

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!draft) return
    const problem = validate(rows, draft.kind)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setBusy(true)
    const lessons = rows.map((row) => ({
      starts_at: row.starts_at,
      ends_at: row.ends_at,
      subject: row.subject.trim(),
      teacher: row.teacher.trim(),
      room: row.room.trim(),
      note: row.note?.trim() || null,
      ...(draft.kind === 'weekly'
        ? { weekday: row.weekday, pair: row.pair, week: row.week }
        : { date: row.date }),
    }))
    const body =
      draft.kind === 'weekly'
        ? { kind: 'weekly', group, start_date: startDate, weeks, lessons }
        : { kind: 'dated', group, lessons }
    try {
      const result = await apiRequest<ImportResult>('schedule/import', {
        method: 'POST',
        body: JSON.stringify(body),
      })
      onPublished(result)
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Не удалось опубликовать расписание.',
      )
      setBusy(false)
    }
  }

  const groupMismatch =
    !isAdmin &&
    draft?.group &&
    ownGroup &&
    normalizeGroup(draft.group) !== normalizeGroup(ownGroup)
  // Last study day of the table: 5 for a Mon–Fri schedule, 6 if there are Saturdays.
  const lastWeekday = rows.length ? Math.max(...rows.map((row) => row.weekday ?? 1)) : 5
  const weekList =
    draft?.kind === 'weekly' && isValidIsoDate(startDate) && weeks >= 1 && weeks <= 30
      ? studyWeeks(startDate, weeks, lastWeekday)
      : []
  const dates = rows.map((row) => row.date).filter(Boolean) as string[]
  const sortedDates = [...dates].sort()

  return (
    <section className="mb-8 rounded-xl border border-slate-200 bg-white p-5">
      <h2 className="font-bold">Загрузить фото расписания</h2>
      <p className="mt-2 text-sm text-muted">
        ИИ распознает таблицу на русском и казахском. Перед публикацией проверьте каждую
        строку — расписание увидит вся группа.
      </p>

      {stage !== 'review' && (
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <label className="inline-flex min-h-11 cursor-pointer items-center rounded-lg bg-accent px-5 text-sm text-white has-disabled:opacity-60">
            {stage === 'recognizing' ? 'Распознаём… (до минуты)' : 'Выбрать фото'}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="sr-only"
              disabled={stage === 'recognizing'}
              onChange={(event) => {
                const file = event.target.files?.[0]
                event.target.value = ''
                if (file) void recognize(file)
              }}
            />
          </label>
          <button type="button" onClick={onCancel} className="min-h-11 px-4 text-sm">
            Отмена
          </button>
        </div>
      )}

      {error && stage !== 'review' && (
        <p role="alert" className="mt-4 text-sm text-red-700">
          {error}
        </p>
      )}

      {aiNotice && stage !== 'review' && (
        <p
          role="status"
          className="mt-4 rounded-lg border border-sky-200 bg-sky-50 p-3 text-sm text-sky-800"
        >
          {aiNotice}
        </p>
      )}

      {stage === 'review' && draft && (
        <form onSubmit={publish} className="mt-5">
          <fieldset disabled={busy} className="grid gap-5">
            <p className="text-sm">
              <span className="font-medium">
                {draft.kind === 'weekly'
                  ? 'Недельное расписание'
                  : 'Расписание по датам (практика)'}
              </span>
              {draft.group && ` · группа на фото: ${draft.group}`}
              {draft.title && ` · ${draft.title}`}
            </p>

            {(draft.warnings.length > 0 || groupMismatch) && (
              <ul className="grid gap-1 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {groupMismatch && (
                  <li>
                    На фото группа {draft.group}, а ваша — {ownGroup}. Расписание
                    опубликуется для вашей группы — убедитесь, что фото правильное.
                  </li>
                )}
                {draft.warnings.map((warning) => (
                  <li key={warning}>⚠ {warning}</li>
                ))}
              </ul>
            )}

            <div className="flex flex-col gap-4 sm:flex-row sm:flex-wrap">
              <label className="grid gap-1 text-xs">
                Группа
                <input
                  className={input}
                  required
                  maxLength={50}
                  value={group}
                  readOnly={!isAdmin}
                  onChange={(event) => setGroup(event.target.value)}
                />
              </label>
              {draft.kind === 'weekly' && (
                <>
                  <label className="grid gap-1 text-xs">
                    С какого числа начинаются учебные недели
                    <input
                      className={input}
                      type="date"
                      required
                      value={startDate}
                      onChange={(event) => setStartDate(event.target.value)}
                    />
                  </label>
                  <label className="grid gap-1 text-xs">
                    Сколько учебных недель
                    {draft.weeks_count ? ` (на фото: ${draft.weeks_count})` : ''}
                    <input
                      className={input}
                      type="number"
                      min={1}
                      max={30}
                      required
                      value={weeks}
                      onChange={(event) => setWeeks(Number(event.target.value))}
                    />
                  </label>
                </>
              )}
            </div>

            {draft.kind === 'weekly' && !isValidIsoDate(startDate) && (
              <p className="text-sm text-amber-800">
                Укажите дату начала — например, если 6 учебных недель начинаются с 10
                октября, выберите 10.10. Если это суббота или воскресенье, первая неделя
                начнётся со следующего понедельника.
              </p>
            )}
            {draft.kind === 'weekly' && weekList.length > 0 && (
              <div className="grid gap-2 text-sm">
                <p className="text-muted">
                  Период: {humanDate(weekList[0].from)} — {humanDate(weekList.at(-1)!.to)}
                  . Расписание группы за этот период будет заменено.
                </p>
                <ol className="flex flex-wrap gap-2" aria-label="Учебные недели">
                  {weekList.map((week) => (
                    <li
                      key={week.number}
                      className={`rounded-lg border px-3 py-1.5 text-xs ${
                        week.red
                          ? 'border-red-300 bg-red-50 text-red-800'
                          : 'border-slate-300 bg-slate-50 text-ink'
                      }`}
                    >
                      <span className="font-semibold">{week.number}-я</span>{' '}
                      {shortDate(week.from)}–{shortDate(week.to)} ·{' '}
                      {week.red ? 'красная' : 'чёрная'}
                    </li>
                  ))}
                </ol>
              </div>
            )}
            {draft.kind === 'dated' && sortedDates.length > 0 && (
              <p className="text-sm text-muted">
                Будут заменены только эти даты ({new Set(dates).size}):{' '}
                {humanDate(sortedDates[0])} — {humanDate(sortedDates.at(-1)!)}. Остальные
                дни останутся по обычному расписанию.
              </p>
            )}

            {preview && (
              <details className="text-sm">
                <summary className="cursor-pointer text-accent">
                  Показать загруженное фото для сверки
                </summary>
                <img
                  src={preview}
                  alt="Загруженное расписание"
                  className="mt-3 max-h-[80vh] rounded-lg border border-slate-200"
                />
              </details>
            )}

            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="text-xs text-muted">
                  <tr>
                    <th className="p-1 font-medium">
                      {draft.kind === 'weekly' ? 'День' : 'Дата'}
                    </th>
                    <th className="p-1 font-medium">Начало</th>
                    <th className="p-1 font-medium">Конец</th>
                    <th className="p-1 font-medium">Предмет</th>
                    <th className="p-1 font-medium">Преподаватель</th>
                    <th className="p-1 font-medium">Ауд.</th>
                    {draft.kind === 'weekly' && (
                      <th className="p-1 font-medium">Недели</th>
                    )}
                    <th className="p-1 font-medium">Примечание</th>
                    <th className="p-1" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row, index) => (
                    <tr key={row.key} className="align-top">
                      <td className="w-28 p-1">
                        {draft.kind === 'weekly' ? (
                          <select
                            aria-label={`День, строка ${index + 1}`}
                            className={input}
                            value={row.weekday ?? 1}
                            onChange={(event) =>
                              update(row.key, { weekday: Number(event.target.value) })
                            }
                          >
                            {weekdays.map((day) => (
                              <option key={day.value} value={day.value}>
                                {day.label}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <input
                            aria-label={`Дата, строка ${index + 1}`}
                            className={`${input} w-36`}
                            type="date"
                            required
                            value={row.date ?? ''}
                            onChange={(event) =>
                              update(row.key, { date: event.target.value })
                            }
                          />
                        )}
                      </td>
                      {(['starts_at', 'ends_at'] as const).map((field) => (
                        <td key={field} className="w-28 p-1">
                          <input
                            aria-label={`${field === 'starts_at' ? 'Начало' : 'Конец'}, строка ${index + 1}`}
                            className={input}
                            type="time"
                            required
                            value={row[field]}
                            onChange={(event) =>
                              update(row.key, { [field]: event.target.value })
                            }
                          />
                        </td>
                      ))}
                      {(
                        [
                          ['subject', 'Предмет', 200],
                          ['teacher', 'Преподаватель', 200],
                          ['room', 'Аудитория', 50],
                        ] as const
                      ).map(([field, label, max]) => (
                        <td key={field} className={field === 'room' ? 'w-28 p-1' : 'p-1'}>
                          <input
                            aria-label={`${label}, строка ${index + 1}`}
                            className={input}
                            maxLength={max}
                            required={field === 'subject'}
                            value={row[field]}
                            onChange={(event) =>
                              update(row.key, { [field]: event.target.value })
                            }
                          />
                        </td>
                      ))}
                      {draft.kind === 'weekly' && (
                        <td className="w-44 p-1">
                          <select
                            aria-label={`Недели, строка ${index + 1}`}
                            className={`${input} ${weekStyle[row.week]}`}
                            value={row.week}
                            onChange={(event) =>
                              update(row.key, { week: event.target.value as Week })
                            }
                          >
                            {weekOptions.map((option) => (
                              <option key={option.value} value={option.value}>
                                {option.label}
                              </option>
                            ))}
                          </select>
                        </td>
                      )}
                      <td className="p-1">
                        <input
                          aria-label={`Примечание, строка ${index + 1}`}
                          className={input}
                          maxLength={200}
                          value={row.note ?? ''}
                          onChange={(event) =>
                            update(row.key, { note: event.target.value })
                          }
                        />
                      </td>
                      <td className="p-1">
                        <button
                          type="button"
                          aria-label={`Удалить строку ${index + 1}`}
                          onClick={() =>
                            setRows((previous) =>
                              previous.filter((item) => item.key !== row.key),
                            )
                          }
                          className="min-h-10 px-2 text-red-700"
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {error && (
              <p role="alert" className="text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                disabled={rows.length >= 300}
                onClick={() =>
                  setRows((previous) => [
                    ...previous,
                    emptyRow(draft.kind, previous.at(-1)),
                  ])
                }
                className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm"
              >
                Добавить строку
              </button>
              <button
                type="submit"
                className="min-h-11 rounded-lg bg-accent px-4 text-sm text-white"
              >
                {busy ? 'Публикация…' : `Опубликовать для ${group || 'группы'}`}
              </button>
              <button
                type="button"
                onClick={() => {
                  setStage('pick')
                  setDraft(null)
                  setError('')
                }}
                className="min-h-11 px-4 text-sm"
              >
                Другое фото
              </button>
              <button type="button" onClick={onCancel} className="min-h-11 px-4 text-sm">
                Отмена
              </button>
            </div>
          </fieldset>
        </form>
      )}
    </section>
  )
}
