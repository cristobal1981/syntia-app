import {
  buildFirmaDueSoonPayloads,
  isFirmaDueSweepHour,
  type DueSoonSignItem,
} from '@/src/modules/push/domain/firma-due-soon'
import {
  parsePortalEventPayload,
  type PortalEventInput,
} from '@/src/modules/push/domain/portal-event'

export type FirmaDueSweepDeps = {
  /** Firmantes pendientes cuya solicitud vence en la ventana de «vence pronto». */
  fetchDueSoonItems: () => Promise<DueSoonSignItem[]>
  insertEvent: (event: PortalEventInput) => Promise<'created' | 'duplicate'>
  now: () => number
  obligacionesPrefix: string
}

export type FirmaDueSweepSummary = {
  /** Firmantes revisados. */
  scanned: number
  /** Avisos nuevos. */
  created: number
  /** Avisos que ya estaban (lo normal en cada barrido tras el primero). */
  existing: number
  /** Fuera de horario: no se ha consultado nada para no avisar de madrugada. */
  outsideHours: boolean
}

/**
 * Aviso «una firma vence pronto» por eventos. Es por fecha, no por un cambio en
 * Odoo, así que lo genera el barrido: cada pasada crea el evento de los
 * firmantes cuya solicitud entra en la ventana y el `event_id` evita repetirlo.
 */
export async function runFirmaDueSweep(deps: FirmaDueSweepDeps): Promise<FirmaDueSweepSummary> {
  const summary: FirmaDueSweepSummary = {
    scanned: 0,
    created: 0,
    existing: 0,
    outsideHours: false,
  }

  const now = new Date(deps.now())
  if (!isFirmaDueSweepHour(now)) {
    summary.outsideHours = true
    return summary
  }

  const items = await deps.fetchDueSoonItems()
  summary.scanned = items.length

  for (const payload of buildFirmaDueSoonPayloads(items, now)) {
    const parsed = parsePortalEventPayload(payload, {
      obligacionesPrefix: deps.obligacionesPrefix,
    })
    if (parsed.status !== 'ok') continue
    const result = await deps.insertEvent(parsed.event)
    if (result === 'created') summary.created += 1
    else summary.existing += 1
  }

  return summary
}
