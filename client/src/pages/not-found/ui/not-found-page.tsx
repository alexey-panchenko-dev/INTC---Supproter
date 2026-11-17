import { useI18n } from '@/shared/i18n'
import { Link } from 'react-router-dom'
import { PageHeading } from '@/shared/ui/page-heading'

export function NotFoundPage() {
  const { t } = useI18n()

  return (
    <section className="min-h-[65vh] py-8">
      <PageHeading title={t('Страница не найдена')} />
      <Link className="text-accent underline" to="/">
        {t('На главную')}
      </Link>
    </section>
  )
}
