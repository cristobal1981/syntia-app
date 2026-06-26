/** Convierte datetime Odoo (`YYYY-MM-DD HH:mm:ss`) a ISO para ordenar. */
export function parseOdooDateTime(value: unknown): string {
  if (typeof value !== 'string' || !value.trim()) return ''

  const trimmed = value.trim()
  const asIso = trimmed.includes('T')
    ? trimmed
    : `${trimmed.replace(' ', 'T')}Z`

  const date = new Date(asIso)
  if (Number.isNaN(date.getTime())) {
    return trimmed
  }

  return date.toISOString()
}

export function compareTramiteModifiedAtDesc(a: string, b: string): number {
  if (a === b) return 0
  if (!a) return 1
  if (!b) return -1
  return b.localeCompare(a)
}
