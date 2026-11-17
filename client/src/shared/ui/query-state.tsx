import { useI18n } from '@/shared/i18n'
import type { ReactNode } from 'react'
import { EmptyState } from './empty-state'

type QueryStateProps = {
  loading: boolean
  error: string
  empty: boolean
  emptyMessage: string
  children: ReactNode
}

export function QueryState({
  loading,
  error,
  empty,
  emptyMessage,
  children,
}: QueryStateProps) {
  const { t } = useI18n()

  if (loading) return <p role="status">{t('Загружаем…')}</p>
  if (error)
    return (
      <p role="alert" className="rounded-xl bg-red-50 p-5 text-red-800">
        {t(error)}
      </p>
    )
  if (empty) return <EmptyState>{emptyMessage}</EmptyState>
  return <div className="grid min-w-0 grid-cols-1 gap-3">{children}</div>
}
