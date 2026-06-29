'use client'

import { useCallback, useEffect, useState } from 'react'

import type { AdvisorPresenceStatus } from '@/src/modules/profile/domain/advisor-presence'
import { getAdvisorPresenceUrl } from '@/src/modules/portal/lib/advisor-presence-url'

type AdvisorPresenceResponse = {
  presence: AdvisorPresenceStatus
}

export function useAdvisorPresence(partnerId?: number) {
  const [presence, setPresence] = useState<AdvisorPresenceStatus | null>(null)
  const [loading, setLoading] = useState(Boolean(partnerId))

  const refresh = useCallback(async () => {
    if (!partnerId) {
      setPresence(null)
      setLoading(false)
      return
    }

    setLoading(true)

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
    void refresh()
  }, [refresh])

  useEffect(() => {
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
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
