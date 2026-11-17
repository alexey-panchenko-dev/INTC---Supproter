import type { StudyApplication } from '@/entities/application'
import { useApiQuery } from '@/shared/api/use-api-query'
import { safeLink } from '@/shared/lib/safe-link'
import { PageHeading } from '@/shared/ui/page-heading'
import { QueryState } from '@/shared/ui/query-state'

export function ApplicationsPage() {
  const { data, loading, error } = useApiQuery<StudyApplication[]>('applications')

  return (
    <section className="min-h-[65vh]">
      <PageHeading
        title="Приложения"
        description="Каталог инструментов для практических и теоретических занятий."
      />
      <QueryState
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyMessage="Каталог приложений пока пуст. Здесь появятся инструменты для учебных предметов."
      >
        <div className="grid gap-3 md:grid-cols-2">
          {data?.map((application) => (
            <article
              className="portal-card flex min-h-[212px] flex-col p-5 sm:p-6"
              key={application.id}
            >
              <span className="grid size-11 place-items-center rounded-xl bg-sky-50 text-sky-700" aria-hidden="true">
                <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="16" rx="2" /><path d="M7 8h10M7 12h6M7 16h4" /></svg>
              </span>
              <p className="mt-5 text-xs font-semibold text-sky-700">{application.subject}</p>
              <h2 className="mt-1 text-lg font-bold text-ink">{application.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted">{application.description}</p>
              <a
                className="portal-link mt-auto inline-flex items-center gap-2 pt-5 text-sm"
                href={safeLink(application.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Официальный сайт
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </QueryState>
    </section>
  )
}
