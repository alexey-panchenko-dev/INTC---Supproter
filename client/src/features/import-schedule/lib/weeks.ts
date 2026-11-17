/**
 * Date helpers on YYYY-MM-DD strings (UTC math, no time-zone shifts).
 * Week rules mirror api/app/schedule_import.py.
 */

function parse(value: string) {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day))
}

function format(date: Date) {
  return date.toISOString().slice(0, 10)
}

function addDays(value: string, days: number) {
  const date = parse(value)
  date.setUTCDate(date.getUTCDate() + days)
  return format(date)
}

/** 0 = Monday … 6 = Sunday. */
function weekdayIndex(value: string) {
  return (parse(value).getUTCDay() + 6) % 7
}

export function mondayOf(value: string) {
  return addDays(value, -weekdayIndex(value))
}

/** Monday of study week 1; a Saturday/Sunday start moves it to the next Monday. */
export function firstWeekMonday(start: string) {
  const monday = mondayOf(start)
  return weekdayIndex(start) >= 5 ? addDays(monday, 7) : monday
}

export type StudyWeek = { number: number; from: string; to: string; red: boolean }

/**
 * Study weeks with dates: odd weeks — black variant, even weeks — red variant.
 * `lastWeekday` (1 = Mon … 7 = Sun) is the last study day of the table, so a
 * five-day schedule shows 12.10–16.10 instead of 12.10–18.10.
 */
export function studyWeeks(start: string, weeks: number, lastWeekday = 7): StudyWeek[] {
  const monday = firstWeekMonday(start)
  return Array.from({ length: weeks }, (_, index) => ({
    number: index + 1,
    from: index === 0 && start > monday ? start : addDays(monday, index * 7),
    to: addDays(monday, index * 7 + lastWeekday - 1),
    red: index % 2 === 1,
  }))
}

export function isValidIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(parse(value).getTime())
}

export function humanDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}.${month}.${year}`
}

export function shortDate(value: string) {
  const [, month, day] = value.split('-')
  return `${day}.${month}`
}

export function todayIso() {
  const date = new Date()
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
