import { useCallback, useEffect, useRef, useTransition } from 'react'
import type { useRouter } from 'next/navigation'

import {
  readPortalMainScrollTop,
  restorePortalMainScrollTop,
} from '@/src/modules/portal/infrastructure/portal-main-scroll'

/**
 * `router.refresh()` remonta el árbol de Server Components y, con eso, el
 * scroll de `<main>` — este hook lo guarda justo antes de refrescar y lo
 * repone en el siguiente paint (dos `requestAnimationFrame` para esperar a
 * que el nuevo árbol esté montado y pintado antes de restaurar).
 */
export function usePortalPageRefresh(router: ReturnType<typeof useRouter>) {
  const [portalRefreshPending, startPortalRefresh] = useTransition()
  const pendingMainScrollRestoreRef = useRef<number | null>(null)

  const refreshPortalPages = useCallback(() => {
    pendingMainScrollRestoreRef.current = readPortalMainScrollTop()
    startPortalRefresh(() => {
      router.refresh()
    })
  }, [router])

  useEffect(() => {
    if (portalRefreshPending || pendingMainScrollRestoreRef.current === null) return

    const top = pendingMainScrollRestoreRef.current
    pendingMainScrollRestoreRef.current = null

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        restorePortalMainScrollTop(top)
      })
    })
  }, [portalRefreshPending])

  return { refreshPortalPages }
}
