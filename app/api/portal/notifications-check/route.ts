import { connection, NextResponse } from 'next/server'

import { isSameOriginRequest } from '@/lib/security/same-origin'
import { checkPortalNotificationsAction } from '@/src/modules/portal/application/portal-chatter-notifications-actions'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

/**
 * Comprobación completa de avisos del sondeo (lee de Odoo y guarda el estado «visto»). Va por POST
 * y no como Server Action porque Next despacha las acciones de un navegador de una en una: esta
 * lectura (2-5 s) hacía cola con la carga del chat y con enviar un mensaje. Misma lógica y
 * permisos que la acción. Fuera de una Server Action las cachés se expiran con `revalidateTag`
 * (la lectura carga directo), tal y como ya prevé `refreshSnapshotCache`.
 */
export async function POST(request: Request) {
  await connection()
  if (!isSameOriginRequest(request)) {
    return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403, headers: NO_STORE })
  }

  let reuseRecentSnapshots = false
  let chatterOnly = false
  try {
    const body = (await request.json()) as {
      reuseRecentSnapshots?: unknown
      chatterOnly?: unknown
    } | null
    reuseRecentSnapshots = body?.reuseRecentSnapshots === true
    chatterOnly = body?.chatterOnly === true
  } catch {
    // Sin cuerpo o ilegible: comprobación normal.
  }

  try {
    const result = await checkPortalNotificationsAction(
      reuseRecentSnapshots || chatterOnly
        ? {
            ...(reuseRecentSnapshots ? { reuseRecentSnapshots: true } : {}),
            ...(chatterOnly ? { chatterOnly: true } : {}),
          }
        : undefined
    )
    return NextResponse.json(result, { headers: NO_STORE })
  } catch (error) {
    console.error('[portal notifications] ruta de la comprobación falló', error)
    return NextResponse.json({ ok: false, error: 'odoo_unavailable' }, { status: 500, headers: NO_STORE })
  }
}
