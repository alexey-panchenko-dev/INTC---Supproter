import type { CollegeDocument } from '@/entities/document'
import { useApiQuery } from '@/shared/api/use-api-query'
import { safeLink } from '@/shared/lib/safe-link'
import { PageHeading } from '@/shared/ui/page-heading'
import { QueryState } from '@/shared/ui/query-state'

export function DocumentsPage() {
  const { data, loading, error } = useApiQuery<CollegeDocument[]>('documents')

  return (
    <section className="min-h-[65vh]">
      <PageHeading
        title="Жизнь колледжа"
        description="Документы и информация, доступные в портале."
      />
      <QueryState
        loading={loading}
        error={error}
        empty={!data?.length}
        emptyMessage="Документы и информация о колледже скоро появятся здесь."
      >
        <div className="grid gap-3">
          {data?.map((document) => (
            <article
              className="portal-card flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5"
              key={document.id}
            >
              <div className="flex min-w-0 items-start gap-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-700" aria-hidden="true">
                  <svg className="size-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h8l4 4v14H6z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg>
                </span>
                <div className="min-w-0">
                  <p className="text-xs font-semibold text-sky-700">{document.category}</p>
                  <h2 className="mt-1 text-base leading-6 font-bold text-ink">{document.title}</h2>
                </div>
              </div>
              <a
                className="portal-link inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 px-4 text-sm"
                href={safeLink(document.url)}
                target="_blank"
                rel="noopener noreferrer"
              >
                Открыть документ
                <span aria-hidden="true">↗</span>
              </a>
            </article>
          ))}
        </div>
      </QueryState>
    </section>
  )
}
