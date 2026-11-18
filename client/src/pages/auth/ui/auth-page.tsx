import { LanguageSwitch, useI18n } from '@/shared/i18n'
import { useState, type FormEvent } from 'react'
import {
  Link,
  Navigate,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router-dom'
import { useAuth } from '@/entities/session'
import { apiRequest } from '@/shared/api/client'

const inputClass =
  'h-11 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm outline-none transition placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-sky-100'

export function AuthPage() {
  const { t } = useI18n()

  const [params] = useSearchParams()
  const register = params.get('mode') === 'register'
  const { session, loading, login } = useAuth()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const requestedPath = params.get('next')
  const destination =
    requestedPath?.startsWith('/') &&
    !requestedPath.startsWith('//') &&
    requestedPath.split('?')[0] !== '/auth'
      ? requestedPath
      : '/schedule'
  const next = params.get('next')
    ? `&next=${encodeURIComponent(params.get('next')!)}`
    : ''

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email')).trim()
    const password = String(form.get('password'))
    setError('')
    setSuccess(false)
    if (register && password !== form.get('confirm_password')) {
      setError('Пароли не совпадают.')
      return
    }
    setBusy(true)
    try {
      if (register) {
        await apiRequest('auth/register', {
          method: 'POST',
          body: JSON.stringify({
            email,
            password,
            first_name: String(form.get('first_name')).trim(),
            last_name: String(form.get('last_name')).trim(),
            group_name: String(form.get('group_name')).trim(),
          }),
        })
        setSuccess(true)
        navigate(`/auth?mode=login${next}`, { replace: true })
      } else {
        const user = await login(email, password)
        navigate(user.status === 'approved' ? destination : '/', { replace: true })
      }
    } catch (cause) {
      setError(
        cause instanceof Error ? cause.message : 'Не удалось связаться с сервером.',
      )
    } finally {
      setBusy(false)
    }
  }

  if (loading)
    return (
      <p className="py-16 text-muted" role="status">
        {t('Проверяем аккаунт…')}
      </p>
    )
  if (session)
    return <Navigate to={session.status === 'approved' ? destination : '/'} replace />

  return (
    <section className="mx-auto grid min-h-dvh w-full max-w-[1240px] items-center gap-4 p-4 sm:gap-6 sm:p-6 lg:grid-cols-[minmax(0,0.95fr)_minmax(480px,1fr)] lg:gap-8 lg:p-8">
      <div className="relative flex min-h-0 flex-col overflow-hidden rounded-[28px] bg-sky-100 px-5 py-5 sm:px-8 sm:py-7 lg:min-h-[min(780px,calc(100dvh-64px))] lg:px-10 lg:py-9">
        <p className="mt-1 text-[10px] font-bold tracking-[0.18em] text-accent lg:mt-auto">
          INTC / STUDENT SUPPORTER
        </p>
        <h1 className="mt-3 text-[clamp(1.65rem,4vw,3.1rem)] leading-[1.08] font-extrabold tracking-tight text-ink">
          {t('Твой колледж.')}
          <br />
          <span className="text-accent">{t('Твой аккаунт.')}</span>
        </h1>
        <p className="mt-3 max-w-md text-sm leading-6 text-muted sm:text-base sm:leading-7">
          {t('Войди, чтобы открыть расписание, документы и инструменты для учёбы.')}
        </p>
        <Link
          to="/"
          className="mt-4 inline-flex text-sm font-semibold text-ink hover:text-accent lg:mt-7"
        >
          {t('← На главную')}
        </Link>
      </div>
      <div className="w-full max-w-[560px] rounded-[26px] border border-slate-200 bg-white p-5 shadow-[0_18px_60px_-40px_rgba(24,43,61,0.28)] sm:p-7 lg:p-8">
        <div className="mb-4 flex justify-end">
          <LanguageSwitch />
        </div>
        <nav
          className="mb-5 flex rounded-xl bg-slate-100 p-1"
          aria-label={t('Авторизация')}
        >
          {[
            ['login', t('Вход')],
            ['register', t('Регистрация')],
          ].map(([mode, label]) => (
            <Link
              key={mode}
              aria-current={(mode === 'register') === register ? 'page' : undefined}
              className={`flex-1 rounded-lg px-4 py-3 text-center text-sm font-semibold ${(mode === 'register') === register ? 'bg-ink text-white' : 'text-muted hover:text-ink'}`}
              to={`/auth?mode=${mode}${next}`}
              onClick={() => {
                setError('')
                setSuccess(false)
              }}
            >
              {label}
            </Link>
          ))}
        </nav>
        <h2 className="text-2xl font-bold text-ink">
          {register ? t('Создать аккаунт') : t('С возвращением')}
        </h2>
        <p className="mt-1.5 mb-4 text-sm leading-5 text-muted">
          {register
            ? t('Заполни данные студента и укажи свою группу.')
            : t('Введи почту и пароль своего аккаунта.')}
        </p>
        {success && (
          <p className="mb-5 rounded-xl bg-sky-50 p-4 text-sm text-ink" role="status">
            {t('Аккаунт создан. Войдите с указанной почтой и паролем.')}
          </p>
        )}
        <form key={location.search} onSubmit={submit} className="grid gap-3">
          <fieldset disabled={busy} className="grid gap-3 disabled:opacity-60">
            <legend className="sr-only">
              {register ? t('Регистрация студента') : t('Вход в аккаунт')}
            </legend>
            {register && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <label className="grid gap-1.5 text-xs font-semibold text-ink sm:text-sm">
                    {t('Фамилия')}
                    <input
                      name="last_name"
                      autoComplete="family-name"
                      required
                      maxLength={100}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-1.5 text-xs font-semibold text-ink sm:text-sm">
                    {t('Имя')}
                    <input
                      name="first_name"
                      autoComplete="given-name"
                      required
                      maxLength={100}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="grid gap-1.5 text-xs font-semibold text-ink sm:text-sm">
                  {t('Группа')}
                  <input
                    name="group_name"
                    required
                    maxLength={50}
                    placeholder={t('Например, ИС-23-1')}
                    className={inputClass}
                  />
                </label>
              </>
            )}
            <label className="grid gap-1.5 text-xs font-semibold text-ink sm:text-sm">
              {t('Почта')}
              <input
                name="email"
                type="email"
                autoComplete="username"
                required
                maxLength={254}
                className={inputClass}
                placeholder="student@example.com"
              />
            </label>
            <label className="grid gap-1.5 text-xs font-semibold text-ink sm:text-sm">
              {t('Пароль')}
              <input
                name="password"
                type="password"
                autoComplete={register ? 'new-password' : 'current-password'}
                required
                minLength={register ? 8 : 1}
                maxLength={128}
                className={inputClass}
                aria-describedby={register ? 'password-hint' : undefined}
              />
            </label>
            {register && (
              <>
                <p id="password-hint" className="-mt-2 text-xs text-muted">
                  {t('От 8 до 128 символов.')}
                </p>
                <label className="grid gap-1.5 text-xs font-semibold text-ink sm:text-sm">
                  {t('Повтори пароль')}
                  <input
                    name="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    required
                    minLength={8}
                    maxLength={128}
                    className={inputClass}
                  />
                </label>
              </>
            )}
          </fieldset>
          {error && (
            <p role="alert" className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
              {t(error)}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-1 min-h-11 rounded-xl bg-ink px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? t('Подождите…') : register ? t('Зарегистрироваться') : t('Войти')}
          </button>
        </form>
      </div>
    </section>
  )
}
