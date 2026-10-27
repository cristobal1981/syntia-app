/**
 * Abrir un registro desde un aviso cuando ya se está en esa misma pantalla (por ejemplo, el aviso
 * de un trámite estando en «Trámites») solo cambia el parámetro `open`: la lista ya está en el
 * navegador y no hace falta pedirla otra vez al servidor. `router.push` siempre pide la página
 * entera, y esas peticiones hacen cola con las acciones del chat.
 */
export function resolveNotificationNavigation(
  currentPathname: string,
  url: string
): 'shallow' | 'router' {
  let target: URL
  try {
    target = new URL(url, 'http://internal.invalid')
  } catch {
    return 'router'
  }
  return target.origin === 'http://internal.invalid' && target.pathname === currentPathname
    ? 'shallow'
    : 'router'
}
