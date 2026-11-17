/** JSON contract of /api/v1/schedule/recognize and /api/v1/schedule/import. */

export type Week = 'every' | 'odd' | 'even'

export type DraftLesson = {
  weekday: number | null
  date: string | null
  pair: number | null
  starts_at: string
  ends_at: string
  subject: string
  teacher: string
  room: string
  week: Week
  note: string | null
}

export type ScheduleDraft = {
  kind: 'weekly' | 'dated'
  group: string | null
  title: string | null
  weeks_count: number | null
  /** Start of the study weeks if it is printed on the photo, YYYY-MM-DD. */
  start_date: string | null
  lessons: DraftLesson[]
  warnings: string[]
}

export type ImportResult = {
  group: string
  first_date: string
  last_date: string
  days_with_lessons: number
  lessons_created: number
}

export const weekdays = [
  { value: 1, label: 'Пн' },
  { value: 2, label: 'Вт' },
  { value: 3, label: 'Ср' },
  { value: 4, label: 'Чт' },
  { value: 5, label: 'Пт' },
  { value: 6, label: 'Сб' },
  { value: 7, label: 'Вс' },
] as const

export const weekOptions: { value: Week; label: string }[] = [
  { value: 'every', label: 'Каждую неделю' },
  { value: 'odd', label: '1, 3, 5… (чёрный)' },
  { value: 'even', label: '2, 4, 6… (красный)' },
]
