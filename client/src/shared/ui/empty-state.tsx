import type { ReactNode } from 'react'

export function EmptyState({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed border-sky-200 bg-white px-6 py-14 text-center text-sm leading-8 text-muted">
      {children}
    </div>
  )
}
