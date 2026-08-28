export const WEEKDAY_ORDER = [
  'lunes',
  'martes',
  'miercoles',
  'jueves',
  'viernes',
  'sabado',
  'domingo',
] as const

export function parseWeekdaysCsv(value: string): string[] {
  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
}

export function toCanonicalWeekdaysCsv(days: Iterable<string>): string {
  const set = new Set(days)
  return WEEKDAY_ORDER.filter((day) => set.has(day)).join(',')
}

export function unionWeekdaysCsv(a: string, b: string): string {
  return toCanonicalWeekdaysCsv([...parseWeekdaysCsv(a), ...parseWeekdaysCsv(b)])
}

export function weekdaysOverlap(a: string, b: string): boolean {
  const setA = new Set(parseWeekdaysCsv(a))
  return parseWeekdaysCsv(b).some((day) => setA.has(day))
}
