export function safeLink(url: string): string | undefined {
  try {
    const link = new URL(url)
    return ['https:', 'http:'].includes(link.protocol) ? link.href : undefined
  } catch {
    return undefined
  }
}
