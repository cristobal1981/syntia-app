/**
 * ¿La petición viene de una página de este mismo sitio? Las Server Actions de Next ya comprueban
 * el origen; un Route Handler con cookie de sesión tiene que hacerlo él para que otra web no
 * pueda lanzarle peticiones con las cookies del usuario (CSRF). `Sec-Fetch-Site` lo manda el
 * navegador y la página no puede falsearlo; sin él se compara `Origin` con el host. Sin ninguno
 * de los dos (no es un navegador) se rechaza.
 */
export function isSameOriginRequest(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite) return fetchSite === 'same-origin'

  const origin = request.headers.get('origin')
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
  if (!origin || !host) return false
  try {
    return new URL(origin).host === host
  } catch {
    return false
  }
}
