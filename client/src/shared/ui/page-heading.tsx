type PageHeadingProps = {
  title: string
  description?: string
}

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <div className="mb-8">
      <p className="mb-4 text-[10px] font-extrabold tracking-[0.2em] text-muted">
        INTC - SUPPORTER
      </p>
      <h1 className="text-3xl font-extrabold tracking-tight md:text-4xl">{title}</h1>
      {description && <p className="mt-4 text-sm leading-7 text-muted">{description}</p>}
    </div>
  )
}
