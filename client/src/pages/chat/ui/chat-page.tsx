import { useEffect, useRef, useState } from 'react'
import { EmptyState } from '@/shared/ui/empty-state'
import { PageHeading } from '@/shared/ui/page-heading'
import { streamChat } from '../api/stream-chat'

type Message = { role: 'user' | 'ai'; text: string }

export function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const controllerRef = useRef<AbortController | null>(null)

  useEffect(() => () => controllerRef.current?.abort(), [])

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
      await streamChat(question, append, controller.signal)
    } catch (reason) {
      if (!controller.signal.aborted) {
        append(reason instanceof Error ? reason.message : 'Ошибка')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="min-h-[65vh] py-8">
      <PageHeading title="ИИ-помощник" />
      {messages.length === 0 ? (
        <EmptyState>
          <h2 className="my-4 text-2xl font-bold text-ink">Знакомимся с колледжем</h2>
          <p>Задайте вопрос о колледже, ответ будет найден в документах.</p>
        </EmptyState>
      ) : (
        <div className="my-6 flex flex-col gap-3">
          {messages.map((message, index) => (
            <div
              key={index}
              className={message.role === 'user' ? 'self-end font-semibold' : 'self-start'}
            >
              {message.text || '…'}
            </div>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          className="flex-1 rounded border px-3 py-2"
          value={input}
          maxLength={4000}
          placeholder="Ваш вопрос"
          onChange={(event) => setInput(event.target.value)}
          onKeyDown={(event) => event.key === 'Enter' && void send()}
        />
        <button className="rounded border px-4 py-2" disabled={busy} onClick={() => void send()}>
          Отправить
        </button>
      </div>
    </section>
  )
}