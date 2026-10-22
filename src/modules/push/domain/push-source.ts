export type PushSource = 'events' | 'snapshots'

/** Origen de una fila de `push_runs`: el dispatcher (según `PushSource`) o el barrido de reconciliación. */
export type PushRunSource = PushSource | 'sweep'

/**
 * De dónde salen los avisos del push: `events` = eventos que envía Odoo (sin
 * consultar Odoo); `snapshots` = cálculo por snapshots de Odoo (el de antes).
 * Se cambia con `PUSH_SOURCE=events` cuando la automatización de Odoo ya envía
 * eventos; sin la variable (o con otro valor) sigue el cálculo anterior.
 */
export function resolvePushSource(value: string | undefined): PushSource {
  return value?.trim().toLowerCase() === 'events' ? 'events' : 'snapshots'
}
