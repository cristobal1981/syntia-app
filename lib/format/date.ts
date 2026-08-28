/** Formatea una fecha ISO (YYYY-MM-DD) a formato largo en español, ej. "1 de junio de 2026". */
export function formatIsoDateEs(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return value
  const date = new Date(`${value}T12:00:00`)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'long' }).format(date)
}
