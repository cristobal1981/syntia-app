import { NextResponse } from 'next/server'

import { VIEW_AS_COOKIE_NAME } from '@/src/modules/auth/domain/types'
import { getRealSession } from '@/src/modules/auth/application/get-session'

/**
 * GET a propósito: el proxy rechaza los demás métodos mientras dura la vista.
 * La redirección es relativa (cabecera `Location` sin host): `request.url`
 * trae el host de escucha del servidor (`0.0.0.0` en desarrollo), no el que
 * escribió el usuario.
 */
export async function GET(request: Request) {
  const session = await getRealSession()
  const target = session?.user.role === 'admin' ? '/equipo/clientes' : '/clientes'
  // `?format=json`: lo usa el enlace de salida del portal para quitar la vista sin recargar la
  // página (así la animación de aterrizaje sobrevive) y navegar él mismo al destino.
  const wantsJson = new URL(request.url).searchParams.get('format') === 'json'
  const response = wantsJson
    ? NextResponse.json({ target }, { headers: { 'Cache-Control': 'private, no-store' } })
    : new NextResponse(null, { status: 307, headers: { Location: target } })
  response.cookies.delete(VIEW_AS_COOKIE_NAME)
  return response
}
