import { useI18n } from '@/shared/i18n'
import { useState, type FormEvent } from 'react'
import type { Lesson } from '@/entities/lesson'
import { apiRequest } from '@/shared/api/client'

type Draft = Omit<Lesson, 'id' | 'group_name' | 'date'> & { key: string }

const fields = [
  { name: 'starts_at', label: 'Начало', type: 'time', max: 5 },
  { name: 'ends_at', label: 'Конец', type: 'time', max: 5 },
  { name: 'subject', label: 'Предмет', type: 'text', max: 200 },
  { name: 'teacher', label: 'Преподаватель', type: 'text', max: 200 },
  { name: 'room', label: 'Аудитория', type: 'text', max: 50 },
] as const

function emptyRow(): Draft {
  return {
    key: crypto.randomUUID(),
    starts_at: '',
    ends_at: '',
    subject: '',
    teacher: '',
    room: '',
    note: null,
  }
}

export function ScheduleEditor({
  lessons,
  path,
  onPublished,
  onCancel,
}: {
  lessons: Lesson[]
  path: string
  onPublished: () => void
  onCancel: () => void
}) {
  const { t } = useI18n()

  const [rows, setRows] = useState<Draft[]>(() =>
    lessons.length
      ? lessons.map((lesson) => ({ ...lesson, key: crypto.randomUUID() }))
      : [emptyRow()],
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function publish(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    const ordered = [...rows].sort((a, b) => a.starts_at.localeCompare(b.starts_at))
    for (let index = 0; index < ordered.length; index++) {
      const row = ordered[index]
      if (row.starts_at >= row.ends_at) {
        setError('Окончание каждой пары должно быть позже начала.')
        return
      }
      if (index > 0 && ordered[index - 1].ends_at > row.starts_at) {
        setError('Время пар пересекается. Проверьте начало и окончание.')
        return
      }
    }
    setBusy(true)
    try {
      await apiRequest(path, {
        method: 'PUT',
        body: JSON.stringify({
          lessons: rows.map((row) => ({
            starts_at: row.starts_at,
            ends_at: row.ends_at,
            subject: row.subject.trim(),
            teacher: row.teacher.trim(),
            room: row.room.trim(),
            note: row.note,
          })),
        }),
      })
      onPublished()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Не удалось сохранить расписание.',
      )
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={publish}
      className="mb-8 rounded-xl border border-slate-200 bg-white p-5"
    >
      <h2 className="font-bold">{t('Ручное заполнение расписания')}</h2>
      <p className="mt-2 mb-5 text-sm text-muted">
        {t(
          'Публикация заменит расписание выбранной группы на выбранную дату. Чтобы оставить день без занятий, удалите все строки и опубликуйте.',
        )}
      </p>
      <fieldset disabled={busy}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead>
              <tr>
                {fields.map((field) => (
                  <th key={field.name} scope="col" className="p-2 font-medium">
                    {t(field.label)}
                  </th>
                ))}
                <th scope="col" className="p-2">
                  {t('Действие')}
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={row.key}>
                  {fields.map((field) => (
                    <td key={field.name} className="p-2">
                      <input
                        aria-label={`${t(field.label)}, ${t('строка')} ${index + 1}`}
                        type={field.type}
                        required={field.name !== 'room'}
                        maxLength={field.max}
                        value={row[field.name]}
                        onChange={(event) =>
                          setRows((previous) =>
                            previous.map((item) =>
                              item.key === row.key
                                ? { ...item, [field.name]: event.target.value }
                                : item,
                            ),
                          )
                        }
                        className="min-h-11 w-full rounded-lg border border-slate-200 p-2 focus:border-accent"
                      />
                    </td>
                  ))}
                  <td className="p-2">
                    <button
                      type="button"
                      aria-label={`${t('Удалить строку')} ${index + 1}`}
                      onClick={() =>
                        setRows((previous) =>
                          previous.filter((item) => item.key !== row.key),
                        )
                      }
                      className="min-h-11 px-3 text-red-700"
                    >
                      {t('Удалить')}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length === 0 && <p className="py-4 text-sm">{t('Занятий нет.')}</p>}
        {error && (
          <p role="alert" className="mt-4 text-sm text-red-700">
            {t(error)}
          </p>
        )}
        <div className="mt-5 flex flex-wrap gap-3">
          <button
            type="button"
            disabled={rows.length >= 100}
            onClick={() => setRows((previous) => [...previous, emptyRow()])}
            className="min-h-11 rounded-lg border border-slate-200 px-4 text-sm"
          >
            {t('Добавить пару')}
          </button>
          <button
            type="submit"
            className="min-h-11 rounded-lg bg-accent px-4 text-sm text-white"
          >
            {busy ? t('Публикация…') : t('Опубликовать расписание дня')}
          </button>
          <button type="button" onClick={onCancel} className="min-h-11 px-4 text-sm">
            {t('Отмена')}
          </button>
        </div>
      </fieldset>
    </form>
  )
}
