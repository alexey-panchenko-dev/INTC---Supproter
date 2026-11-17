import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeading } from '@/shared/ui/page-heading'

export function ChatPage() {
  return (
    <section className="min-h-[65vh] py-8">
      <PageHeading title="ИИ-помощник" />
      <EmptyState>
        <span className="text-6xl text-accent" aria-hidden="true">
          ✧
        </span>
        <h2 className="my-4 text-2xl font-bold text-ink">Знакомимся с колледжем</h2>
        <p>
          ИИ-помощник пока не подключён. После загрузки документов он сможет искать ответы
          и показывать источники.
        </p>
        <p>Если ответа в документах нет, помощник сообщит об этом.</p>
      </EmptyState>
    </section>
  )
}
