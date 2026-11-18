import { useI18n } from '@/shared/i18n'
import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeading } from '@/shared/ui/page-heading'
import { streamChat } from '../api/stream-chat'

type Message = { role: 'user' | 'ai'; text: string }

export function ChatPage() {
  const { t, language } = useI18n()

  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  }, [messages])

  async function send() {
    const question = input.trim()
    if (!question || busy) return

    setInput('')
    setBusy(true)
    setMessages((prev) => [
      ...prev,
      { role: 'user', text: question },
      { role: 'ai', text: '' },
    ])

    const controller = new AbortController()
    controllerRef.current = controller

    const append = (chunk: string) =>
      setMessages((prev) => {
        const next = [...prev]
        const last = next[next.length - 1]
        next[next.length - 1] = { ...last, text: last.text + chunk }
        return next
      })

    try {
      await streamChat(question, append, controller.signal, language)
    } catch (reason) {
      if (!controller.signal.aborted) {
        append(t(reason instanceof Error ? reason.message : 'Ошибка'))
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="flex min-h-[calc(100dvh-7rem)] flex-col pb-4">
      <PageHeading
        title={t('ИИ-помощник')}
        description={t('Ответы на основе документов колледжа.')}
      />
      {messages.length === 0 ? (
        <div className="flex flex-1 items-center justify-center pb-6">
          <div className="w-full max-w-3xl">
            <EmptyState>
              <h2 className="my-4 text-2xl font-bold text-ink">
                {t('Знакомимся с колледжем')}
              </h2>
              <p>{t('Задайте вопрос о колледже, ответ будет найден в документах.')}</p>
            </EmptyState>
          </div>
        </div>
      ) : (
        <div className="mb-5 flex flex-1 flex-col gap-3 pb-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`max-w-[min(760px,88%)] rounded-2xl px-4 py-3 text-sm leading-6 shadow-sm ${
                message.role === 'user'
                  ? 'self-end bg-ink font-medium text-white'
                  : 'self-start border border-sky-300 bg-sky-50 text-ink'
              }`}
            >
              {message.text || '…'}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      )}
      <div className="sticky bottom-0 z-20 -mx-2 mt-auto border-t border-slate-200 bg-canvas/95 px-2 py-4 backdrop-blur">
        <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_-8px_30px_-22px_rgba(24,43,61,.35)]">
          <input
            className="min-w-0 flex-1 rounded-xl border border-transparent bg-slate-50 px-4 py-3 text-sm outline-none focus:border-sky-300 focus:bg-white"
            value={input}
            maxLength={4000}
            placeholder={t('Ваш вопрос')}
            aria-label={t('Ваш вопрос')}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={(event) => event.key === 'Enter' && void send()}
          />
          <button
            className="min-h-11 shrink-0 rounded-xl bg-sky-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-sky-700 disabled:cursor-wait disabled:opacity-60"
            disabled={busy || !input.trim()}
            onClick={() => void send()}
          >
            {busy ? t('Подождите…') : t('Отправить')}
          </button>
        </div>
      </div>
    </section>
  )
}
