import { useEffect, useState, type ReactNode } from 'react'
import { LanguageContext } from './context'
import { getLanguage, storageKey, translate, type Language } from './locale'

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguage] = useState<Language>(getLanguage)
  useEffect(() => {
    document.documentElement.lang = language
    document.title = translate('INTC Supporter — студентам', language)
    document
      .querySelector('meta[name="description"]')
      ?.setAttribute(
        'content',
        translate(
          'INTC Supporter — расписание, документы и инструменты для студентов колледжа.',
          language,
        ),
      )
    try {
      localStorage.setItem(storageKey, language)
    } catch {
      /* The switch still works when storage is disabled. */
    }
  }, [language])

  return (
    <LanguageContext.Provider
      value={{
        language,
        toggleLanguage: () => setLanguage((value) => (value === 'ru' ? 'kk' : 'ru')),
        t: (text) => translate(text, language),
      }}
    >
      {children}
    </LanguageContext.Provider>
  )
}
