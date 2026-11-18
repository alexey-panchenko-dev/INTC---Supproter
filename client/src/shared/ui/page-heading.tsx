type PageHeadingProps = {
  title: string
  description?: string
}

export function PageHeading({ title, description }: PageHeadingProps) {
  return (
    <div className="mb-6 md:mb-8">
      <h1 className="text-2xl leading-tight font-extrabold tracking-tight text-ink sm:text-3xl md:text-4xl">
        {title}
      </h1>
      {description && (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted sm:text-base sm:leading-7">
          {description}
        </p>
      )}
    </div>
  )
}
