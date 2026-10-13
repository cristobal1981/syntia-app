import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/src/modules/auth/domain/types'
import { getSessionFromToken } from '@/src/modules/auth/infrastructure/session-cookie'

const PROTECTED_PREFIXES = [
  '/dashboard',
  '/perfil',
  '/integraciones',
  '/equipo',
  '/clientes',
]
const AUTH_PAGES_PREFIX = '/login'

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value
  const session = await getSessionFromToken(token)
  const isAuthenticated = Boolean(session)

  if (pathname === '/') {
    const url = request.nextUrl.clone()
    url.pathname = isAuthenticated ? '/dashboard' : '/login'
    return NextResponse.redirect(url)
  }

  /**
   * Un `worker` puede tener un token firmado válido (superficie que este
   * proxy comprueba sin ir a la base de datos) cuyo acceso real ya ha sido
   * revocado (grant/toggle del titular) — eso solo lo sabe el chequeo
   * profundo de `getSession()` en cada página, que entonces lo manda de
   * vuelta a `/login`. Si aquí lo rebotáramos igual que a un `client`/`admin`
   * autenticado, entraría en un bucle infinito /dashboard -> /login ->
   * /dashboard. Para un worker, dejar pasar `/login` y que sea la página la
   * que decida si de verdad tiene sesión válida.
   */
  if (
    pathname.startsWith(AUTH_PAGES_PREFIX) &&
    isAuthenticated &&
    session?.user.role !== 'worker'
  ) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix)) && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/',
    '/login',
    '/login/:path*',
    '/dashboard',
    '/dashboard/:path*',
    '/perfil',
    '/integraciones',
    '/equipo',
    '/equipo/:path*',
    '/clientes',
    '/clientes/:path*',
  ],
}
