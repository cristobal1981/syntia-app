// @vitest-environment jsdom
// Tests del sondeo de avisos y su sincronía entre pestañas. El coordinador (BroadcastChannel) y las
// llamadas al servidor se sustituyen por dobles; los temporizadores van con reloj falso. Las
// referencias y callbacks que se pasan al hook son estables entre renders (ver use-chatter-messages.test.ts).
import { renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchNewsSignal: vi.fn(),
  fetchNotificationsCheck: vi.fn(),
  acknowledge: vi.fn(),
  reportPollSuccess: vi.fn(),
  reportPollFailure: vi.fn(),
  coordinators: [] as FakeCoordinator[],
}))

type Listener = (payload: never) => void

type FakeCoordinator = {
  isLeader: boolean
  start: Mock<(...args: unknown[]) => void>
  destroy: Mock<(...args: unknown[]) => void>
  claimIfStale: Mock<(...args: unknown[]) => void>
  requestPollFromLeader: Mock<(...args: unknown[]) => void>
  broadcastPollResult: Mock<(...args: unknown[]) => void>
  broadcastStateSync: Mock<(...args: unknown[]) => void>
  broadcastRecordMutated: Mock<(...args: unknown[]) => void>
  unsubscribe: Mock<(...args: unknown[]) => void>
  listeners: Record<'pollResult' | 'stateSync' | 'recordMutated' | 'pollRequest', Listener | null>
}

vi.mock('@/src/modules/portal/ui/portal-read-api', () => ({
  fetchNewsSignal: mocks.fetchNewsSignal,
  fetchNotificationsCheck: mocks.fetchNotificationsCheck,
}))

vi.mock('@/src/modules/portal/application/portal-chatter-notifications-actions', () => ({
  acknowledgeEventsSeenInAppAction: mocks.acknowledge,
}))

vi.mock('@/src/modules/portal/ui/portal-connectivity-store', () => ({
  portalConnectivityStore: {
    reportPollSuccess: mocks.reportPollSuccess,
    reportPollFailure: mocks.reportPollFailure,
  },
}))

vi.mock('@/src/modules/portal/infrastructure/portal-notifications-tab-coordinator', () => ({
  PortalNotificationsTabCoordinator: class {
    private readonly fake: FakeCoordinator
    constructor() {
      this.fake = {
        isLeader: true,
        start: vi.fn<(...args: unknown[]) => void>(),
        destroy: vi.fn<(...args: unknown[]) => void>(),
        claimIfStale: vi.fn<(...args: unknown[]) => void>(),
        requestPollFromLeader: vi.fn<(...args: unknown[]) => void>(),
        broadcastPollResult: vi.fn<(...args: unknown[]) => void>(),
        broadcastStateSync: vi.fn<(...args: unknown[]) => void>(),
        broadcastRecordMutated: vi.fn<(...args: unknown[]) => void>(),
        unsubscribe: vi.fn<(...args: unknown[]) => void>(),
        listeners: { pollResult: null, stateSync: null, recordMutated: null, pollRequest: null },
      }
      mocks.coordinators.push(this.fake)
    }
    start() { this.fake.start() }
    destroy() { this.fake.destroy() }
    getTabId() { return 'tab-1' }
    getIsLeader() { return this.fake.isLeader }
    claimIfStale() { this.fake.claimIfStale() }
    requestPollFromLeader() { this.fake.requestPollFromLeader() }
    broadcastPollResult(payload: unknown) { this.fake.broadcastPollResult(payload) }
    broadcastStateSync(payload: unknown) { this.fake.broadcastStateSync(payload) }
    broadcastRecordMutated(payload: unknown) { this.fake.broadcastRecordMutated(payload) }
    private subscribe(key: keyof FakeCoordinator['listeners'], listener: Listener) {
      this.fake.listeners[key] = listener
      return () => this.fake.unsubscribe(key)
    }
    onPollResult(listener: Listener) { return this.subscribe('pollResult', listener) }
    onStateSync(listener: Listener) { return this.subscribe('stateSync', listener) }
    onRecordMutated(listener: Listener) { return this.subscribe('recordMutated', listener) }
    onPollRequest(listener: Listener) { return this.subscribe('pollRequest', listener) }
  },
}))

import type { PortalNotificationsStats } from '@/src/modules/portal/domain/portal-notifications-types'
import { SIGNAL_POLL_INTERVAL_MS } from '@/src/modules/portal/infrastructure/portal-notifications-poll-scheduler'
import { usePortalNotificationsSync } from '@/src/modules/portal/ui/use-portal-notifications-sync'

type SyncArgs = Parameters<typeof usePortalNotificationsSync>[0]

const STATS: PortalNotificationsStats = {
  activeTramitesAndConsultas: 2,
  obligacionesInProgress: 1,
  pendingSignatures: 0,
  nextObligacion: null,
}

const checkResult = (overrides: { hasChanges?: boolean } = {}) => ({
  ok: true as const,
  unread: [],
  readState: {},
  pendingFirmaIds: [7],
  hasChanges: overrides.hasChanges ?? false,
  stats: STATS,
})

const signal = (seq: number, extra: Record<string, unknown> = {}) => ({
  ok: true,
  mode: 'events',
  seq,
  fullCheckMaxAgeMs: 600_000,
  ...extra,
})

function mount(
  options: { enabled?: boolean; pathname?: string; wasSeededFromServer?: () => boolean } = {}
) {
  // Referencias y callbacks estables: si cambiaran en cada render, los efectos del hook no terminarían.
  const args = {
    enabled: options.enabled ?? true,
    pathnameRef: { current: options.pathname ?? '/tramites' },
    pendingFirmaIdsRef: { current: [] as number[] },
    unreadRef: { current: [] },
    readStateRef: { current: {} },
    commitUnread: vi.fn((next: never[]) => next),
    applyReadState: vi.fn(),
    loadReadStateFromStorage: vi.fn(),
    refreshPortalPages: vi.fn(),
    setStats: vi.fn(),
    setLastRecordMessage: vi.fn(),
    setNotificationsLoading: vi.fn(),
    wasSeededFromServer: options.wasSeededFromServer ?? (() => false),
  }
  const view = renderHook(() => usePortalNotificationsSync(args as unknown as SyncArgs))
  return { ...view, args }
}

/** Deja correr el primer sondeo (retardo 0) y lo que encadena. */
async function settle(ms = 0) {
  await vi.advanceTimersByTimeAsync(ms)
}

beforeEach(() => {
  vi.useFakeTimers()
  mocks.coordinators.length = 0
  mocks.fetchNewsSignal.mockResolvedValue(signal(5))
  mocks.fetchNotificationsCheck.mockResolvedValue(checkResult())
  mocks.acknowledge.mockResolvedValue({ ok: true })
  Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'visible' })
})

afterEach(() => {
  vi.useRealTimers()
  vi.resetAllMocks()
})

describe('usePortalNotificationsSync: arranque', () => {
  it('desactivado no crea coordinador ni sondea, y quita el cargando', async () => {
    const { args } = mount({ enabled: false })
    await settle(60_000)

    expect(mocks.coordinators).toHaveLength(0)
    expect(mocks.fetchNewsSignal).not.toHaveBeenCalled()
    expect(mocks.fetchNotificationsCheck).not.toHaveBeenCalled()
    expect(args.setNotificationsLoading).toHaveBeenCalledWith(false)
  })

  it('el primer sondeo reutiliza los snapshots recientes, aplica el resultado y lo retransmite', async () => {
    const { args } = mount()
    await settle()

    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledTimes(1)
    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledWith({ reuseRecentSnapshots: true })
    expect(args.setStats).toHaveBeenCalledWith(STATS)
    expect(args.commitUnread).toHaveBeenCalled()
    expect(args.pendingFirmaIdsRef.current).toEqual([7])
    expect(args.setNotificationsLoading).toHaveBeenCalledWith(false)
    expect(mocks.coordinators[0]!.broadcastPollResult).toHaveBeenCalledWith(
      expect.objectContaining({ sourceTabId: 'tab-1', pendingFirmaIds: [7], hasChanges: false })
    )
  })

  it('con el primer sondeo no avisa al servidor de «visto» (los snapshots pueden ir por detrás)', async () => {
    mount()
    await settle()

    expect(mocks.acknowledge).not.toHaveBeenCalled()
  })

  it('una pestaña que no es líder pide el sondeo al líder y no sondea por su cuenta', async () => {
    mount()
    mocks.coordinators[0]!.isLeader = false
    await settle()

    expect(mocks.coordinators[0]!.requestPollFromLeader).toHaveBeenCalled()
    expect(mocks.fetchNotificationsCheck).not.toHaveBeenCalled()
  })
})

describe('usePortalNotificationsSync: sondeo programado con la señal de eventos', () => {
  it('sin eventos nuevos se salta la comprobación contra Odoo', async () => {
    mount()
    await settle()
    mocks.fetchNotificationsCheck.mockClear()

    await settle(SIGNAL_POLL_INTERVAL_MS)

    expect(mocks.fetchNewsSignal).toHaveBeenCalledTimes(2)
    expect(mocks.fetchNotificationsCheck).not.toHaveBeenCalled()
  })

  it('con eventos nuevos hace la comprobación completa y avisa al servidor del evento visto', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockResolvedValue(signal(6))

    await settle(SIGNAL_POLL_INTERVAL_MS)

    expect(mocks.fetchNotificationsCheck).toHaveBeenLastCalledWith(undefined)
    expect(mocks.acknowledge).toHaveBeenCalledWith(6)
  })

  it('con la ventana oculta no avisa de «visto»', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockResolvedValue(signal(6))
    Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' })

    await settle(SIGNAL_POLL_INTERVAL_MS)

    // Oculta, el sondeo programado ni siquiera se lanza: se reprograma.
    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledTimes(1)
    expect(mocks.acknowledge).not.toHaveBeenCalled()
  })

  it('si lo único nuevo son mensajes, solo relee el chatter', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockResolvedValue(
      signal(6, { eventKinds: { kinds: ['message'], truncated: false } })
    )

    await settle(SIGNAL_POLL_INTERVAL_MS)

    expect(mocks.fetchNotificationsCheck).toHaveBeenLastCalledWith({ chatterOnly: true })
  })

  it('si hay otro tipo de evento además de mensajes, hace la comprobación completa', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockResolvedValue(
      signal(6, { eventKinds: { kinds: ['message', 'status'], truncated: false } })
    )

    await settle(SIGNAL_POLL_INTERVAL_MS)

    expect(mocks.fetchNotificationsCheck).toHaveBeenLastCalledWith(undefined)
  })
})

describe('usePortalNotificationsSync: red de seguridad y reintentos', () => {
  const SHORT_MAX_AGE = 30_000

  it('la comprobación solo de chatter no retrasa la red de seguridad de la completa', async () => {
    mocks.fetchNewsSignal.mockResolvedValue(signal(5, { fullCheckMaxAgeMs: SHORT_MAX_AGE }))
    mount()
    await settle() // t=0: comprobación completa
    mocks.fetchNewsSignal.mockResolvedValue(
      signal(6, { fullCheckMaxAgeMs: SHORT_MAX_AGE, eventKinds: { kinds: ['message'], truncated: false } })
    )
    await settle(SIGNAL_POLL_INTERVAL_MS) // t=10 s: solo chatter
    expect(mocks.fetchNotificationsCheck).toHaveBeenLastCalledWith({ chatterOnly: true })
    await settle(SIGNAL_POLL_INTERVAL_MS) // t=20 s: sin novedades
    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledTimes(2)

    await settle(SIGNAL_POLL_INTERVAL_MS) // t=30 s: la completa del t=0 ya caducó

    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledTimes(3)
    expect(mocks.fetchNotificationsCheck).toHaveBeenLastCalledWith(undefined)
  })

  it('una comprobación completa de otra pestaña retrasa la red de seguridad', async () => {
    mocks.fetchNewsSignal.mockResolvedValue(signal(5, { fullCheckMaxAgeMs: SHORT_MAX_AGE }))
    mount()
    await settle() // t=0: completa propia
    await settle(25_000) // t=25 s: sin novedades

    mocks.coordinators[0]!.listeners.pollResult!({
      unread: [],
      readState: {},
      pendingFirmaIds: [],
      hasChanges: false,
      stats: STATS,
      polledAt: Date.now(),
    } as never)
    await settle(SIGNAL_POLL_INTERVAL_MS) // t=35 s: la propia ya tiene 35 s, la de la otra pestaña 10 s

    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledTimes(1)
  })

  it('si el servidor rechaza el «visto», lo reintenta en el sondeo siguiente', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockResolvedValue(signal(6))
    mocks.acknowledge.mockResolvedValue({ ok: false })

    await settle(SIGNAL_POLL_INTERVAL_MS) // completa con seq 6: avisa y falla
    await settle(SIGNAL_POLL_INTERVAL_MS) // sin novedades: reintenta

    expect(mocks.acknowledge).toHaveBeenCalledTimes(2)
  })

  it('si la petición del «visto» falla, lo reintenta en el sondeo siguiente', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockResolvedValue(signal(6))
    mocks.acknowledge.mockRejectedValue(new Error('sin red'))

    await settle(SIGNAL_POLL_INTERVAL_MS)
    await settle(SIGNAL_POLL_INTERVAL_MS)

    expect(mocks.acknowledge).toHaveBeenCalledTimes(2)
  })

  it('si el «visto» sale bien, no lo repite mientras no haya nada más nuevo', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockResolvedValue(signal(6))

    await settle(SIGNAL_POLL_INTERVAL_MS)
    await settle(SIGNAL_POLL_INTERVAL_MS)

    expect(mocks.acknowledge).toHaveBeenCalledTimes(1)
  })

  it('en el inicio, si el servidor ya sembró las novedades durante el margen, no repite la carga', async () => {
    let seeded = false
    mount({ pathname: '/dashboard', wasSeededFromServer: () => seeded })
    seeded = true

    await settle(2_500) // margen del streaming

    expect(mocks.fetchNewsSignal).not.toHaveBeenCalled()
    expect(mocks.fetchNotificationsCheck).not.toHaveBeenCalled()
  })

  it('en el inicio, si el servidor no sembró nada tras el margen, sondea por su cuenta', async () => {
    mount({ pathname: '/dashboard', wasSeededFromServer: () => false })

    await settle(2_500)

    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledWith({ reuseRecentSnapshots: true })
  })
})

describe('usePortalNotificationsSync: fallos', () => {
  it('con el límite de Odoo no aplica nada ni retransmite', async () => {
    mocks.fetchNotificationsCheck.mockResolvedValue({ ok: false, error: 'odoo_rate_limited' })
    const { args } = mount()
    await settle()

    expect(args.setStats).not.toHaveBeenCalled()
    expect(args.commitUnread).not.toHaveBeenCalled()
    expect(mocks.coordinators[0]!.broadcastPollResult).not.toHaveBeenCalled()
    expect(args.setNotificationsLoading).toHaveBeenCalledWith(false)
  })

  it('sin red lo anota como fallo de conectividad y no revienta', async () => {
    mocks.fetchNewsSignal.mockRejectedValue(new TypeError('Failed to fetch'))
    const { args } = mount()
    await settle()

    expect(mocks.reportPollFailure).toHaveBeenCalled()
    expect(args.commitUnread).not.toHaveBeenCalled()
    expect(args.setNotificationsLoading).toHaveBeenCalledWith(false)
  })

  it('un error que no es de red se propaga', async () => {
    mocks.fetchNewsSignal.mockRejectedValue(new Error('boom'))
    const rejections: unknown[] = []
    const onRejection = (reason: unknown) => rejections.push(reason)
    process.on('unhandledRejection', onRejection)
    try {
      mount()
      await settle()
    } finally {
      process.off('unhandledRejection', onRejection)
    }

    expect(mocks.reportPollFailure).not.toHaveBeenCalled()
  })
})

describe('usePortalNotificationsSync: otras pestañas', () => {
  it('aplica el resultado que retransmite el líder sin sondear', async () => {
    const { args } = mount()
    await settle()
    mocks.fetchNotificationsCheck.mockClear()
    args.commitUnread.mockClear()

    mocks.coordinators[0]!.listeners.pollResult!({
      unread: [],
      readState: {},
      pendingFirmaIds: [9],
      hasChanges: true,
      stats: STATS,
      polledAt: Date.now(),
    } as never)

    expect(args.pendingFirmaIdsRef.current).toEqual([9])
    expect(args.commitUnread).toHaveBeenCalled()
    expect(args.refreshPortalPages).toHaveBeenCalled()
    expect(mocks.fetchNotificationsCheck).not.toHaveBeenCalled()
    expect(mocks.coordinators[0]!.broadcastPollResult).toHaveBeenCalledTimes(1)
  })

  it('un resultado retransmitido sin cambios no repinta la página', async () => {
    const { args } = mount()
    await settle()

    mocks.coordinators[0]!.listeners.pollResult!({
      unread: [],
      readState: {},
      pendingFirmaIds: [],
      hasChanges: false,
      stats: STATS,
      polledAt: Date.now(),
    } as never)

    expect(args.refreshPortalPages).not.toHaveBeenCalled()
  })

  it('el resultado de otra pestaña cuenta como comprobación completa reciente', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockResolvedValue(signal(6))
    mocks.coordinators[0]!.listeners.pollResult!({
      unread: [],
      readState: {},
      pendingFirmaIds: [],
      hasChanges: false,
      stats: STATS,
      polledAt: Date.now() + 1,
    } as never)

    // Evento nuevo (seq 6) y solo mensajes: con la comprobación reciente basta con el chatter.
    mocks.fetchNewsSignal.mockResolvedValue(
      signal(6, { eventKinds: { kinds: ['message'], truncated: false } })
    )
    await settle(SIGNAL_POLL_INTERVAL_MS)

    expect(mocks.fetchNotificationsCheck).toHaveBeenLastCalledWith({ chatterOnly: true })
  })

  it('un estado compartido por otra pestaña se aplica entero', async () => {
    const { args } = mount()
    await settle()
    args.commitUnread.mockClear()

    mocks.coordinators[0]!.listeners.stateSync!({
      unread: [],
      readState: { 'tramite:1': 5 },
      pendingFirmaIds: [3],
    } as never)

    expect(args.pendingFirmaIdsRef.current).toEqual([3])
    expect(args.applyReadState).toHaveBeenCalledWith({ 'tramite:1': 5 })
    expect(args.commitUnread).toHaveBeenCalled()
  })

  it('un mensaje enviado desde otra pestaña llega al drawer y repinta la página', async () => {
    const { args } = mount()
    await settle()
    const message = { id: 1 }

    mocks.coordinators[0]!.listeners.recordMutated!({
      scope: 'tramite',
      recordId: 4,
      message,
    } as never)

    expect(args.setLastRecordMessage).toHaveBeenCalledWith({ scope: 'tramite', recordId: 4, message })
    expect(args.refreshPortalPages).toHaveBeenCalled()
  })

  it('en las guías (contenido estático) no repinta la página', async () => {
    const { args } = mount({ pathname: '/guias/algo' })
    await settle()

    mocks.coordinators[0]!.listeners.recordMutated!({ scope: 'tramite', recordId: 4 } as never)

    expect(args.refreshPortalPages).not.toHaveBeenCalled()
    expect(args.setLastRecordMessage).not.toHaveBeenCalled()
  })

  it('una petición de sondeo de otra pestaña fuerza la comprobación', async () => {
    mount()
    await settle()
    mocks.fetchNewsSignal.mockClear()
    mocks.fetchNotificationsCheck.mockClear()

    mocks.coordinators[0]!.listeners.pollRequest!(undefined as never)
    await settle()

    // Forzado: sin pasar por la señal, comprobación completa.
    expect(mocks.fetchNewsSignal).not.toHaveBeenCalled()
    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledWith(undefined)
  })
})

describe('usePortalNotificationsSync: acciones y limpieza', () => {
  it('«actualizar» fuerza una comprobación completa sin mirar la señal', async () => {
    const { result } = mount()
    await settle()
    mocks.fetchNewsSignal.mockClear()
    mocks.fetchNotificationsCheck.mockClear()

    await result.current.refreshNotifications()

    expect(mocks.fetchNewsSignal).not.toHaveBeenCalled()
    expect(mocks.fetchNotificationsCheck).toHaveBeenCalledWith(undefined)
  })

  it('publica el estado a las demás pestañas sin las firmas ya resueltas', async () => {
    const { result, args } = mount()
    await settle()
    args.pendingFirmaIdsRef.current = [1]

    result.current.publishStateToOtherTabs([])

    expect(mocks.coordinators[0]!.broadcastStateSync).toHaveBeenCalledWith({
      sourceTabId: 'tab-1',
      unread: [],
      readState: {},
      pendingFirmaIds: [1],
    })
  })

  it('avisa a las demás pestañas de un registro modificado', async () => {
    const { result } = mount()
    await settle()

    result.current.notifyRecordMutated('consulta', 8)

    expect(mocks.coordinators[0]!.broadcastRecordMutated).toHaveBeenCalledWith({
      sourceTabId: 'tab-1',
      scope: 'consulta',
      recordId: 8,
    })
  })

  it('al desmontar destruye el coordinador, se da de baja de todo y no vuelve a sondear', async () => {
    const view = mount()
    await settle()
    mocks.fetchNewsSignal.mockClear()

    view.unmount()
    await settle(600_000)

    expect(mocks.coordinators[0]!.destroy).toHaveBeenCalled()
    expect(mocks.coordinators[0]!.unsubscribe).toHaveBeenCalledTimes(4)
    expect(mocks.fetchNewsSignal).not.toHaveBeenCalled()
  })
})
