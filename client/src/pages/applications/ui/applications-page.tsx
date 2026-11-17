import type { StudyApplication } from '@/entities/application'
import { useApiQuery } from '@/shared/api/use-api-query'
import { safeLink } from '@/shared/lib/safe-link'
import { PageHeading } from '@/shared/ui/page-heading'
import { QueryState } from '@/shared/ui/query-state'

export function ApplicationsPage() {
  const { data, loading, error } = useApiQuery<StudyApplication[]>('applications')

  return (
    <section className="min-h-[65vh] py-8">
      <PageHeading
        title="Приложения"
        description="Инструменты для практики и теоретических пар."
      />
      <QueryState
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyMessage="Каталог приложений пока пуст. Здесь будут инструменты для твоих предметов."
      >
        {data?.map((application) => (
          <article
            className="rounded-xl border border-slate-200 bg-white p-6"
            key={application.id}
          >
            <p className="text-xs text-accent">{application.subject}</p>
            <h2 className="my-3 font-bold">{application.name}</h2>
            <p className="mb-4 text-sm text-muted">{application.description}</p>
            <a
              className="text-sm text-sky-700"
              href={safeLink(application.url)}
              target="_blank"
              rel="noopener noreferrer"
            >
              Официальный сайт ↗
            </a>
          </article>
        ))}
      </QueryState>
    </section>
  )
}
