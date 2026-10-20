import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { SESSION_COOKIE_NAME, VIEW_AS_COOKIE_NAME } from '@/src/modules/auth/domain/types'
import { isInvoicingMockEnabled } from '@/src/modules/facturacion/domain/invoicing-availability'
import { isWriteMethod } from '@/src/modules/auth/domain/view-as-policy'
import { getSessionFromToken, getViewAsFromToken } from '@/src/modules/auth/infrastructure/session-cookie'

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

  /**
   * Facturación (mock local) no existe en Vercel: 404 real desde el proxy. El
   * `notFound()` del layout, con la página prerrenderizada, devolvía el
   * contenido de «no encontrada» pero con estado 200.
   */
  if (
    (pathname === '/facturacion' || pathname.startsWith('/facturacion/')) &&
    !isInvoicingMockEnabled()
  ) {
    return NextResponse.rewrite(new URL('/facturacion-no-disponible', request.url), {
      status: 404,
    })
  }

  /**
   * «Vista como cliente» = solo lectura: mientras una vista vigente de este
   * mismo usuario esté abierta, ninguna escritura (server actions y API son
   * POST/PUT/…) llega a la aplicación. Una cookie caducada o de otra sesión
   * no bloquea nada.
   */
  // Las server actions (cabecera `next-action`) pasan: `getSession` las deniega
  // bajo la vista salvo las de lectura que lo declaran. El resto de escrituras
  // (API, formularios) se corta aquí.
  if (isWriteMethod(request.method) && !request.headers.has('next-action')) {
    const viewAs = await getViewAsFromToken(request.cookies.get(VIEW_AS_COOKIE_NAME)?.value)
    if (viewAs && session && viewAs.staffAuthId === session.user.id) {
      return NextResponse.json({ error: 'view_as_read_only' }, { status: 403 })
    }
  }

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
  // Todo menos estáticos: el bloqueo de escrituras de la vista como cliente
  // tiene que cubrir cualquier ruta (firmas, trámites, documentos, API…).
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)'],
}
