import { connection, NextResponse } from 'next/server'

import { checkPortalNewsSignalAction } from '@/src/modules/portal/application/portal-chatter-notifications-actions'

const NO_STORE = { 'Cache-Control': 'private, no-store' }

/**
 * Señal de eventos para el sondeo de la campana. Es una lectura: va por GET y no como Server
 * Action porque Next despacha las acciones de un navegador de una en una, y la señal (cada 10 s)
 * hacía cola con el chat y con enviar un mensaje. Misma lógica y mismos permisos que la acción.
 */
export async function GET() {
  // Dinámica siempre: sin esto Next intenta prerrenderizarla al compilar y el `catch` de abajo se
  // tragaría el aviso interno de `cookies()`.
  await connection()
  try {
    return NextResponse.json(await checkPortalNewsSignalAction(), { headers: NO_STORE })
  } catch (error) {
    console.error('[portal news] ruta de la señal falló', error)
    return NextResponse.json({ ok: false, error: 'odoo_unavailable' }, { status: 500, headers: NO_STORE })
  }
}
