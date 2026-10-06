export const DEFERRED_POLL_MS = 2_000

export function shouldRefreshPortalPageOnNotificationPoll(pathname: string): boolean {
  // Guías: contenido estático; router.refresh() remonta loading.tsx y pierde scroll.
  if (pathname.startsWith('/guias')) return false
  return true
}

export function shouldDeferInitialPoll(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).has('open')
}
