import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

import { SESSION_COOKIE_NAME } from '@/src/modules/auth/domain/types'
import { getSessionFromToken } from '@/src/modules/auth/infrastructure/session-cookie'

const PROTECTED_PREFIX = '/dashboard'
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

  if (pathname.startsWith(AUTH_PAGES_PREFIX) && isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  if (pathname.startsWith(PROTECTED_PREFIX) && !isAuthenticated) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/', '/login', '/login/:path*', '/dashboard', '/dashboard/:path*'],
}
