import { useCallback, useEffect, useRef } from 'react'

import { isNetworkFailure } from '@/src/modules/portal/domain/portal-connectivity'
import { portalConnectivityStore } from '@/src/modules/portal/ui/portal-connectivity-store'
import {
  acknowledgeEventsSeenInAppAction,
  checkPortalNewsSignalAction,
  checkPortalNotificationsAction,
} from '@/src/modules/portal/application/portal-chatter-notifications-actions'
import {
  mergeAccumulatedPortalNotifications,
  pruneResolvedFirmaNotifications,
} from '@/src/modules/portal/domain/compute-portal-notifications'
import type {
  ChatterReadStateMap,
  PortalNotification,
  PortalNotificationsStats,
} from '@/src/modules/portal/domain/portal-notifications-types'
import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import {
  getInitialPollIntervalMs,
  getMaxPollIntervalMs,
  nextPollIntervalMs,
  notificationsSignature,
  SIGNAL_POLL_INTERVAL_MS,
} from '@/src/modules/portal/infrastructure/portal-notifications-poll-scheduler'
import {
  initialPollDelayMs,
  shouldAcknowledgeEventsSeen,
  shouldDeferInitialPoll,
  shouldRefreshOnVisible,
  shouldRefreshPortalPageOnNotificationPoll,
  shouldRunFullNotificationsCheck,
} from '@/src/modules/portal/infrastructure/portal-notifications-poll-timing'
import {
  PortalNotificationsTabCoordinator,
  type PortalNotificationsStateSyncPayload,
} from '@/src/modules/portal/infrastructure/portal-notifications-tab-coordinator'

type LastRecordMessage = {
  scope: 'tramite' | 'consulta' | 'obligacion'
  recordId: number
  message: PortalChatterMessage
} | null

type UsePortalNotificationsSyncArgs = {
  enabled: boolean
  pathnameRef: { current: string }
  pendingFirmaIdsRef: { current: number[] }
  unreadRef: { current: PortalNotification[] }
  readStateRef: { current: ChatterReadStateMap }
  commitUnread: (nextUnread: PortalNotification[]) => PortalNotification[]
  applyReadState: (readState: ChatterReadStateMap) => void
  loadReadStateFromStorage: () => void
  refreshPortalPages: () => void
  setStats: (stats: PortalNotificationsStats) => void
  setLastRecordMessage: (value: LastRecordMessage) => void
  setNotificationsLoading: (loading: boolean) => void
  /** El servidor ya sembró las novedades de esta pantalla (el inicio). */
  wasSeededFromServer: () => boolean
}

/**
 * Posesión exclusiva del polling a Odoo y de la sincronización entre
 * pestañas (coordinador sobre `BroadcastChannel`) — el bloque más delicado
 * de `PortalNotificationsProvider`: un líder entre pestañas sondea y las
 * demás solo reciben el resultado retransmitido, con backoff adaptativo del
 * intervalo (`pollIntervalRef`) y una cola de `setTimeout` que se
 * autoprograma.
 */
export function usePortalNotificationsSync({
  enabled,
  pathnameRef,
  pendingFirmaIdsRef,
  unreadRef,
  readStateRef,
  commitUnread,
  applyReadState,
  loadReadStateFromStorage,
  refreshPortalPages,
  setStats,
  setLastRecordMessage,
  setNotificationsLoading,
  wasSeededFromServer,
}: UsePortalNotificationsSyncArgs) {
  const pollingRef = useRef(false)
  const pollIntervalRef = useRef(getInitialPollIntervalMs())
  const pollTimerRef = useRef<number | null>(null)
  const coordinatorRef = useRef<PortalNotificationsTabCoordinator | null>(null)
  const rateLimitedRef = useRef(false)
  // Señal de eventos (ver `shouldRunFullNotificationsCheck`): último `seq` con el que se hizo
  // la comprobación completa y cuándo. `null` hasta la primera.
  const lastSignalSeqRef = useRef<number | null>(null)
  const lastFullCheckAtRef = useRef<number | null>(null)
  // Último evento que se avisó al servidor como visto en pantalla (para que el push no lo repita).
  const lastAcknowledgedSeqRef = useRef<number | null>(null)
  const lastCheckUsedRecentSnapshotsRef = useRef(false)
  const signalModeRef = useRef(false)

  const resetPollInterval = useCallback(() => {
    pollIntervalRef.current = getInitialPollIntervalMs()
  }, [])

  const publishStateToOtherTabs = useCallback(
    (nextUnread: PortalNotification[]) => {
      const coordinator = coordinatorRef.current
      if (!coordinator) return

      const pruned = pruneResolvedFirmaNotifications(
        nextUnread,
        pendingFirmaIdsRef.current
      )

      coordinator.broadcastStateSync({
        sourceTabId: coordinator.getTabId(),
        unread: pruned,
        readState: readStateRef.current,
        pendingFirmaIds: pendingFirmaIdsRef.current,
      })
    },
    [pendingFirmaIdsRef, readStateRef]
  )

  const notifyRecordMutated = useCallback(
    (
      scope: 'tramite' | 'consulta' | 'obligacion',
      recordId: number,
      message?: PortalChatterMessage
    ) => {
      const coordinator = coordinatorRef.current
      if (!coordinator) return
      coordinator.broadcastRecordMutated({
        sourceTabId: coordinator.getTabId(),
        scope,
        recordId,
        ...(message ? { message } : {}),
      })
    },
    []
  )

  const applyRemoteState = useCallback(
    (payload: PortalNotificationsStateSyncPayload) => {
      pendingFirmaIdsRef.current = payload.pendingFirmaIds
      applyReadState(payload.readState)
      const pruned = pruneResolvedFirmaNotifications(
        payload.unread as PortalNotification[],
        payload.pendingFirmaIds
      )
      commitUnread(pruned)
    },
    [applyReadState, commitUnread, pendingFirmaIdsRef]
  )

  const applyPollResult = useCallback(
    (
      result: Extract<
        Awaited<ReturnType<typeof checkPortalNotificationsAction>>,
        { ok: true }
      >,
      options?: { fromBroadcast?: boolean; refreshPages?: boolean }
    ) => {
      pendingFirmaIdsRef.current = result.pendingFirmaIds
      setStats(result.stats)
      const beforeSignature = notificationsSignature(unreadRef.current)
      applyReadState(result.readState)

      const merged = mergeAccumulatedPortalNotifications(
        unreadRef.current,
        result.unread
      )
      const hadChanges =
        result.hasChanges || beforeSignature !== notificationsSignature(merged)

      commitUnread(merged)

      if (!options?.fromBroadcast) {
        pollIntervalRef.current = rateLimitedRef.current
          ? getMaxPollIntervalMs()
          : nextPollIntervalMs(pollIntervalRef.current, hadChanges)
      }

      if (hadChanges) {
        rateLimitedRef.current = false
      }

      if (
        options?.refreshPages &&
        hadChanges &&
        shouldRefreshPortalPageOnNotificationPoll(pathnameRef.current)
      ) {
        refreshPortalPages()
      }
    },
    [applyReadState, commitUnread, pathnameRef, pendingFirmaIdsRef, refreshPortalPages, setStats, unreadRef]
  )

  /** El portal acaba de enseñar los avisos hasta `seq` con la ventana a la vista: el push no los repite. */
  const acknowledgeSeen = useCallback((seq: number | null, usedRecentSnapshots: boolean) => {
    if (
      !shouldAcknowledgeEventsSeen({
        signalSeq: seq,
        lastAcknowledgedSeq: lastAcknowledgedSeqRef.current,
        windowVisible: document.visibilityState === 'visible',
        usedRecentSnapshots,
      })
    ) {
      return
    }
    const previous = lastAcknowledgedSeqRef.current
    lastAcknowledgedSeqRef.current = seq
    void acknowledgeEventsSeenInAppAction(seq)
      .then((result) => {
        if (!result.ok) lastAcknowledgedSeqRef.current = previous
      })
      .catch(() => {
        lastAcknowledgedSeqRef.current = previous
      })
  }, [])

  const refreshNotifications = useCallback(
    async (options?: { force?: boolean; afterPageLoad?: boolean }) => {
      if (!enabled || pollingRef.current) return

      if (options?.force) {
        pollIntervalRef.current = getInitialPollIntervalMs()
        rateLimitedRef.current = false
      }

      const coordinator = coordinatorRef.current
      if (coordinator && !coordinator.getIsLeader() && !options?.force) {
        coordinator.requestPollFromLeader()
        // Si el líder ya no responde (pestaña cerrada sin avisar), `requestPollFromLeader`
        // nos hace líderes y seguimos nosotros con el sondeo.
        if (!coordinator.getIsLeader()) return
      }

      pollingRef.current = true

      try {
        // Con la señal activa, un sondeo programado primero mira (solo Supabase) si hay
        // novedades; si no las hay, se salta la comprobación contra Odoo.
        let signalSeq: number | null = null
        signalModeRef.current = false
        if (!options?.force) {
          const signal = await checkPortalNewsSignalAction()
          portalConnectivityStore.reportPollSuccess()
          if (signal.ok && signal.mode === 'events') {
            signalModeRef.current = true
            signalSeq = signal.seq
            const runFull = shouldRunFullNotificationsCheck({
              signalSeq: signal.seq,
              lastSignalSeq: lastSignalSeqRef.current,
              lastFullCheckAt: lastFullCheckAtRef.current,
              now: Date.now(),
              maxAgeMs: signal.fullCheckMaxAgeMs,
            })
            if (!runFull) {
              pollIntervalRef.current = rateLimitedRef.current
                ? getMaxPollIntervalMs()
                : SIGNAL_POLL_INTERVAL_MS
              acknowledgeSeen(signal.seq, lastCheckUsedRecentSnapshotsRef.current)
              setNotificationsLoading(false)
              return
            }
          }
        }

        const result = await checkPortalNotificationsAction(
          options?.afterPageLoad ? { reuseRecentSnapshots: true } : undefined
        )
        // Llegó respuesta del servidor (aunque sea un error): hay red.
        portalConnectivityStore.reportPollSuccess()
        if (!result.ok) {
          pollIntervalRef.current =
            result.error === 'odoo_rate_limited'
              ? getMaxPollIntervalMs()
              : // Otros fallos (Odoo caído, sesión…): espaciar los reintentos en vez de insistir cada 10 s.
                nextPollIntervalMs(pollIntervalRef.current, false)
          if (result.error === 'odoo_rate_limited') rateLimitedRef.current = true
          return
        }

        // Una comprobación completa que sale bien significa que el 429 ya pasó: sin esto el
        // sondeo se quedaba en el máximo (5 min) hasta que llegara un cambio.
        rateLimitedRef.current = false
        applyPollResult(result, { refreshPages: true })
        lastFullCheckAtRef.current = Date.now()
        if (signalSeq !== null) lastSignalSeqRef.current = signalSeq
        lastCheckUsedRecentSnapshotsRef.current = Boolean(options?.afterPageLoad)
        acknowledgeSeen(signalSeq, Boolean(options?.afterPageLoad))
        // Con la señal, el sondeo es barato (solo Supabase): no se espacia por falta de cambios.
        if (signalModeRef.current && !rateLimitedRef.current) {
          pollIntervalRef.current = SIGNAL_POLL_INTERVAL_MS
        }

        coordinator?.broadcastPollResult({
          sourceTabId: coordinator.getTabId(),
          unread: result.unread,
          readState: result.readState,
          pendingFirmaIds: result.pendingFirmaIds,
          hasChanges: result.hasChanges,
          stats: result.stats,
          polledAt: Date.now(),
        })
      } catch (error) {
        if (!isNetworkFailure(error)) throw error
        portalConnectivityStore.reportPollFailure()
        // Sin red: no insistir cada 10 s; al volver la conexión se sondea de inmediato (`online`).
        pollIntervalRef.current = nextPollIntervalMs(pollIntervalRef.current, false)
      } finally {
        pollingRef.current = false
        setNotificationsLoading(false)
      }
    },
    [acknowledgeSeen, applyPollResult, enabled, setNotificationsLoading]
  )

  const refreshNotificationsPublic = useCallback(
    () => refreshNotifications({ force: true }),
    [refreshNotifications]
  )

  /** Se autoprograma de forma recurrente (setTimeout que vuelve a llamarse a
   * sí mismo) — se referencia vía ref, no por el nombre de su propio
   * `useCallback`, para que cada timeout pendiente siempre dispare la
   * versión más reciente en vez de quedar atado a la que existía cuando se
   * programó. */
  const scheduleNextPollRef = useRef<() => void>(() => {})

  const scheduleNextPoll = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearTimeout(pollTimerRef.current)
    }

    pollTimerRef.current = window.setTimeout(() => {
      pollTimerRef.current = null
      if (document.visibilityState !== 'visible') {
        scheduleNextPollRef.current()
        return
      }

      const coordinator = coordinatorRef.current
      // La pestaña a la vista toma el relevo si el líder está caído o en segundo plano (su latido
      // se ralentiza): si no, con el líder oculto nadie sondeaba.
      if (coordinator && !coordinator.getIsLeader()) coordinator.claimIfStale()
      if (coordinator && !coordinator.getIsLeader()) {
        scheduleNextPollRef.current()
        return
      }

      void refreshNotifications().finally(() => {
        scheduleNextPollRef.current()
      })
    }, pollIntervalRef.current)
  }, [refreshNotifications])

  useEffect(() => {
    scheduleNextPollRef.current = scheduleNextPoll
  })

  useEffect(() => {
    if (!enabled) {
      // Efecto de montaje que arranca/desmonta el coordinador de pestañas
      // (BroadcastChannel) — sistema externo real de punta a punta, no una
      // simple derivación de render.
      setNotificationsLoading(false)
      return
    }

    loadReadStateFromStorage()

    const coordinator = new PortalNotificationsTabCoordinator()
    coordinatorRef.current = coordinator
    coordinator.start()

    const unsubscribePollResult = coordinator.onPollResult((payload) => {
      lastFullCheckAtRef.current = Math.max(lastFullCheckAtRef.current ?? 0, payload.polledAt)
      applyPollResult(
        {
          ok: true,
          unread: payload.unread as PortalNotification[],
          readState: payload.readState,
          pendingFirmaIds: payload.pendingFirmaIds,
          hasChanges: payload.hasChanges,
          stats: payload.stats,
        },
        { fromBroadcast: true, refreshPages: payload.hasChanges }
      )
      setNotificationsLoading(false)
    })

    const unsubscribeStateSync = coordinator.onStateSync((payload) => {
      applyRemoteState(payload)
      setNotificationsLoading(false)
    })

    const unsubscribeRecordMutated = coordinator.onRecordMutated((payload) => {
      if (payload.message) {
        setLastRecordMessage({
          scope: payload.scope,
          recordId: payload.recordId,
          message: payload.message,
        })
      }
      if (shouldRefreshPortalPageOnNotificationPoll(pathnameRef.current)) {
        refreshPortalPages()
      }
    })

    const unsubscribePollRequest = coordinator.onPollRequest(() => {
      void refreshNotifications({ force: true })
    })

    const serverWillSeed = pathnameRef.current === '/dashboard' && !wasSeededFromServer()
    const initialDelay = initialPollDelayMs({
      seededFromServer: wasSeededFromServer(),
      serverWillSeed,
      deferForOpenParam: shouldDeferInitialPoll(),
      intervalMs: getInitialPollIntervalMs(),
    })

    const initialTimer = window.setTimeout(() => {
      // El servidor sembró las novedades durante el margen: repetir la carga
      // ahora sería trabajo doble, el siguiente sondeo es el programado.
      if (serverWillSeed && wasSeededFromServer()) {
        scheduleNextPoll()
        return
      }
      // Primer sondeo tras cargar la página: puede reutilizar lo que el render acaba de leer.
      void refreshNotifications({ afterPageLoad: true }).finally(() => {
        scheduleNextPoll()
      })
    }, initialDelay)

    function handleVisibilityChange() {
      if (document.visibilityState !== 'visible') return
      // Cambiar de pestaña a menudo no debe lanzar una comprobación completa cada vez.
      if (
        !shouldRefreshOnVisible({
          lastFullCheckAt: lastFullCheckAtRef.current,
          now: Date.now(),
          rateLimited: rateLimitedRef.current,
        })
      ) {
        return
      }
      pollIntervalRef.current = getInitialPollIntervalMs()
      void refreshNotifications({ force: true })
    }

    // Al volver la red se sondea ya, sin esperar al intervalo (que tras fallos habría crecido).
    function handleOnline() {
      if (rateLimitedRef.current) return
      pollIntervalRef.current = getInitialPollIntervalMs()
      void refreshNotifications({ force: true })
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('online', handleOnline)

    return () => {
      window.clearTimeout(initialTimer)
      if (pollTimerRef.current !== null) {
        window.clearTimeout(pollTimerRef.current)
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('online', handleOnline)
      unsubscribePollResult()
      unsubscribeStateSync()
      unsubscribeRecordMutated()
      unsubscribePollRequest()
      coordinator.destroy()
      coordinatorRef.current = null
    }
  }, [
    applyPollResult,
    applyRemoteState,
    wasSeededFromServer,
    enabled,
    loadReadStateFromStorage,
    pathnameRef,
    refreshNotifications,
    refreshPortalPages,
    scheduleNextPoll,
    setLastRecordMessage,
    setNotificationsLoading,
  ])

  return {
    refreshNotifications: refreshNotificationsPublic,
    notifyRecordMutated,
    publishStateToOtherTabs,
    resetPollInterval,
  }
}
