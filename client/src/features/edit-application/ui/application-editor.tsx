import { useState, type FormEvent } from 'react'
import type { StudyApplication } from '@/entities/application'
import { apiRequest, ApiError } from '@/shared/api/client'
import { useI18n } from '@/shared/i18n'

type Draft = Omit<StudyApplication, 'id'>
const blank: Draft = {
  name: '',
  description: '',
  description_kk: '',
  url: '',
  logo_url: '',
  pricing: 'free',
}
const fields = [
  { name: 'name', label: 'Название', max: 200 },
  { name: 'url', label: 'Страница скачивания', max: 2000 },
  { name: 'logo_url', label: 'Ссылка на логотип', max: 2000 },
  { name: 'description', label: 'Описание · RU', max: 2000 },
  { name: 'description_kk', label: 'Описание · KZ', max: 2000 },
] as const

export function ApplicationEditor({
  application,
  onSaved,
  onCancel,
}: {
  application: StudyApplication | null
  onSaved: () => void
  onCancel: () => void
}) {
  const { t } = useI18n()
  const [draft, setDraft] = useState<Draft>(() =>
    application
      ? {
          name: application.name,
          description: application.description,
          description_kk: application.description_kk,
          url: application.url,
          logo_url: application.logo_url,
          pricing: application.pricing,
        }
      : { ...blank },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setBusy(true)
    setError('')
    try {
      await apiRequest(application ? `applications/${application.id}` : 'applications', {
        method: application ? 'PUT' : 'POST',
        body: JSON.stringify(draft),
      })
      onSaved()
    } catch (reason) {
      setError(
        reason instanceof ApiError && reason.status === 422
          ? 'Проверьте обязательные поля и ссылки.'
          : reason instanceof Error
            ? reason.message
            : 'Не удалось выполнить запрос. Попробуйте ещё раз.',
      )
    } finally {
      setBusy(false)
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mb-8 rounded-3xl border border-sky-200 bg-white p-5 shadow-sm sm:p-8"
      aria-labelledby="application-editor-heading"
    >
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h2 id="application-editor-heading" className="text-xl font-bold">
            {t(application ? 'Изменить приложение' : 'Добавить приложение')}
          </h2>
          <p className="mt-2 text-xs leading-6 text-muted">
            {t('Описание заполняется на русском и казахском.')}
          </p>
        </div>
        <button
          type="button"
          disabled={busy}
          onClick={onCancel}
          aria-label={t('Закрыть')}
          className="grid size-10 shrink-0 place-items-center rounded-full bg-slate-50 text-xl hover:bg-slate-100"
        >
          ×
        </button>
      </div>
      <fieldset disabled={busy} className="grid gap-4 disabled:opacity-60 sm:grid-cols-2">
        {fields.map((field, index) => (
          <label
            key={field.name}
            className={`grid gap-2 text-xs font-semibold ${field.name === 'name' ? 'sm:col-span-2' : ''}`}
          >
            {t(field.label)}
            {field.name.startsWith('description') ? (
              <textarea
                required
                rows={4}
                maxLength={field.max}
                lang={field.name.endsWith('_kk') ? 'kk' : 'ru'}
                value={draft[field.name]}
                onChange={(event) =>
                  setDraft({ ...draft, [field.name]: event.target.value })
                }
                className="w-full resize-y rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-sm font-normal"
              />
            ) : (
              <input
                autoFocus={index === 0}
                required
                type={field.name === 'url' ? 'url' : 'text'}
                maxLength={field.max}
                value={draft[field.name]}
                onChange={(event) =>
                  setDraft({ ...draft, [field.name]: event.target.value })
                }
                placeholder={
                  field.name === 'url'
                    ? 'https://…'
                    : field.name === 'logo_url'
                      ? 'https://… / /logos/…'
                      : undefined
                }
                className="min-h-11 w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 text-sm font-normal"
              />
            )}
          </label>
        ))}
        <label className="grid gap-2 text-xs font-semibold">
          {t('Стоимость')}
          <select
            value={draft.pricing}
            onChange={(event) =>
              setDraft({ ...draft, pricing: event.target.value as Draft['pricing'] })
            }
            className="min-h-11 rounded-xl border border-slate-200 bg-white px-3 text-sm font-normal"
          >
            <option value="free">{t('Бесплатно')}</option>
            <option value="freemium">{t('Бесплатно + платные функции')}</option>
            <option value="paid">{t('Платно')}</option>
          </select>
        </label>
        {error && (
          <p
            role="alert"
            className="rounded-xl bg-red-50 p-3 text-sm text-red-700 sm:col-span-2"
          >
            {t(error)}
          </p>
        )}
        <div className="flex flex-wrap gap-3 sm:col-span-2">
          <button
            type="submit"
            className="min-h-11 rounded-xl bg-ink px-6 text-sm text-white hover:bg-slate-700"
          >
            {t(busy ? 'Сохранение…' : 'Сохранить')}
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="min-h-11 rounded-xl border border-slate-200 px-6 text-sm"
          >
            {t('Отмена')}
          </button>
        </div>
      </fieldset>
    </form>
  )
}
