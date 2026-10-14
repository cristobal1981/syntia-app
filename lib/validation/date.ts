/**
 * Fecha YYYY-MM-DD real: se reconstruye y se compara, porque `new Date` da por
 * buenas fechas imposibles como 2026-02-31 (las desplaza a marzo).
 */
export function isValidIsoDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return false
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const date = new Date(Date.UTC(year, month - 1, day))
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  )
}

/** Fecha local YYYY-MM-DD (para inputs type="date" y validación). */
function todayIsoDateLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function isIsoDateBeforeToday(value: string): boolean {
  if (!isValidIsoDate(value)) return false
  return value < todayIsoDateLocal()
}
