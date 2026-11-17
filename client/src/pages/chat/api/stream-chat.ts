export async function streamChat(
  message: string,
  onChunk: (chunk: string) => void,
  signal: AbortSignal,
): Promise<void> {
  const response = await fetch('/api/v1/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message }),
    signal,
  })

  if (response.status === 401) {
    throw new Error('Для доступа войдите в подтверждённый аккаунт.')
  }

  if (!response.ok || !response.body) {
    throw new Error('ИИ-помощник сейчас недоступен.')
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder()

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    onChunk(decoder.decode(value, { stream: true }))
  }
}