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
  'w-full rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none transition focus:border-accent focus:ring-2 focus:ring-sky-100'

export function AuthPage() {
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
        await login(email, password)
        navigate(destination, { replace: true })
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
        Проверяем аккаунт…
      </p>
    )
  if (session) return <Navigate to={destination} replace />

  return (
    <section className="grid min-h-[70vh] items-start gap-10 py-8 lg:grid-cols-2 lg:py-14">
      <div className="rounded-3xl bg-sky-100 p-8 lg:p-10">
        <p className="text-xs font-semibold tracking-widest text-accent">
          INTC / STUDENT SUPPORTER
        </p>
        <h1 className="mt-8 text-4xl leading-tight font-bold text-ink">
          Твой колледж.
          <br />
          <span className="text-accent">Твой аккаунт.</span>
        </h1>
        <p className="mt-6 max-w-sm leading-7 text-muted">
          Войди, чтобы открыть расписание, документы и инструменты для учёбы.
        </p>
        <Link
          to="/"
          className="mt-8 inline-block text-sm font-medium text-ink hover:underline"
        >
          ← На главную
        </Link>
      </div>
      <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
        <nav className="mb-7 flex rounded-xl bg-slate-50 p-1" aria-label="Авторизация">
          {[
            ['login', 'Вход'],
            ['register', 'Регистрация'],
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
          {register ? 'Создать аккаунт' : 'С возвращением'}
        </h2>
        <p className="mt-2 mb-6 text-sm text-muted">
          {register
            ? 'Заполни данные студента и укажи свою группу.'
            : 'Введи почту и пароль своего аккаунта.'}
        </p>
        {success && (
          <p className="mb-5 rounded-xl bg-sky-50 p-4 text-sm text-ink" role="status">
            Аккаунт создан. Войдите с указанной почтой и паролем.
          </p>
        )}
        <form key={location.search} onSubmit={submit} className="grid gap-4">
          <fieldset disabled={busy} className="grid gap-4 disabled:opacity-60">
            <legend className="sr-only">
              {register ? 'Регистрация студента' : 'Вход в аккаунт'}
            </legend>
            {register && (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="grid gap-2 text-sm">
                    Фамилия
                    <input
                      name="last_name"
                      autoComplete="family-name"
                      required
                      maxLength={100}
                      className={inputClass}
                    />
                  </label>
                  <label className="grid gap-2 text-sm">
                    Имя
                    <input
                      name="first_name"
                      autoComplete="given-name"
                      required
                      maxLength={100}
                      className={inputClass}
                    />
                  </label>
                </div>
                <label className="grid gap-2 text-sm">
                  Группа
                  <input
                    name="group_name"
                    required
                    maxLength={50}
                    placeholder="Например, ИС-23-1"
                    className={inputClass}
                  />
                </label>
              </>
            )}
            <label className="grid gap-2 text-sm">
              Почта
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
            <label className="grid gap-2 text-sm">
              Пароль
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
                  От 8 до 128 символов.
                </p>
                <label className="grid gap-2 text-sm">
                  Повтори пароль
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
              {error}
            </p>
          )}
          <button
            disabled={busy}
            className="mt-2 rounded-xl bg-ink px-5 py-3.5 text-sm font-semibold text-white hover:bg-slate-700 disabled:cursor-wait disabled:opacity-60"
          >
            {busy ? 'Подождите…' : register ? 'Зарегистрироваться' : 'Войти'}
          </button>
        </form>
      </div>
    </section>
  )
}
