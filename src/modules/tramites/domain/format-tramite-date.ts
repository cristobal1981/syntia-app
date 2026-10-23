import { tramites } from '@/content/tramites'

/**
 * Zona fija (la de la asesoría) y no la del navegador: el servidor y el navegador
 * pintan la misma fecha y no hay diferencias de hidratación cerca de medianoche.
 */
const TIME_ZONE = 'Atlantic/Canary'

const dayMonth = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  timeZone: TIME_ZONE,
})
const dayMonthYear = new Intl.DateTimeFormat('es-ES', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  timeZone: TIME_ZONE,
})
const yearOnly = new Intl.DateTimeFormat('en-GB', { year: 'numeric', timeZone: TIME_ZONE })

/**
 * Fecha corta de un trámite o consulta («23 oct»; con el año si no es el actual, o
 * siempre con `alwaysYear`). Vacía si no hay fecha o no se entiende.
 */
export function formatTramiteDate(
  iso: string,
  options: { now?: Date; alwaysYear?: boolean } = {}
): string {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const now = options.now ?? new Date()
  const showYear = options.alwaysYear || yearOnly.format(date) !== yearOnly.format(now)
  return (showYear ? dayMonthYear : dayMonth).format(date)
}

/**
 * Línea del drawer: «Abierto el 12 oct 2026 · Actualizado el 22 oct». Con el año
 * en la apertura (es la que más lejos queda) y solo con lo que se sepa; `null` si
 * no hay ninguna de las dos fechas.
 */
export function buildTramiteDatesLine(
  item: { createdAt: string; modifiedAt: string },
  now: Date = new Date()
): string | null {
  const created = formatTramiteDate(item.createdAt, { now, alwaysYear: true })
  const updated = formatTramiteDate(item.modifiedAt, { now })
  const parts = [
    created ? tramites.dates.created.replace('{date}', created) : '',
    updated ? tramites.dates.updated.replace('{date}', updated) : '',
  ].filter(Boolean)
  return parts.length > 0 ? parts.join(' · ') : null
}
