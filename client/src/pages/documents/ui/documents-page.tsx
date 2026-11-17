import { useI18n } from '@/shared/i18n'
import type { CollegeDocument } from '@/entities/document'
import { useApiQuery } from '@/shared/api/use-api-query'
import { safeLink } from '@/shared/lib/safe-link'
import { PageHeading } from '@/shared/ui/page-heading'
import { QueryState } from '@/shared/ui/query-state'

export function DocumentsPage() {
  const { t } = useI18n()

  const { data, loading, error } = useApiQuery<CollegeDocument[]>('documents')

  return (
    <section className="min-h-[65vh] py-8">
      <PageHeading
        title={t('Жизнь колледжа')}
        description={t('Официальные документы и полезная информация.')}
      />
      <QueryState
        loading={loading}
        error={t(error)}
        empty={!data?.length}
        emptyMessage={t('Документы и информация о колледже скоро появятся здесь.')}
      >
        {data?.map((document) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-6"
            key={document.id}
          >
            <p className="text-xs text-accent">{document.category}</p>
            <h2 className="my-3 font-bold">{document.title}</h2>
            <a
              className="text-sm text-sky-700"
              href={safeLink(document.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t('Открыть документ ↗')}
            </a>
          </article>
        ))}
      </QueryState>
    </section>
  )
}
