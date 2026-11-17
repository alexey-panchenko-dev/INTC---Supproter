import { useI18n } from './context'

export function LanguageSwitch() {
  const { language, toggleLanguage } = useI18n()
  return (
    <button
      type="button"
      onClick={toggleLanguage}
      aria-label={language === 'ru' ? 'Қазақ тіліне ауыстыру' : 'Переключить на русский'}
      title={language === 'ru' ? 'Қазақ тіліне ауыстыру' : 'Переключить на русский'}
      className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-ink transition hover:border-sky-300 hover:bg-sky-50"
    >
      <span aria-hidden="true">◎</span>
      <span>{language === 'ru' ? 'RU' : 'KZ'}</span>
      <span aria-hidden="true" className="text-slate-400">
        ⇄
      </span>
    </button>
  )
}
