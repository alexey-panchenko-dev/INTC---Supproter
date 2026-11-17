import { messages } from './messages'

export type Language = 'ru' | 'kk'
export const storageKey = 'intc-language'

export function getLanguage(): Language {
  try {
    return localStorage.getItem(storageKey) === 'kk' ? 'kk' : 'ru'
  } catch {
    return 'ru'
  }
}

export function translate(text: string, language: Language): string {
  return language === 'kk' ? (messages[text] ?? text) : text
}
