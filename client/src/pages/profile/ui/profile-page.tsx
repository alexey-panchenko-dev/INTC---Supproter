import { useState, type FormEvent } from 'react'
import { useAuth, type Session } from '@/entities/session'
import { apiRequest } from '@/shared/api/client'
import { useI18n } from '@/shared/i18n'
import { PageHeading } from '@/shared/ui/page-heading'

const inputClass =
  'min-h-11 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-ink outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100'

type ProfileForm = {
  firstName: string
  lastName: string
  email: string
  groupName: string
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

function formFromSession(session: Session): ProfileForm {
  return {
    firstName: session.first_name,
    lastName: session.last_name,
    email: session.email,
    groupName: session.group_name ?? '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  }
}

export function ProfilePage() {
  const { t } = useI18n()
  const { session, refresh } = useAuth()
  const [form, setForm] = useState<ProfileForm>(() =>
    session
      ? formFromSession(session)
      : {
          firstName: '',
          lastName: '',
          email: '',
          groupName: '',
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        },
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!session) return null
  const activeSession = session

  function update(field: keyof ProfileForm, value: string) {
    setForm((current) => ({ ...current, [field]: value }))
    setError('')
    setSuccess(false)
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.newPassword !== form.confirmPassword) {
      setError('Пароли не совпадают.')
      return
    }
    setBusy(true)
    setError('')
    setSuccess(false)
    try {
      const updated = await apiRequest<Session>('auth/me', {
        method: 'PUT',
        body: JSON.stringify({
          first_name: form.firstName.trim(),
          last_name: form.lastName.trim(),
          email: form.email.trim(),
          group_name: activeSession.role === 'student' ? form.groupName.trim() : null,
          current_password: form.currentPassword || null,
          new_password: form.newPassword || null,
        }),
      })
      setForm(formFromSession(updated))
      await refresh()
      setSuccess(true)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Не удалось сохранить профиль.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="pb-10">
      <PageHeading
        title={t('Личный кабинет')}
        description={t('Измените личные данные и пароль своего аккаунта.')}
      />
      <form
        onSubmit={submit}
        className="grid gap-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7 lg:grid-cols-[minmax(0,1fr)_280px]"
      >
        <fieldset disabled={busy} className="grid gap-4 disabled:opacity-60">
          <legend className="sr-only">{t('Данные профиля')}</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              {t('Имя')}
              <input
                value={form.firstName}
                onChange={(event) => update('firstName', event.target.value)}
                autoComplete="given-name"
                required
                maxLength={100}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              {t('Фамилия')}
              <input
                value={form.lastName}
                onChange={(event) => update('lastName', event.target.value)}
                autoComplete="family-name"
                required
                maxLength={100}
                className={inputClass}
              />
            </label>
          </div>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            {t('Почта')}
            <input
              value={form.email}
              onChange={(event) => update('email', event.target.value)}
              type="email"
              autoComplete="email"
              required
              maxLength={254}
              className={inputClass}
            />
          </label>
          {activeSession.role === 'student' && (
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              {t('Группа')}
              <input
                value={form.groupName}
                onChange={(event) => update('groupName', event.target.value)}
                required
                maxLength={50}
                className={inputClass}
              />
            </label>
          )}
          <div className="mt-2 border-t border-slate-100 pt-5">
            <h2 className="text-base font-bold text-ink">{t('Сменить пароль')}</h2>
            <p className="mt-1 text-xs leading-5 text-muted">
              {t('Оставьте поля пустыми, если не хотите менять пароль.')}
            </p>
          </div>
          <label className="grid gap-1.5 text-sm font-semibold text-ink">
            {t('Текущий пароль')}
            <input
              value={form.currentPassword}
              onChange={(event) => update('currentPassword', event.target.value)}
              type="password"
              autoComplete="current-password"
              maxLength={128}
              className={inputClass}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              {t('Новый пароль')}
              <input
                value={form.newPassword}
                onChange={(event) => update('newPassword', event.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={form.newPassword ? 8 : undefined}
                maxLength={128}
                className={inputClass}
              />
            </label>
            <label className="grid gap-1.5 text-sm font-semibold text-ink">
              {t('Повтори пароль')}
              <input
                value={form.confirmPassword}
                onChange={(event) => update('confirmPassword', event.target.value)}
                type="password"
                autoComplete="new-password"
                minLength={form.confirmPassword ? 8 : undefined}
                maxLength={128}
                className={inputClass}
              />
            </label>
          </div>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {t(error)}
            </p>
          )}
          {success && (
            <p role="status" className="rounded-xl bg-emerald-50 p-3 text-sm text-emerald-800">
              {t('Профиль сохранён.')}
            </p>
          )}
          <button
            disabled={busy}
            className="min-h-11 justify-self-start rounded-xl bg-sky-600 px-6 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? t('Сохранение…') : t('Сохранить изменения')}
          </button>
        </fieldset>
        <aside className="rounded-2xl bg-sky-50 p-5 lg:self-start">
          <p className="text-[10px] font-extrabold tracking-[0.16em] text-sky-700">
            {t('РОЛЬ В СИСТЕМЕ')}
          </p>
          <p className="mt-2 text-lg font-bold text-ink">
            {activeSession.role === 'admin' ? t('Администратор') : t('Студент')}
          </p>
          <p className="mt-2 text-xs leading-5 text-muted">
            {t('Роль назначается системой и не изменяется в личном кабинете.')}
          </p>
        </aside>
      </form>
    </section>
  )
}
