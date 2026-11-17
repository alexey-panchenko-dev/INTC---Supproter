import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeading } from '@/shared/ui/page-heading'

export function ChatPage() {
  return (
    <section className="min-h-[65vh]">
      <PageHeading
        title="ИИ-помощник"
        description="Ответы на основе документов колледжа."
      />
      <div className="portal-card mx-auto my-6 flex min-h-[390px] max-w-3xl flex-col items-center justify-center px-6 py-10 text-center sm:px-10">
        <span className="grid size-14 place-items-center rounded-2xl bg-sky-50 text-sky-700" aria-hidden="true">
          <svg className="size-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3 14 9l6 2-6 2-2 6-2-6-6-2 6-2z" /><path d="m19 16 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8z" /></svg>
        </span>
        <h2 className="mt-5 text-xl font-bold text-ink">ИИ-помощник пока не подключён</h2>
        <p className="mt-2 max-w-lg text-sm leading-6 text-muted">
          Когда сервис будет доступен, помощник сможет искать ответы в документах колледжа и показывать источники.
        </p>
        <div className="mt-6 rounded-xl border border-sky-100 bg-sky-50 px-4 py-3 text-left text-sm leading-6 text-sky-900">
          Если в доступных материалах не окажется нужных сведений, помощник сообщит об этом.
        </div>
      </div>
    </section>
  )
}
