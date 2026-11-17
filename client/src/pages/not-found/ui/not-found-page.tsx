import { Link } from 'react-router-dom'
import { PageHeading } from '@/shared/ui/page-heading'

export function NotFoundPage() {
  return (
    <section className="min-h-[65vh] py-8">
      <PageHeading title="Страница не найдена" />
      <Link className="text-accent underline" to="/">
        На главную
      </Link>
    </section>
  )
}
