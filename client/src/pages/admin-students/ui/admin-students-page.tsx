import { useState } from 'react'
import { apiRequest } from '@/shared/api/client'
import { useApiQuery } from '@/shared/api/use-api-query'
import { useI18n } from '@/shared/i18n'
import { QueryState } from '@/shared/ui/query-state'

type Student = {
  id: number
  first_name: string
  last_name: string
  email: string
  group_name: string
  role: 'student'
  status: 'pending' | 'approved' | 'blocked'
}

export function AdminStudentsPage() {
  const { t } = useI18n()
  const [revision, setRevision] = useState(0)
  const [updatingId, setUpdatingId] = useState<number | null>(null)
  const [mutationError, setMutationError] = useState('')
  const [notice, setNotice] = useState('')
  const { data, loading, error } = useApiQuery<Student[]>('admin/students', revision)

  async function setStatus(student: Student, status: 'approved' | 'blocked') {
    setUpdatingId(student.id)
    setMutationError('')
    setNotice('')
    try {
      await apiRequest<Student>(`admin/students/${student.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      })
      setRevision((value) => value + 1)
      setNotice(
        status === 'approved'
          ? 'Доступ студента подтверждён.'
          : 'Доступ студента заблокирован.',
      )
    } catch (reason) {
      setMutationError(
        reason instanceof Error
          ? reason.message
          : 'Не удалось выполнить запрос. Попробуйте ещё раз.',
      )
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <section className="min-h-[65vh] pb-12">
      <div className="mb-8 rounded-3xl border border-sky-100 bg-sky-50 px-6 py-8 sm:px-8 sm:py-10">
        <p className="mb-4 text-[9px] font-extrabold tracking-[0.18em] text-accent">
          INTC / ADMIN
        </p>
        <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">
          {t('Проверка студентов')}
        </h1>
        <p className="mt-4 max-w-2xl text-sm leading-6 text-muted">
          {t(
            'Сверьте данные студента с внутренней базой колледжа, затем подтвердите или заблокируйте его доступ.',
          )}
        </p>
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

      <QueryState
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyMessage={t('Студенты пока не зарегистрированы.')}
      >
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {data?.map((student) => {
            const busy = updatingId === student.id
            return (
              <article
                key={student.id}
                className="flex min-h-48 flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <h2 className="text-lg font-bold text-ink">
                      {student.first_name} {student.last_name}
                    </h2>
                    <p className="mt-2 text-sm font-semibold text-sky-700">
                      {t('Группа')}: {student.group_name}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-[10px] font-bold ${
                      student.status === 'blocked'
                        ? 'bg-red-50 text-red-700'
                        : student.status === 'approved'
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {t(
                      student.status === 'blocked'
                        ? 'Заблокирован'
                        : student.status === 'approved'
                          ? 'Подтверждён'
                          : 'Ожидает проверки',
                    )}
                  </span>
                </div>
                <p className="mt-3 text-xs break-all text-muted">{student.email}</p>
                <div className="mt-auto flex justify-end gap-3 pt-6">
                  <button
                    type="button"
                    disabled={busy || student.status === 'approved'}
                    onClick={() => void setStatus(student, 'approved')}
                    className="grid size-11 place-items-center rounded-xl border border-emerald-200 bg-emerald-50 text-xl font-bold text-emerald-700 transition hover:bg-emerald-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t('Подтвердить доступ')}
                    title={t('Подтвердить доступ')}
                  >
                    ✓
                  </button>
                  <button
                    type="button"
                    disabled={busy || student.status === 'blocked'}
                    onClick={() => void setStatus(student, 'blocked')}
                    className="grid size-11 place-items-center rounded-xl border border-red-200 bg-red-50 text-xl font-bold text-red-700 transition hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label={t('Заблокировать доступ')}
                    title={t('Заблокировать доступ')}
                  >
                    ×
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      </QueryState>
    </section>
  )
}
