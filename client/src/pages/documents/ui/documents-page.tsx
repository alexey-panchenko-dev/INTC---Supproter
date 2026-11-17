import { useI18n } from '@/shared/i18n'
import { useMemo, useState, type FormEvent } from 'react'
import { useSearchParams } from 'react-router-dom'
import type { CollegeDocument } from '@/entities/document'
import { useAuth } from '@/entities/session'
import { apiRequest } from '@/shared/api/client'
import { useApiQuery } from '@/shared/api/use-api-query'
import { PageHeading } from '@/shared/ui/page-heading'
import { QueryState } from '@/shared/ui/query-state'
import { ContestSection } from './contest-section'

const defaultSections = [
  {
    id: 'documents',
    title: 'Документы и бланки',
    description: 'Правила, справки и официальные документы колледжа.',
  },
  {
    id: 'contests',
    title: 'Конкурсы',
    description: 'Анонсы IT-конкурсов, условия участия и запись.',
  },
] as const

type CollegeSection = {
  id: string
  title: string
  description: string
}

type CollegeSectionRecord = {
  id: number
  slug: string
  title: string
  description: string
}

type SectionItem = {
  id: number
  section_id: number
  title: string
  summary: string
  content: string
  link_url: string | null
  sort_order: number
}

type SectionItemPayload = Omit<SectionItem, 'id' | 'section_id' | 'sort_order'>

function SectionEditorDialog({
  initial,
  onClose,
  onSave,
  onSaved,
}: {
  initial: { slug: string; title: string; description: string } | null
  onClose: () => void
  onSave: (
    value: { title: string; description: string },
    slug?: string,
  ) => Promise<CollegeSectionRecord>
  onSaved: (section: CollegeSectionRecord, isNew: boolean) => void
}) {
  const { t } = useI18n()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [description, setDescription] = useState(initial?.description ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const section = await onSave(
        { title: title.trim(), description: description.trim() },
        initial?.slug,
      )
      onSaved(section, !initial)
      onClose()
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Не удалось сохранить раздел.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <form
        aria-labelledby="section-editor-title"
        aria-modal="true"
        className="my-5 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
        onSubmit={(event) => void submit(event)}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
              {t('Жизнь колледжа')}{' '}
            </p>
            <h2 id="section-editor-title" className="mt-2 text-xl font-extrabold">
              {initial ? t('Настроить раздел') : t('Создать раздел')}
            </h2>
          </div>
          <button
            aria-label={t('Закрыть')}
            className="grid h-9 w-9 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm font-semibold text-ink">
            {t('Название раздела')}{' '}
            <input
              autoFocus
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={120}
              minLength={2}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Краткое описание')}{' '}
            <textarea
              className="mt-2 min-h-24 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
              maxLength={500}
              minLength={3}
              onChange={(event) => setDescription(event.target.value)}
              required
              value={description}
            />
          </label>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {t(error)}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            {t('Отмена')}{' '}
          </button>
          <button
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            {saving ? t('Сохраняем…') : t('Сохранить')}
          </button>
        </div>
      </form>
    </div>
  )
}

function SectionItemEditorDialog({
  initial,
  onClose,
  onSave,
  onSaved,
}: {
  initial: SectionItem | null
  onClose: () => void
  onSave: (value: SectionItemPayload, id?: number) => Promise<SectionItem>
  onSaved: (item: SectionItem, isNew: boolean) => void
}) {
  const { t } = useI18n()

  const [title, setTitle] = useState(initial?.title ?? '')
  const [summary, setSummary] = useState(initial?.summary ?? '')
  const [content, setContent] = useState(initial?.content ?? '')
  const [linkUrl, setLinkUrl] = useState(initial?.link_url ?? '')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSaving(true)
    setError('')
    try {
      const item = await onSave(
        {
          title: title.trim(),
          summary: summary.trim(),
          content: content.trim(),
          link_url: linkUrl.trim() || null,
        },
        initial?.id,
      )
      onSaved(item, !initial)
      onClose()
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : 'Не удалось сохранить материал.',
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !saving) onClose()
      }}
    >
      <form
        aria-labelledby="section-item-editor-title"
        aria-modal="true"
        className="my-5 w-full max-w-2xl rounded-2xl bg-white p-6 shadow-2xl"
        onSubmit={(event) => void submit(event)}
        role="dialog"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
              {t('Материал раздела')}{' '}
            </p>
            <h2 id="section-item-editor-title" className="mt-2 text-xl font-extrabold">
              {initial ? t('Изменить материал') : t('Добавить материал')}
            </h2>
          </div>
          <button
            aria-label={t('Закрыть')}
            className="grid h-9 w-9 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            ×
          </button>
        </div>
        <div className="mt-5 grid gap-4">
          <label className="text-sm font-semibold text-ink">
            {t('Название')}{' '}
            <input
              autoFocus
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={160}
              minLength={2}
              onChange={(event) => setTitle(event.target.value)}
              required
              value={title}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Краткое описание')}{' '}
            <textarea
              className="mt-2 min-h-20 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
              maxLength={500}
              minLength={2}
              onChange={(event) => setSummary(event.target.value)}
              required
              value={summary}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Подробности')}{' '}
            <textarea
              className="mt-2 min-h-32 w-full rounded-lg border border-slate-200 px-3 py-2 font-normal"
              maxLength={10000}
              onChange={(event) => setContent(event.target.value)}
              placeholder={t('Дополнительная информация для студентов')}
              value={content}
            />
          </label>
          <label className="text-sm font-semibold text-ink">
            {t('Ссылка (необязательно)')}{' '}
            <input
              className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
              maxLength={2000}
              onChange={(event) => setLinkUrl(event.target.value)}
              placeholder="https://…"
              type="url"
              value={linkUrl}
            />
          </label>
        </div>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {t(error)}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            disabled={saving}
            onClick={onClose}
            type="button"
          >
            {t('Отмена')}{' '}
          </button>
          <button
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
            disabled={saving}
            type="submit"
          >
            {saving ? t('Сохраняем…') : t('Сохранить')}
          </button>
        </div>
      </form>
    </div>
  )
}

function DeleteConfirmationDialog({
  title,
  description,
  error,
  deleting,
  onClose,
  onConfirm,
}: {
  title: string
  description: string
  error: string
  deleting: boolean
  onClose: () => void
  onConfirm: () => void
}) {
  const { t } = useI18n()

  return (
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !deleting) onClose()
      }}
    >
      <section
        aria-labelledby="delete-confirm-title"
        aria-modal="true"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <h2 id="delete-confirm-title" className="text-xl font-extrabold">
          {title}
        </h2>
        <p className="mt-3 text-sm leading-6 text-muted">{description}</p>
        {error && (
          <p className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-800" role="alert">
            {t(error)}
          </p>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            disabled={deleting}
            onClick={onClose}
            type="button"
          >
            {t('Отмена')}{' '}
          </button>
          <button
            className="rounded-lg bg-red-700 px-4 py-2 text-sm font-bold text-white hover:bg-red-800 disabled:opacity-50"
            disabled={deleting}
            onClick={onConfirm}
            type="button"
          >
            {deleting ? t('Удаляем…') : t('Удалить')}
          </button>
        </div>
      </section>
    </div>
  )
}

export function DocumentsPage() {
  const { t } = useI18n()

  const [searchParams, setSearchParams] = useSearchParams()
  const currentSection = searchParams.get('section')
  const isDocuments = currentSection === 'documents'
  const isContests = currentSection === 'contests'
  const isOverview = !currentSection
  const isCustomSection = Boolean(currentSection && !isDocuments && !isContests)
  const { data, loading, error } = useApiQuery<CollegeDocument[]>(
    isContests ? null : 'documents',
  )
  const { data: savedSections } = useApiQuery<CollegeSectionRecord[]>('college-sections')
  const { session } = useAuth()
  const [search, setSearch] = useState('')
  const [sectionEditor, setSectionEditor] = useState<CollegeSectionRecord | 'new' | null>(
    null,
  )
  const [sectionOverrides, setSectionOverrides] = useState<
    Record<string, CollegeSectionRecord>
  >({})
  const [createdSections, setCreatedSections] = useState<CollegeSectionRecord[]>([])
  const [deletedSections, setDeletedSections] = useState<string[]>([])
  const [sectionItemEditor, setSectionItemEditor] = useState<SectionItem | 'new' | null>(
    null,
  )
  const [itemSnapshots, setItemSnapshots] = useState<Record<string, SectionItem[]>>({})
  const [deleteTarget, setDeleteTarget] = useState<
    | { kind: 'section'; slug: string }
    | { kind: 'item'; slug: string; id: number }
    | { kind: 'document'; id: number; title: string }
    | null
  >(null)
  const [deleteError, setDeleteError] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [uploadOpen, setUploadOpen] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [title, setTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [editingDocument, setEditingDocument] = useState<CollegeDocument | null>(null)
  const [addedDocuments, setAddedDocuments] = useState<CollegeDocument[]>([])
  const [documentOverrides, setDocumentOverrides] = useState<
    Record<number, CollegeDocument>
  >({})
  const [deletedDocumentIds, setDeletedDocumentIds] = useState<number[]>([])

  const { data: loadedItems } = useApiQuery<SectionItem[]>(
    isCustomSection && currentSection
      ? `college-sections/${encodeURIComponent(currentSection)}/items`
      : null,
  )

  const allSections = useMemo<CollegeSection[]>(
    () => [
      ...defaultSections,
      ...createdSections
        .filter((section) => !deletedSections.includes(section.slug))
        .map((section) => ({
          id: section.slug,
          title: section.title,
          description: section.description,
        })),
      ...(savedSections ?? [])
        .filter(
          (section) =>
            !deletedSections.includes(section.slug) &&
            !createdSections.some((created) => created.slug === section.slug),
        )
        .map((section) => ({
          id: section.slug,
          title: sectionOverrides[section.slug]?.title ?? section.title,
          description: sectionOverrides[section.slug]?.description ?? section.description,
        })),
    ],
    [createdSections, deletedSections, savedSections, sectionOverrides],
  )
  const activeCustomSection = allSections.find((section) => section.id === currentSection)
  const customSectionRecord = (savedSections ?? []).find(
    (section) => section.slug === currentSection,
  )
  const sectionItems = currentSection
    ? (itemSnapshots[currentSection] ?? loadedItems ?? [])
    : []

  const filteredDocuments = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru')
    return [...(data ?? []), ...addedDocuments]
      .filter((document) => !deletedDocumentIds.includes(document.id))
      .map((document) => documentOverrides[document.id] ?? document)
      .filter((document) => {
        const searchableText =
          `${document.title} ${document.description} ${document.category}`.toLocaleLowerCase(
            'ru',
          )
        return !query || searchableText.includes(query)
      })
  }, [addedDocuments, data, deletedDocumentIds, documentOverrides, search])

  const filteredSections = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('ru')
    return allSections.filter((section) => {
      const searchableText = `${section.title} ${section.description}`.toLocaleLowerCase(
        'ru',
      )
      return !query || searchableText.includes(query)
    })
  }, [allSections, search])

  function openSection(section: string) {
    setSearch('')
    setSearchParams({ section })
  }

  async function saveSection(
    value: { title: string; description: string },
    slug?: string,
  ) {
    return apiRequest<CollegeSectionRecord>(
      slug ? `college-sections/${encodeURIComponent(slug)}` : 'college-sections',
      {
        method: slug ? 'PUT' : 'POST',
        body: JSON.stringify(value),
      },
    )
  }

  async function saveSectionItem(value: SectionItemPayload, id?: number) {
    if (!currentSection) throw new Error('Раздел не выбран')
    return apiRequest<SectionItem>(
      `college-sections/${encodeURIComponent(currentSection)}/items${id ? `/${id}` : ''}`,
      {
        method: id ? 'PUT' : 'POST',
        body: JSON.stringify(value),
      },
    )
  }

  async function confirmDelete() {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      if (deleteTarget.kind === 'section') {
        await apiRequest<void>(
          `college-sections/${encodeURIComponent(deleteTarget.slug)}`,
          { method: 'DELETE' },
        )
        setDeletedSections((items) => [...items, deleteTarget.slug])
        setCreatedSections((items) =>
          items.filter((section) => section.slug !== deleteTarget.slug),
        )
        setSectionOverrides((items) => {
          const next = { ...items }
          delete next[deleteTarget.slug]
          return next
        })
        if (currentSection === deleteTarget.slug) goToOverview()
      } else if (deleteTarget.kind === 'item') {
        const { slug, id } = deleteTarget
        await apiRequest<void>(
          `college-sections/${encodeURIComponent(slug)}/items/${id}`,
          { method: 'DELETE' },
        )
        setItemSnapshots((items) => ({
          ...items,
          [slug]: (items[slug] ?? loadedItems ?? []).filter((item) => item.id !== id),
        }))
      } else {
        await apiRequest<void>(`documents/${deleteTarget.id}`, { method: 'DELETE' })
        setDeletedDocumentIds((items) => [...items, deleteTarget.id])
      }
      setDeleteTarget(null)
    } catch (reason) {
      setDeleteError(reason instanceof Error ? reason.message : 'Не удалось удалить')
    } finally {
      setDeleting(false)
    }
  }

  function goToOverview() {
    setSearch('')
    setSearchParams({})
  }

  async function handleUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!file && !editingDocument) {
      setUploadError('Выберите PDF-файл.')
      return
    }

    setUploading(true)
    setUploadError('')
    const formData = new FormData()
    formData.set('title', title.trim())
    if (file) formData.set('file', file)
    try {
      const document = await apiRequest<CollegeDocument>(
        editingDocument ? `documents/${editingDocument.id}` : 'documents',
        {
          method: editingDocument ? 'PUT' : 'POST',
          body: formData,
        },
      )
      if (editingDocument)
        setDocumentOverrides((current) => ({ ...current, [document.id]: document }))
      else setAddedDocuments((current) => [...current, document])
      setSearch('')
      setSearchParams({ section: 'documents' })
      setUploadOpen(false)
      setTitle('')
      setFile(null)
      setEditingDocument(null)
    } catch (reason) {
      setUploadError(
        reason instanceof Error ? reason.message : 'Не удалось загрузить PDF.',
      )
    } finally {
      setUploading(false)
    }
  }

  const addDocumentButton = session?.role === 'admin' && (
    <button
      aria-label={t('Добавить документ')}
      className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-700 text-white shadow-sm transition hover:bg-sky-800"
      onClick={() => {
        setEditingDocument(null)
        setTitle('')
        setFile(null)
        setUploadError('')
        setUploadOpen(true)
      }}
      title={t('Добавить документ')}
      type="button"
    >
      <svg
        aria-hidden="true"
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" d="M12 5v14M5 12h14" />
      </svg>
    </button>
  )

  return (
    <section className="min-h-[65vh] py-5 md:py-8">
      <PageHeading
        title={t('Жизнь колледжа')}
        description={t('Документы, события и полезная информация для студентов INTC.')}
      />

      {isOverview && (
        <>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6">
            <label className="relative block">
              <span className="sr-only">{t('Поиск по разделам')}</span>
              <svg
                aria-hidden="true"
                className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m16 16 4 4" />
              </svg>
              <input
                className="h-13 w-full rounded-xl bg-slate-50 pr-4 pl-12 text-sm text-ink placeholder:text-slate-400"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('Поиск по разделам, справкам и документам...')}
                type="search"
                value={search}
              />
            </label>
          </section>

          <div className="mt-7 mb-4 flex items-center justify-between gap-3">
            <h2 className="text-xl font-extrabold tracking-tight md:text-2xl">
              {t('Все разделы')}{' '}
            </h2>
            {session?.role === 'admin' && (
              <button
                aria-label={t('Создать раздел')}
                className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-700 text-white shadow-sm transition hover:bg-sky-800"
                onClick={() => {
                  setSectionEditor('new')
                }}
                title={t('Создать раздел')}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-5 w-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path strokeLinecap="round" d="M12 5v14M5 12h14" />
                </svg>
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filteredSections.map((section, index) => (
              <button
                className="group flex min-h-64 flex-col rounded-2xl border border-slate-100 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md"
                key={section.id}
                onClick={() => openSection(section.id)}
                type="button"
              >
                <div className="flex w-full items-start justify-between gap-3">
                  <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-sky-800">
                    {index === 0 ? (
                      <svg
                        aria-hidden="true"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M7 3.75h7l4.25 4.5v12A1.75 1.75 0 0 1 16.5 22h-9A1.75 1.75 0 0 1 5.75 20.25V5.5A1.75 1.75 0 0 1 7.5 3.75Zm7 0V8.5h4.25M8.5 13h7m-7 3.5h7"
                        />
                      </svg>
                    ) : (
                      <svg
                        aria-hidden="true"
                        className="h-6 w-6"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth="1.7"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="m12 3 2.5 5.5 6 .75-4.4 4.2 1.1 5.9-5.2-2.9-5.2 2.9 1.1-5.9-4.4-4.2 6-.75L12 3Z"
                        />
                      </svg>
                    )}
                  </span>
                  <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold text-slate-600">
                    {section.id === 'documents'
                      ? `${data?.length ?? 0} ${t('документов')}`
                      : section.id === 'contests'
                        ? t('Анонсы и запись')
                        : t('Новый раздел')}
                  </span>
                </div>
                <h3 className="mt-5 text-lg font-extrabold text-ink group-hover:text-sky-800">
                  {t(section.title)}
                </h3>
                <p className="mt-2 text-sm leading-6 text-muted">
                  {t(section.description)}
                </p>
                <span className="mt-auto flex w-full items-center justify-between pt-5 text-sm font-bold text-sky-800">
                  {section.id === 'documents'
                    ? t('Открыть документы')
                    : section.id === 'contests'
                      ? t('Открыть конкурсы')
                      : t('Открыть раздел')}
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5 transition-transform group-hover:translate-x-1"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  >
                    <path strokeLinecap="round" d="M4 12h15m-6-6 6 6-6 6" />
                  </svg>
                </span>
              </button>
            ))}
          </div>
          {filteredSections.length === 0 && (
            <p className="rounded-xl bg-white p-6 text-sm text-muted">
              {t('По вашему запросу разделы не найдены.')}{' '}
            </p>
          )}
        </>
      )}

      {isDocuments && (
        <>
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
              onClick={goToOverview}
              type="button"
            >
              {t('← Все разделы')}{' '}
            </button>
          </div>
          <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm md:p-6">
            <label className="relative block">
              <span className="sr-only">{t('Поиск по документам')}</span>
              <svg
                aria-hidden="true"
                className="absolute top-1/2 left-4 h-5 w-5 -translate-y-1/2 text-slate-400"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth="1.8"
              >
                <circle cx="11" cy="11" r="7" />
                <path strokeLinecap="round" d="m16 16 4 4" />
              </svg>
              <input
                className="h-13 w-full rounded-xl bg-slate-50 pr-4 pl-12 text-sm text-ink placeholder:text-slate-400"
                onChange={(event) => setSearch(event.target.value)}
                placeholder={t('Поиск справок, правил и документов...')}
                type="search"
                value={search}
              />
            </label>
          </section>

          <div className="mt-7 mb-4 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
                {t('Отдел документов')}{' '}
              </p>
              <h2 className="mt-1 text-xl font-extrabold tracking-tight md:text-2xl">
                {t('Документы и бланки')}{' '}
              </h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="rounded-full bg-sky-50 px-3 py-2 text-xs font-semibold text-sky-800">
                {filteredDocuments.length} {t('документов')}{' '}
              </span>
              {addDocumentButton}
            </div>
          </div>
          <QueryState
            loading={loading}
            error={error}
            empty={!data?.length && !addedDocuments.length}
            emptyMessage={t('Документы колледжа скоро появятся здесь.')}
          >
            {filteredDocuments.length ? (
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {filteredDocuments.map((document) => (
                  <article className="relative" key={document.id}>
                    <a
                      aria-label={`${t('Открыть PDF:')} ${document.title}`}
                      className="group flex h-full min-h-64 flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-200 hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-700"
                      href={`/api/v1/documents/${document.id}/file`}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <span className="grid h-12 w-12 place-items-center rounded-xl bg-sky-50 text-sky-800">
                          <svg
                            aria-hidden="true"
                            className="h-6 w-6"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                            strokeWidth="1.7"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              d="M7 3.75h7l4.25 4.5v12A1.75 1.75 0 0 1 16.5 22h-9A1.75 1.75 0 0 1 5.75 20.25V5.5A1.75 1.75 0 0 1 7.5 3.75Zm7 0V8.5h4.25M8.5 13h7m-7 3.5h7"
                            />
                          </svg>
                        </span>
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-[11px] font-bold tracking-wide text-slate-600">
                          PDF
                        </span>
                      </div>
                      <h3 className="mt-5 text-lg leading-snug font-extrabold text-ink group-hover:text-sky-800">
                        {t(document.title)}
                      </h3>
                      <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted">
                        {t(document.description)}
                      </p>
                      <span className="mt-auto flex items-center justify-between pt-5 text-sm font-bold text-sky-800">
                        {t('Открыть документ')}{' '}
                        <svg
                          aria-hidden="true"
                          className="h-5 w-5 transition-transform group-hover:translate-x-1"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth="1.8"
                        >
                          <path strokeLinecap="round" d="M4 12h15m-6-6 6 6-6 6" />
                        </svg>
                      </span>
                    </a>
                    {session?.role === 'admin' && (
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
                          onClick={() => {
                            setEditingDocument(document)
                            setTitle(document.title)
                            setFile(null)
                            setUploadError('')
                            setUploadOpen(true)
                          }}
                          type="button"
                        >
                          {t('Изменить')}
                        </button>
                        <button
                          className="rounded-lg px-3 py-2 text-sm font-semibold text-red-700 hover:bg-red-50"
                          onClick={() => {
                            setDeleteError('')
                            setDeleteTarget({
                              kind: 'document',
                              id: document.id,
                              title: document.title,
                            })
                          }}
                          type="button"
                        >
                          {t('Удалить')}
                        </button>
                      </div>
                    )}
                  </article>
                ))}
              </div>
            ) : (
              <p className="rounded-xl bg-white p-6 text-sm text-muted">
                {t('По вашему запросу документы не найдены.')}{' '}
              </p>
            )}
          </QueryState>
        </>
      )}

      {isContests && (
        <ContestSection onBack={goToOverview} isAdmin={session?.role === 'admin'} />
      )}

      {isCustomSection && (
        <>
          <div className="mb-5 flex items-center justify-between gap-3">
            <button
              className="rounded-lg px-3 py-2 text-sm font-semibold text-sky-800 hover:bg-sky-50"
              onClick={goToOverview}
              type="button"
            >
              {t('← Все разделы')}
            </button>
            {session?.role === 'admin' && customSectionRecord && (
              <div className="flex flex-wrap gap-2">
                <button
                  className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white"
                  onClick={() => setSectionItemEditor('new')}
                  type="button"
                >
                  {t('+ Добавить материал')}
                </button>
                <button
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                  onClick={() => setSectionEditor(customSectionRecord)}
                  type="button"
                >
                  {t('Настроить раздел')}
                </button>
                <button
                  className="rounded-lg border border-red-200 px-4 py-2 text-sm font-semibold text-red-700"
                  onClick={() => {
                    setDeleteError('')
                    setDeleteTarget({ kind: 'section', slug: customSectionRecord.slug })
                  }}
                  type="button"
                >
                  {t('Удалить раздел')}
                </button>
              </div>
            )}
          </div>
          <section className="rounded-2xl border border-slate-100 bg-white p-6 shadow-sm md:p-8">
            <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
              {t('Раздел колледжа')}
            </p>
            <h2 className="mt-2 text-2xl font-extrabold tracking-tight">
              {activeCustomSection?.title ?? t('Раздел не найден')}
            </h2>
            {activeCustomSection && (
              <>
                <p className="mt-3 max-w-3xl text-sm leading-6 text-muted">
                  {t(activeCustomSection.description)}
                </p>
                {sectionItems.length ? (
                  <div className="mt-7 grid gap-4 md:grid-cols-2">
                    {sectionItems.map((item) => (
                      <article
                        className="rounded-2xl border border-slate-100 p-5"
                        key={item.id}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <h3 className="text-lg font-bold">{t(item.title)}</h3>
                          {session?.role === 'admin' && (
                            <div className="flex shrink-0 gap-2">
                              <button
                                aria-label={t('Изменить материал')}
                                className="rounded-lg px-2 py-1 text-sm text-sky-800 hover:bg-sky-50"
                                onClick={() => setSectionItemEditor(item)}
                                type="button"
                              >
                                {t('Изменить')}
                              </button>
                              <button
                                aria-label={t('Удалить материал')}
                                className="rounded-lg px-2 py-1 text-sm text-red-700 hover:bg-red-50"
                                onClick={() => {
                                  setDeleteError('')
                                  setDeleteTarget({
                                    kind: 'item',
                                    slug: currentSection!,
                                    id: item.id,
                                  })
                                }}
                                type="button"
                              >
                                {t('Удалить')}
                              </button>
                            </div>
                          )}
                        </div>
                        <p className="mt-2 text-sm font-medium text-slate-600">
                          {t(item.summary)}
                        </p>
                        {item.content && (
                          <p className="mt-4 text-sm leading-6 whitespace-pre-wrap text-muted">
                            {item.content}
                          </p>
                        )}
                        {item.link_url && (
                          <a
                            className="mt-4 inline-flex text-sm font-bold text-sky-800 underline"
                            href={item.link_url}
                            rel="noreferrer"
                            target="_blank"
                          >
                            {t('Открыть ссылку →')}
                          </a>
                        )}
                      </article>
                    ))}
                  </div>
                ) : (
                  <p className="mt-6 rounded-xl bg-slate-50 p-4 text-sm text-slate-600">
                    {t('Материалы для этого раздела пока не добавлены.')}
                  </p>
                )}
              </>
            )}
            {!activeCustomSection && (
              <p className="mt-3 text-sm text-muted">
                {t('Вернитесь к списку разделов и выберите доступную тему.')}
              </p>
            )}
          </section>
        </>
      )}

      {sectionEditor && session?.role === 'admin' && (
        <SectionEditorDialog
          initial={sectionEditor === 'new' ? null : sectionEditor}
          onClose={() => setSectionEditor(null)}
          onSave={saveSection}
          onSaved={(section, isNew) => {
            setSectionOverrides((items) => ({ ...items, [section.slug]: section }))
            if (isNew) setCreatedSections((items) => [...items, section])
            if (isNew) {
              setSearch('')
              setSearchParams({})
            }
          }}
        />
      )}
      {sectionItemEditor && session?.role === 'admin' && (
        <SectionItemEditorDialog
          initial={sectionItemEditor === 'new' ? null : sectionItemEditor}
          onClose={() => setSectionItemEditor(null)}
          onSave={saveSectionItem}
          onSaved={(item, isNew) =>
            setItemSnapshots((items) => {
              const current = items[currentSection!] ?? loadedItems ?? []
              return {
                ...items,
                [currentSection!]: isNew
                  ? [...current, item]
                  : current.map((entry) => (entry.id === item.id ? item : entry)),
              }
            })
          }
        />
      )}
      {deleteTarget && (
        <DeleteConfirmationDialog
          title={
            deleteTarget.kind === 'section'
              ? t('Удалить раздел?')
              : deleteTarget.kind === 'item'
                ? t('Удалить материал?')
                : t('Удалить документ?')
          }
          description={
            deleteTarget.kind === 'section'
              ? t('Раздел и все материалы в нём будут удалены.')
              : deleteTarget.kind === 'item'
                ? t('Материал будет удалён без возможности восстановления.')
                : `${t('Документ «')}${deleteTarget.title}${t('» будет удалён.')}`
          }
          error={deleteError}
          deleting={deleting}
          onClose={() => setDeleteTarget(null)}
          onConfirm={() => void confirmDelete()}
        />
      )}

      {uploadOpen && (
        <div
          className="fixed inset-0 z-50 grid place-items-center bg-slate-950/40 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !uploading) setUploadOpen(false)
          }}
        >
          <form
            aria-labelledby="document-upload-title"
            aria-modal="true"
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={(event) => void handleUpload(event)}
            role="dialog"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold tracking-[0.14em] text-sky-800 uppercase">
                  {t('Отдел документов')}{' '}
                </p>
                <h2 id="document-upload-title" className="mt-2 text-xl font-extrabold">
                  {editingDocument ? t('Изменить документ') : t('Добавить документ')}
                </h2>
              </div>
              <button
                aria-label={t('Закрыть')}
                className="grid h-9 w-9 place-items-center rounded-lg text-xl text-slate-500 hover:bg-slate-100"
                disabled={uploading}
                onClick={() => setUploadOpen(false)}
                type="button"
              >
                ×
              </button>
            </div>
            <label
              className="mt-5 block text-sm font-semibold text-ink"
              htmlFor="document-title"
            >
              {t('Название документа')}{' '}
              <input
                autoFocus
                className="mt-2 h-11 w-full rounded-lg border border-slate-200 px-3 font-normal"
                id="document-title"
                maxLength={250}
                onChange={(event) => setTitle(event.target.value)}
                placeholder={t('Например, Правила внутреннего распорядка')}
                required
                type="text"
                value={title}
              />
            </label>
            <label
              className="mt-4 block text-sm font-semibold text-ink"
              htmlFor="document-file"
            >
              {t('PDF-файл')}{' '}
              <input
                accept="application/pdf,.pdf"
                className="mt-2 block w-full rounded-lg border border-slate-200 p-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-sky-50 file:px-3 file:py-2 file:font-semibold file:text-sky-800"
                id="document-file"
                onChange={(event) => {
                  const selected = event.currentTarget.files?.[0] ?? null
                  setFile(selected)
                  if (selected) {
                    setTitle(
                      (current) =>
                        current ||
                        selected.name
                          .replace(/\.pdf$/i, '')
                          .replace(/^\d+[_\s-]*/, '')
                          .replace(/[_-]+/g, ' '),
                    )
                  }
                }}
                required={!editingDocument}
                type="file"
              />
            </label>
            <p className="mt-3 text-xs leading-5 text-muted">
              {editingDocument
                ? t('Оставьте PDF пустым, чтобы сохранить текущий файл.')
                : t(
                    'Краткое описание создаётся автоматически из первых 16 слов документа.',
                  )}
              {t('Максимальный размер файла — 20 МБ.')}{' '}
            </p>
            {uploadError && (
              <p
                className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-800"
                role="alert"
              >
                {t(uploadError)}
              </p>
            )}
            <div className="mt-6 flex justify-end gap-3">
              <button
                className="rounded-lg px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
                disabled={uploading}
                onClick={() => setUploadOpen(false)}
                type="button"
              >
                {t('Отмена')}{' '}
              </button>
              <button
                className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-bold text-white hover:bg-sky-800 disabled:opacity-50"
                disabled={uploading || (!file && !editingDocument)}
                type="submit"
              >
                {uploading ? t('Сохраняем…') : t('Сохранить')}
              </button>
            </div>
          </form>
        </div>
      )}
    </section>
  )
}
