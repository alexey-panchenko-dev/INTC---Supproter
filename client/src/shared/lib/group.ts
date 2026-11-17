const latinToCyrillic: Record<string, string> = {
  A: 'А',
  B: 'В',
  C: 'С',
  E: 'Е',
  H: 'Н',
  K: 'К',
  M: 'М',
  O: 'О',
  P: 'Р',
  T: 'Т',
  X: 'Х',
  Y: 'У',
}

/** Same rules as api/app/groups.py: «тис 24p» → «ТИС-24Р». */
export function normalizeGroup(value: string) {
  const group = value
    .trim()
    .toUpperCase()
    .replace(/\s*-\s*|\s+/g, '-')
  if (!/[А-ЯЁӘҒҚҢӨҰҮҺІ]/.test(group)) return group
  return group.replace(/[ABCEHKMOPTXY]/g, (letter) => latinToCyrillic[letter])
}
