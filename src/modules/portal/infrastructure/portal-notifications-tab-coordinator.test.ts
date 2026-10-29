// @vitest-environment jsdom
// El coordinador es una clase, no un hook: varias instancias en la misma ventana hacen de varias
// pestañas. `BroadcastChannel` se sustituye por un bus en memoria (las pestañas reales comparten
// canal y `localStorage`; aquí las instancias comparten ambos). El evento `storage` no se dispara
// en la misma ventana, así que se lanza a mano.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  PortalNotificationsTabCoordinator,
  type PortalNotificationsPollPayload,
} from '@/src/modules/portal/infrastructure/portal-notifications-tab-coordinator'

const LEADER_KEY = 'syntia-notifications-leader'
const HEARTBEAT_MS = 10_000
const STALE_MS = 25_000

class FakeChannel {
  static all: FakeChannel[] = []
  closed = false
  private listeners: ((event: MessageEvent) => void)[] = []

  constructor(readonly name: string) {
    FakeChannel.all.push(this)
  }

  addEventListener(_type: 'message', listener: (event: MessageEvent) => void) {
    this.listeners.push(listener)
  }

  postMessage(data: unknown) {
    for (const other of FakeChannel.all) {
      if (other === this || other.closed || other.name !== this.name) continue
      for (const listener of other.listeners) listener({ data } as MessageEvent)
    }
  }

  /** Entrega un mensaje a esta pestaña como si lo hubiera mandado otra. */
  deliver(data: unknown) {
    for (const listener of this.listeners) listener({ data } as MessageEvent)
  }

  close() {
    this.closed = true
  }
}

const STATS = {
  activeTramitesAndConsultas: 0,
  obligacionesInProgress: 0,
  pendingSignatures: 0,
  nextObligacion: null,
}

const pollPayload = (sourceTabId: string): PortalNotificationsPollPayload => ({
  sourceTabId,
  unread: [],
  readState: {},
  pendingFirmaIds: [],
  hasChanges: true,
  polledAt: 1,
  stats: STATS,
})

const tabs: PortalNotificationsTabCoordinator[] = []

function openTab() {
  const tab = new PortalNotificationsTabCoordinator()
  tabs.push(tab)
  return tab
}

/** El canal de una pestaña, para inyectarle mensajes. */
function channelOf(tab: PortalNotificationsTabCoordinator) {
  return FakeChannel.all[tabs.indexOf(tab)]!
}

function storedLeader(): { tabId: string; at: number } | null {
  const raw = localStorage.getItem(LEADER_KEY)
  return raw ? JSON.parse(raw) : null
}

/** Envejece el registro del líder: como si esa pestaña llevara `ms` sin latido (congelada o dormida). */
function ageLeader(ms: number) {
  const record = storedLeader()!
  localStorage.setItem(LEADER_KEY, JSON.stringify({ ...record, at: Date.now() - ms }))
}

function fireStorage(key: string | null) {
  window.dispatchEvent(new StorageEvent('storage', { key }))
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-10-29T10:00:00Z'))
  localStorage.clear()
  FakeChannel.all = []
  tabs.length = 0
  vi.stubGlobal('BroadcastChannel', FakeChannel)
})

afterEach(() => {
  for (const tab of tabs) tab.destroy()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('liderazgo', () => {
  it('la primera pestaña se hace líder y lo deja escrito', () => {
    const tab = openTab()
    expect(tab.getIsLeader()).toBe(false)

    tab.start()

    expect(tab.getIsLeader()).toBe(true)
    expect(storedLeader()).toEqual({ tabId: tab.getTabId(), at: Date.now() })
  })

  it('con un líder reciente, la segunda pestaña no lo es', () => {
    const first = openTab()
    first.start()
    const second = openTab()
    second.start()

    expect(second.getIsLeader()).toBe(false)
    expect(first.getIsLeader()).toBe(true)
    expect(storedLeader()!.tabId).toBe(first.getTabId())
  })

  it('cada pestaña tiene su propio id', () => {
    expect(openTab().getTabId()).not.toBe(openTab().getTabId())
  })

  it('un líder que lleva más de 25 s sin latido se puede relevar, y el viejo deja de serlo', () => {
    const old = openTab()
    old.start()
    ageLeader(STALE_MS + 1)

    const next = openTab()
    next.start()

    expect(next.getIsLeader()).toBe(true)
    expect(old.getIsLeader()).toBe(false)
    expect(storedLeader()!.tabId).toBe(next.getTabId())
  })

  it('un líder justo en el límite de 25 s todavía no se releva', () => {
    const old = openTab()
    old.start()
    ageLeader(STALE_MS)

    const next = openTab()
    next.start()

    expect(next.getIsLeader()).toBe(false)
  })

  it('claimIfStale solo releva a un líder caducado', () => {
    const leader = openTab()
    leader.start()
    const viewer = openTab()
    viewer.start()

    viewer.claimIfStale()
    expect(viewer.getIsLeader()).toBe(false)

    ageLeader(STALE_MS + 1)
    viewer.claimIfStale()
    expect(viewer.getIsLeader()).toBe(true)
    expect(leader.getIsLeader()).toBe(false)
  })

  it('el líder renueva el registro cada 10 s y deja de hacerlo al perder el relevo', () => {
    const leader = openTab()
    leader.start()
    const start = Date.now()

    vi.advanceTimersByTime(HEARTBEAT_MS)
    expect(storedLeader()).toEqual({ tabId: leader.getTabId(), at: start + HEARTBEAT_MS })

    // Otra pestaña toma el relevo: el viejo líder ya no escribe.
    const other = openTab()
    channelOf(leader).deliver({ type: 'leader-claim', tabId: other.getTabId() })
    expect(leader.getIsLeader()).toBe(false)
    const before = localStorage.getItem(LEADER_KEY)
    vi.advanceTimersByTime(HEARTBEAT_MS * 3)
    expect(localStorage.getItem(LEADER_KEY)).toBe(before)
  })

  it('el latido no sobrescribe el registro si la pestaña ya no es líder', () => {
    const leader = openTab()
    leader.start()
    channelOf(leader).deliver({ type: 'leader-claim', tabId: 'otra' })
    localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: 'otra', at: Date.now() }))

    vi.advanceTimersByTime(HEARTBEAT_MS * 2)

    expect(storedLeader()!.tabId).toBe('otra')
  })

  it('un registro corrupto o incompleto cuenta como caducado', () => {
    for (const raw of ['no es json', '{}', JSON.stringify({ tabId: 'x' }), JSON.stringify({ at: 5 })]) {
      localStorage.setItem(LEADER_KEY, raw)
      const tab = openTab()
      tab.start()
      expect(tab.getIsLeader()).toBe(true)
      tab.destroy()
    }
  })

  it('una pestaña que perdió el relevo pero sigue siendo la del registro lo recupera', () => {
    const tab = openTab()
    tab.start()
    channelOf(tab).deliver({ type: 'leader-claim', tabId: 'otra' })
    expect(tab.getIsLeader()).toBe(false)

    tab.claimIfStale()

    expect(tab.getIsLeader()).toBe(true)
  })

  it('un aviso de relevo con el id de la propia pestaña no la deja sin liderazgo', () => {
    const tab = openTab()
    tab.start()

    channelOf(tab).deliver({ type: 'leader-claim', tabId: tab.getTabId() })

    expect(tab.getIsLeader()).toBe(true)
  })

  it('una pestaña que no es líder ignora una retirada con su propio id', () => {
    const tab = openTab()

    channelOf(tab).deliver({ type: 'leader-resign', tabId: tab.getTabId() })

    expect(tab.getIsLeader()).toBe(false)
  })

  it('una retirada de otra pestaña sin líder vigente hace que esta lo sea', () => {
    const tab = openTab()

    channelOf(tab).deliver({ type: 'leader-resign', tabId: 'otra' })

    expect(tab.getIsLeader()).toBe(true)
  })

  it('una pestaña que ya es líder no vuelve a reclamar el liderazgo', () => {
    const leader = openTab()
    leader.start()
    const posts = vi.spyOn(channelOf(leader), 'postMessage')

    leader.start()
    leader.claimIfStale()

    expect(posts).not.toHaveBeenCalled()
  })
})

describe('relevo al cerrar', () => {
  it('el líder que se destruye borra su registro y avisa: otra pestaña toma el relevo', () => {
    const leader = openTab()
    leader.start()
    const viewer = openTab()
    viewer.start()

    leader.destroy()

    expect(leader.getIsLeader()).toBe(false)
    expect(viewer.getIsLeader()).toBe(true)
    expect(storedLeader()!.tabId).toBe(viewer.getTabId())
  })

  it('una pestaña que no es líder no borra el registro del líder al destruirse', () => {
    const leader = openTab()
    leader.start()
    const viewer = openTab()
    viewer.start()

    viewer.destroy()

    expect(storedLeader()!.tabId).toBe(leader.getTabId())
    expect(leader.getIsLeader()).toBe(true)
  })

  it('no borra el registro si ya es de otra pestaña', () => {
    const leader = openTab()
    leader.start()
    localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: 'otra', at: Date.now() }))

    leader.destroy()

    expect(storedLeader()!.tabId).toBe('otra')
  })

  it('al cerrar la ventana (beforeunload) el líder borra su registro', () => {
    const leader = openTab()
    leader.start()

    window.dispatchEvent(new Event('beforeunload'))

    expect(leader.getIsLeader()).toBe(false)
    expect(storedLeader()).toBeNull()
  })

  it('al cerrar la ventana (beforeunload) una pestaña que no es líder no toca el registro', () => {
    localStorage.setItem(LEADER_KEY, JSON.stringify({ tabId: 'otra', at: Date.now() }))
    const viewer = openTab()
    viewer.start()

    window.dispatchEvent(new Event('beforeunload'))

    expect(storedLeader()!.tabId).toBe('otra')
  })

  it('el evento storage del registro de líder hace que un visor tome el relevo si no queda líder', () => {
    const leader = openTab()
    leader.start()
    const viewer = openTab()
    viewer.start()
    ageLeader(STALE_MS + 1)

    fireStorage(LEADER_KEY)

    expect(viewer.getIsLeader()).toBe(true)
  })

  it('el evento storage de otra clave se ignora', () => {
    const leader = openTab()
    leader.start()
    const viewer = openTab()
    viewer.start()
    ageLeader(STALE_MS + 1)

    fireStorage('otra-clave')

    expect(viewer.getIsLeader()).toBe(false)
  })

  it('tras destruirse, una pestaña ya no reacciona a storage ni a beforeunload', () => {
    const viewer = openTab()
    viewer.start()
    viewer.destroy()
    localStorage.clear()

    fireStorage(LEADER_KEY)

    expect(viewer.getIsLeader()).toBe(false)
    expect(storedLeader()).toBeNull()
  })

  it('al destruirse quita sus oyentes de la ventana', () => {
    const remove = vi.spyOn(window, 'removeEventListener')
    const tab = openTab()

    tab.destroy()

    expect(remove).toHaveBeenCalledWith('storage', expect.any(Function))
    expect(remove).toHaveBeenCalledWith('beforeunload', expect.any(Function))
  })

  it('tras destruirse, deja de emitir y cierra el canal', () => {
    const tab = openTab()
    tab.start()
    const other = openTab()
    const received = vi.fn()
    other.onPollResult(received)

    tab.destroy()
    tab.broadcastPollResult(pollPayload(tab.getTabId()))

    expect(received).not.toHaveBeenCalled()
    expect(channelOf(tab).closed).toBe(true)
  })
})

describe('mensajes entre pestañas', () => {
  it('un resultado de sondeo llega a las demás pestañas y no a la que lo manda', () => {
    const a = openTab()
    const b = openTab()
    const c = openTab()
    const onA = vi.fn()
    const onB = vi.fn()
    const onC = vi.fn()
    a.onPollResult(onA)
    b.onPollResult(onB)
    c.onPollResult(onC)

    const payload = pollPayload(a.getTabId())
    a.broadcastPollResult(payload)

    expect(onA).not.toHaveBeenCalled()
    expect(onB).toHaveBeenCalledWith(payload)
    expect(onC).toHaveBeenCalledWith(payload)
  })

  it('un mensaje con el id de la propia pestaña se descarta aunque llegue', () => {
    const tab = openTab()
    const onPoll = vi.fn()
    const onState = vi.fn()
    const onMutated = vi.fn()
    tab.onPollResult(onPoll)
    tab.onStateSync(onState)
    tab.onRecordMutated(onMutated)
    const id = tab.getTabId()

    channelOf(tab).deliver({ type: 'poll-result', payload: pollPayload(id) })
    channelOf(tab).deliver({
      type: 'state-sync',
      payload: { sourceTabId: id, unread: [], readState: {}, pendingFirmaIds: [] },
    })
    channelOf(tab).deliver({
      type: 'record-mutated',
      payload: { sourceTabId: id, scope: 'tramite', recordId: 1 },
    })

    expect(onPoll).not.toHaveBeenCalled()
    expect(onState).not.toHaveBeenCalled()
    expect(onMutated).not.toHaveBeenCalled()
  })

  it('el estado compartido y los registros modificados llegan a las otras pestañas, con su mensaje', () => {
    const a = openTab()
    const b = openTab()
    const onState = vi.fn()
    const onMutated = vi.fn()
    b.onStateSync(onState)
    b.onRecordMutated(onMutated)

    const state = {
      sourceTabId: a.getTabId(),
      unread: [],
      readState: { 'tramite:1': 3 },
      pendingFirmaIds: [2],
    }
    const mutated = {
      sourceTabId: a.getTabId(),
      scope: 'consulta' as const,
      recordId: 9,
      message: { id: 5 } as never,
    }
    a.broadcastStateSync(state)
    a.broadcastRecordMutated(mutated)

    expect(onState).toHaveBeenCalledWith(state)
    expect(onMutated).toHaveBeenCalledWith(mutated)
  })

  it('cada tipo de mensaje solo llega a sus oyentes', () => {
    const a = openTab()
    const b = openTab()
    const onPoll = vi.fn()
    const onState = vi.fn()
    const onMutated = vi.fn()
    b.onPollResult(onPoll)
    b.onStateSync(onState)
    b.onRecordMutated(onMutated)

    a.broadcastStateSync({ sourceTabId: a.getTabId(), unread: [], readState: {}, pendingFirmaIds: [] })

    expect(onState).toHaveBeenCalledTimes(1)
    expect(onPoll).not.toHaveBeenCalled()
    expect(onMutated).not.toHaveBeenCalled()
  })

  it('darse de baja de un oyente deja de entregarle mensajes', () => {
    const a = openTab()
    const b = openTab()
    const onPoll = vi.fn()
    const onState = vi.fn()
    const onMutated = vi.fn()
    const offPoll = b.onPollResult(onPoll)
    const offState = b.onStateSync(onState)
    const offMutated = b.onRecordMutated(onMutated)
    offPoll()
    offState()
    offMutated()

    a.broadcastPollResult(pollPayload(a.getTabId()))
    a.broadcastStateSync({ sourceTabId: a.getTabId(), unread: [], readState: {}, pendingFirmaIds: [] })
    a.broadcastRecordMutated({ sourceTabId: a.getTabId(), scope: 'tramite', recordId: 1 })

    expect(onPoll).not.toHaveBeenCalled()
    expect(onState).not.toHaveBeenCalled()
    expect(onMutated).not.toHaveBeenCalled()
  })

  it('varios oyentes del mismo tipo reciben todos el mensaje', () => {
    const a = openTab()
    const b = openTab()
    const first = vi.fn()
    const second = vi.fn()
    b.onPollResult(first)
    b.onPollResult(second)

    a.broadcastPollResult(pollPayload(a.getTabId()))

    expect(first).toHaveBeenCalledTimes(1)
    expect(second).toHaveBeenCalledTimes(1)
  })

  it('un mensaje vacío o desconocido no rompe nada', () => {
    const tab = openTab()
    tab.start()

    expect(() => {
      channelOf(tab).deliver(undefined)
      channelOf(tab).deliver({ type: 'raro' })
    }).not.toThrow()
    expect(tab.getIsLeader()).toBe(true)
  })
})

describe('petición de sondeo al líder', () => {
  it('el visor pide el sondeo y solo el líder lo recibe', () => {
    const leader = openTab()
    leader.start()
    const viewer = openTab()
    viewer.start()
    const third = openTab()
    third.start()
    const onLeader = vi.fn()
    const onViewer = vi.fn()
    const onThird = vi.fn()
    leader.onPollRequest(onLeader)
    viewer.onPollRequest(onViewer)
    third.onPollRequest(onThird)

    viewer.requestPollFromLeader()

    expect(onLeader).toHaveBeenCalledTimes(1)
    expect(onViewer).not.toHaveBeenCalled()
    expect(onThird).not.toHaveBeenCalled()
    expect(viewer.getIsLeader()).toBe(false)
  })

  it('si el líder ya no responde, el que pide se hace líder', () => {
    const leader = openTab()
    leader.start()
    const viewer = openTab()
    viewer.start()
    ageLeader(STALE_MS + 1)

    viewer.requestPollFromLeader()

    expect(viewer.getIsLeader()).toBe(true)
    expect(leader.getIsLeader()).toBe(false)
  })

  it('el líder no se pide el sondeo a sí mismo', () => {
    const leader = openTab()
    leader.start()
    const other = openTab()
    const onOther = vi.fn()
    other.onPollRequest(onOther)
    const posts = vi.spyOn(channelOf(leader), 'postMessage')

    leader.requestPollFromLeader()

    expect(posts).not.toHaveBeenCalled()
    expect(onOther).not.toHaveBeenCalled()
  })

  it('darse de baja de la petición deja de avisar al líder', () => {
    const leader = openTab()
    leader.start()
    const viewer = openTab()
    viewer.start()
    const onLeader = vi.fn()
    const off = leader.onPollRequest(onLeader)
    off()

    viewer.requestPollFromLeader()

    expect(onLeader).not.toHaveBeenCalled()
  })
})

describe('sin BroadcastChannel', () => {
  it('sigue funcionando como pestaña única: es líder y emitir no falla', () => {
    vi.unstubAllGlobals()
    vi.stubGlobal('BroadcastChannel', undefined)
    const tab = openTab()

    tab.start()

    expect(tab.getIsLeader()).toBe(true)
    expect(() => {
      tab.broadcastPollResult(pollPayload(tab.getTabId()))
      tab.requestPollFromLeader()
    }).not.toThrow()
  })

  it('usa el canal con el nombre del portal', () => {
    openTab()
    expect(FakeChannel.all[0]!.name).toBe('syntia-portal-notifications')
  })
})
