import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { VIEW_AS_COOKIE_NAME } from '@/src/modules/auth/domain/types'
import { getRealSession } from '@/src/modules/auth/application/get-session'

/** GET a propósito: el proxy rechaza los demás métodos mientras dura la vista. */
export async function GET(request: NextRequest) {
  const session = await getRealSession()
  const target = session?.user.role === 'admin' ? '/equipo/clientes' : '/clientes'
  const response = NextResponse.redirect(new URL(target, request.url))
  response.cookies.delete(VIEW_AS_COOKIE_NAME)
  return response
}
