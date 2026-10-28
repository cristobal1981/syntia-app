import { resolveNotificationNavigation } from '@/src/modules/portal/domain/shallow-navigation'

/** Cambia la URL sin ir al servidor: Next sincroniza `useSearchParams` con `history.pushState`. */
export function pushUrlShallow(url: string) {
  window.history.pushState(null, '', url)
}

/** Limpia la URL (por ejemplo el `?open=` ya consumido) sin pedir la página al servidor. */
export function replaceUrlShallow(url: string) {
  window.history.replaceState(null, '', url)
}

/** Abre una ruta del portal: sin ir al servidor si ya se está en esa pantalla; si no, navega. */
export function openPortalUrl(router: { push: (url: string) => void }, url: string) {
  if (resolveNotificationNavigation(window.location.pathname, url) === 'shallow') {
    pushUrlShallow(url)
    return
  }
  router.push(url)
}
