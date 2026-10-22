export type PushSource = 'events' | 'snapshots'

/**
 * De dónde salen los avisos del push: `events` = eventos que envía Odoo (sin
 * consultar Odoo); `snapshots` = cálculo por snapshots de Odoo (el de antes).
 * Se cambia con `PUSH_SOURCE=events` cuando la automatización de Odoo ya envía
 * eventos; sin la variable (o con otro valor) sigue el cálculo anterior.
 */
export function resolvePushSource(value: string | undefined): PushSource {
  return value?.trim().toLowerCase() === 'events' ? 'events' : 'snapshots'
}
