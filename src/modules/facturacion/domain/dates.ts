/** Fecha local de hoy en `YYYY-MM-DD` (no la UTC: de madrugada en Canarias no debe saltar de día). */
export function localIsoDate(date: Date = new Date()): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function addDaysIso(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split('-').map(Number)
  return new Date(Date.UTC(year, month - 1, day + days)).toISOString().slice(0, 10)
}

/** Días naturales de `from` a `to` (negativo si `to` es anterior). */
export function daysBetweenIso(from: string, to: string): number {
  const toUtc = (iso: string) => {
    const [year, month, day] = iso.split('-').map(Number)
    return Date.UTC(year, month - 1, day)
  }
  return Math.round((toUtc(to) - toUtc(from)) / 86_400_000)
}
