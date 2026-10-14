const DEFAULT_REDIRECT_PATH = '/dashboard'
const MAX_REDIRECT_LENGTH = 2048
const CONTROL_OR_BACKSLASH = /[\u0000-\u001F\u007F\\]/

/**
 * Ruta interna segura para redirigir tras el login. Solo acepta rutas del
 * propio sitio (`/algo`): una URL absoluta, `//host`, `/\host` o cualquier cosa
 * con caracteres de control se sustituye por `fallback`, para que un `?next=`
 * manipulado no pueda sacar a la persona del portal.
 */
export function resolveSafeRedirectPath(
  raw: string | null | undefined,
  fallback: string = DEFAULT_REDIRECT_PATH
): string {
  if (!raw || raw.length > MAX_REDIRECT_LENGTH) return fallback
  if (!raw.startsWith('/') || raw.startsWith('//')) return fallback
  if (CONTROL_OR_BACKSLASH.test(raw)) return fallback

  try {
    // Un origen distinto al base delata una ruta que el parser trata como externa.
    const parsed = new URL(raw, 'http://internal.invalid')
    if (parsed.origin !== 'http://internal.invalid') return fallback
    // `/a/..//host` o `/.//host` se normalizan a `//host` (protocolo relativo).
    if (parsed.pathname.startsWith('//')) return fallback
    return `${parsed.pathname}${parsed.search}${parsed.hash}`
  } catch {
    return fallback
  }
}
