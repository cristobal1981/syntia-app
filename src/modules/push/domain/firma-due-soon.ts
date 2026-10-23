import { isSignatureDueSoon } from '@/src/modules/firmas/domain/signature-due-date'

/** Un firmante con una solicitud pendiente y su fecha de vencimiento (`YYYY-MM-DD`). */
export type DueSoonSignItem = {
  requestId: number
  reference: string
  dueDate: string
  partnerId: number
}

/** Horas (hora de Canarias) en las que el barrido puede crear avisos: nunca de madrugada. */
export const FIRMA_DUE_SWEEP_FIRST_HOUR = 9
export const FIRMA_DUE_SWEEP_LAST_HOUR = 19

export function isFirmaDueSweepHour(now: Date): boolean {
  const hour = Number(
    new Intl.DateTimeFormat('en-GB', {
      timeZone: 'Atlantic/Canary',
      hour: '2-digit',
      hour12: false,
    }).format(now)
  )
  return hour >= FIRMA_DUE_SWEEP_FIRST_HOUR && hour <= FIRMA_DUE_SWEEP_LAST_HOUR
}

/**
 * Cuerpos de evento `firma_due_soon` para el webhook (mismo parser que el resto).
 * El id lleva solicitud, firmante y fecha: repetir el barrido no duplica el
 * aviso, y si se amplía el plazo y vuelve a entrar en la ventana, avisa otra vez.
 */
export function buildFirmaDueSoonPayloads(items: DueSoonSignItem[], now: Date): unknown[] {
  return items
    .filter((item) => isSignatureDueSoon(item.dueDate))
    .map((item) => ({
      event_id: `firma-due:${item.requestId}:${item.partnerId}:${item.dueDate.slice(0, 10)}`,
      model: 'sign.request',
      kind: 'firma_due_soon',
      record_id: item.requestId,
      record_name: item.reference,
      partner_id: item.partnerId,
      occurred_at: now.toISOString(),
    }))
}
