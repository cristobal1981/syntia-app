import { connection, NextResponse } from 'next/server'

import {
  getRecordDrawerBundleAction,
  listNewerRecordMessagesAction,
  listRecordMessagesAction,
} from '@/src/modules/portal/application/portal-chatter-actions'
import type { PortalRecordKind } from '@/src/modules/portal/domain/portal-record-types'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

function parseKind(value: string | null): PortalRecordKind | null {
  return value === 'task' || value === 'ticket' ? value : null
}

/** Entero de la query o `null` si falta o no es un entero (la acción valida el rango). */
function parseInteger(value: string | null): number | null {
  if (value === null || !/^\d{1,15}$/.test(value)) return null
  return Number(value)
}

/**
 * Lecturas del chat de un trámite o consulta. Van por GET y no como Server Actions porque Next
 * despacha las acciones de un navegador de una en una: cargar el chat hacía cola con el sondeo y
 * con enviar un mensaje, y no se podía cancelar. Misma lógica y mismos permisos que las acciones.
 *
 * `mode`: `bundle` (primera página y descripción), `older` (anteriores a `beforeId`) o `newer`
 * (posteriores a `afterId`, 0 si el chat está vacío).
 */
export async function GET(request: Request) {
  // Dinámica siempre: sin esto Next intenta prerrenderizarla al compilar y el `catch` de abajo se
  // tragaría el aviso interno de `cookies()`.
  await connection()

  const params = new URL(request.url).searchParams
  const kind = parseKind(params.get('kind'))
  const recordId = parseInteger(params.get('recordId'))
  const mode = params.get('mode')
  if (!kind || recordId === null) {
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 400, headers: NO_STORE })
  }

  try {
    if (mode === 'bundle') {
      return NextResponse.json(await getRecordDrawerBundleAction({ kind, recordId }), {
        headers: NO_STORE,
      })
    }
    if (mode === 'older') {
      const beforeId = parseInteger(params.get('beforeId'))
      return NextResponse.json(
        await listRecordMessagesAction({
          kind,
          recordId,
          beforeId: beforeId ?? undefined,
        }),
        { headers: NO_STORE },
      )
    }
    if (mode === 'newer') {
      const afterId = parseInteger(params.get('afterId'))
      if (afterId === null) {
        return NextResponse.json(
          { ok: false, error: 'not_found' },
          { status: 400, headers: NO_STORE },
        )
      }
      return NextResponse.json(await listNewerRecordMessagesAction({ kind, recordId, afterId }), {
        headers: NO_STORE,
      })
    }
    return NextResponse.json({ ok: false, error: 'not_found' }, { status: 400, headers: NO_STORE })
  } catch (error) {
    console.error('[portal chat] ruta de lectura del chat falló', error)
    return NextResponse.json(
      { ok: false, error: 'odoo_unavailable' },
      { status: 500, headers: NO_STORE },
    )
  }
}
