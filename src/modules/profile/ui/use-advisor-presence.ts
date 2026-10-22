'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import type { AdvisorPresenceStatus } from '@/src/modules/profile/domain/advisor-presence'
import { shouldRefreshPresenceOnVisible } from '@/src/modules/profile/domain/advisor-presence-refresh'
import { getAdvisorPresenceUrl } from '@/src/modules/portal/lib/advisor-presence-url'

type AdvisorPresenceResponse = {
  presence: AdvisorPresenceStatus
}

/**
 * Consulta la presencia del asesor y la refresca al volver a la pestaña, como
 * mucho una vez cada 30 s. Cualquier fallo deja `presence` en null (no se muestra indicador).
 */
export function useAdvisorPresence(partnerId?: number) {
  const [presence, setPresence] = useState<AdvisorPresenceStatus | null>(null)
  const [loading, setLoading] = useState(Boolean(partnerId))
  const lastRefreshAtRef = useRef<number | null>(null)

  const refresh = useCallback(async () => {
    if (!partnerId) {
      setPresence(null)
      setLoading(false)
      return
    }

    setLoading(true)
    lastRefreshAtRef.current = Date.now()

    try {
      const response = await fetch(getAdvisorPresenceUrl(partnerId), {
        cache: 'no-store',
      })

      if (!response.ok) {
        setPresence(null)
        return
      }

      const data = (await response.json()) as AdvisorPresenceResponse
      setPresence(data.presence)
    } catch {
      setPresence(null)
    } finally {
      setLoading(false)
    }
  }, [partnerId])

  useEffect(() => {
    // Dispara el fetch inicial de presencia; setLoading(true) dentro de
    // refresh() corre antes del await (patrón estándar de fetch-on-mount).
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (
        document.visibilityState === 'visible' &&
        shouldRefreshPresenceOnVisible(lastRefreshAtRef.current, Date.now())
      ) {
        void refresh()
      }
    }

    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [refresh])

  return { presence, loading, refresh }
}
