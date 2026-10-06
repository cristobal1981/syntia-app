const PORTAL_MAIN_SELECTOR = 'main'

export function readPortalMainScrollTop(): number {
  if (typeof document === 'undefined') return 0
  return document.querySelector(PORTAL_MAIN_SELECTOR)?.scrollTop ?? 0
}

export function restorePortalMainScrollTop(top: number) {
  if (typeof document === 'undefined') return
  const main = document.querySelector(PORTAL_MAIN_SELECTOR)
  if (main) main.scrollTop = top
}
