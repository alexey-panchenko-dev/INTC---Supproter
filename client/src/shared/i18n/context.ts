import { createContext, useContext } from 'react'
import type { Language } from './locale'

export const LanguageContext = createContext({
  language: 'ru' as Language,
  toggleLanguage: () => {},
  t: (text: string) => text,
})

export function useI18n() {
  return useContext(LanguageContext)
}
