import type { PortalChatterMessage } from '@/src/modules/portal/domain/portal-chatter-types'
import type { PortalNotificationsStats } from '@/src/modules/portal/domain/portal-notifications-types'

const CHANNEL_NAME = 'syntia-portal-notifications'
const LEADER_STORAGE_KEY = 'syntia-notifications-leader'
const HEARTBEAT_MS = 10_000
const LEADER_STALE_MS = 25_000

export type PortalNotificationsPollPayload = {
  sourceTabId: string
  unread: unknown[]
  readState: Record<string, number>
  pendingFirmaIds: number[]
  hasChanges: boolean
  polledAt: number
  stats: PortalNotificationsStats
}

export type PortalNotificationsStateSyncPayload = {
  sourceTabId: string
  unread: unknown[]
  readState: Record<string, number>
  pendingFirmaIds: number[]
}

/** Un registro cambió por una acción propia de esta pestaña (subida, mensaje). */
export type PortalRecordMutatedPayload = {
  sourceTabId: string
  scope: 'tramite' | 'consulta' | 'obligacion'
  recordId: number
  /**
   * Cuando la mutación fue un mensaje de chat, se adjunta el mensaje ya
   * construido (la pestaña que lo envió lo tiene en memoria) para que un
   * chat abierto en otra pestaña lo pinte directamente, sin pedir nada
   * nuevo a Odoo.
   */
  message?: PortalChatterMessage
}

type CoordinatorMessage =
  | { type: 'poll-result'; payload: PortalNotificationsPollPayload }
  | { type: 'state-sync'; payload: PortalNotificationsStateSyncPayload }
  | { type: 'record-mutated'; payload: PortalRecordMutatedPayload }
  | { type: 'request-poll' }
  | { type: 'leader-claim'; tabId: string }
  | { type: 'leader-resign'; tabId: string }

type PollResultListener = (payload: PortalNotificationsPollPayload) => void
type StateSyncListener = (payload: PortalNotificationsStateSyncPayload) => void
type RecordMutatedListener = (payload: PortalRecordMutatedPayload) => void
type PollRequestListener = () => void

function createTabId(): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID()
  }
  return `tab-${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function readLeaderRecord(): { tabId: string; at: number } | null {
  if (typeof window === 'undefined') return null
  try {
    const raw = localStorage.getItem(LEADER_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as { tabId?: string; at?: number }
    if (!parsed.tabId || typeof parsed.at !== 'number') return null
    return { tabId: parsed.tabId, at: parsed.at }
  } catch {
    return null
  }
}

function writeLeaderRecord(tabId: string) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(
      LEADER_STORAGE_KEY,
      JSON.stringify({ tabId, at: Date.now() })
    )
  } catch {
    // ignore quota errors
  }
}

export class PortalNotificationsTabCoordinator {
  private readonly tabId = createTabId()
  private readonly channel: BroadcastChannel | null
  private closed = false
  private isLeader = false
  private heartbeatTimer: number | null = null
  private pollResultListeners = new Set<PollResultListener>()
  private stateSyncListeners = new Set<StateSyncListener>()
  private recordMutatedListeners = new Set<RecordMutatedListener>()
  private pollRequestListeners = new Set<PollRequestListener>()

  constructor() {
    this.channel =
      typeof BroadcastChannel !== 'undefined'
        ? new BroadcastChannel(CHANNEL_NAME)
        : null

    this.channel?.addEventListener('message', (event: MessageEvent<CoordinatorMessage>) => {
      this.handleMessage(event.data)
    })

    window.addEventListener('storage', this.handleStorageChange)
    window.addEventListener('beforeunload', this.handleBeforeUnload)
  }

  private handleStorageChange = (event: StorageEvent) => {
    if (event.key !== LEADER_STORAGE_KEY) return
    if (this.isLeader) return
    this.tryBecomeLeader()
  }

  private handleBeforeUnload = () => {
    if (!this.isLeader) return
    this.resignLeadership()
  }

  private handleMessage(message: CoordinatorMessage | undefined) {
    if (!message) return

    if (message.type === 'poll-result') {
      if (message.payload.sourceTabId === this.tabId) return
      for (const listener of this.pollResultListeners) {
        listener(message.payload)
      }
      return
    }

    if (message.type === 'state-sync') {
      if (message.payload.sourceTabId === this.tabId) return
      for (const listener of this.stateSyncListeners) {
        listener(message.payload)
      }
      return
    }

    if (message.type === 'record-mutated') {
      if (message.payload.sourceTabId === this.tabId) return
      for (const listener of this.recordMutatedListeners) {
        listener(message.payload)
      }
      return
    }

    if (message.type === 'request-poll' && this.isLeader) {
      for (const listener of this.pollRequestListeners) {
        listener()
      }
      return
    }

    if (message.type === 'leader-resign' && message.tabId !== this.tabId) {
      this.tryBecomeLeader()
    }
  }

  start() {
    this.tryBecomeLeader()
  }

  destroy() {
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }
    this.resignLeadership()
    window.removeEventListener('storage', this.handleStorageChange)
    window.removeEventListener('beforeunload', this.handleBeforeUnload)
    this.closed = true
    this.channel?.close()
  }

  getTabId(): string {
    return this.tabId
  }

  getIsLeader(): boolean {
    return this.isLeader
  }

  onPollResult(listener: PollResultListener): () => void {
    this.pollResultListeners.add(listener)
    return () => {
      this.pollResultListeners.delete(listener)
    }
  }

  onStateSync(listener: StateSyncListener): () => void {
    this.stateSyncListeners.add(listener)
    return () => {
      this.stateSyncListeners.delete(listener)
    }
  }

  onRecordMutated(listener: RecordMutatedListener): () => void {
    this.recordMutatedListeners.add(listener)
    return () => {
      this.recordMutatedListeners.delete(listener)
    }
  }

  onPollRequest(listener: PollRequestListener): () => void {
    this.pollRequestListeners.add(listener)
    return () => {
      this.pollRequestListeners.delete(listener)
    }
  }

  private post(message: CoordinatorMessage) {
    if (this.closed) return
    this.channel?.postMessage(message)
  }

  broadcastPollResult(payload: PortalNotificationsPollPayload) {
    this.post({
      type: 'poll-result',
      payload,
    } satisfies CoordinatorMessage)
  }

  broadcastStateSync(payload: PortalNotificationsStateSyncPayload) {
    this.post({
      type: 'state-sync',
      payload,
    } satisfies CoordinatorMessage)
  }

  broadcastRecordMutated(payload: PortalRecordMutatedPayload) {
    this.post({
      type: 'record-mutated',
      payload,
    } satisfies CoordinatorMessage)
  }

  requestPollFromLeader() {
    if (this.isLeader) return
    this.post({ type: 'request-poll' } satisfies CoordinatorMessage)
    this.tryBecomeLeader()
  }

  private tryBecomeLeader() {
    if (this.isLeader) return

    const current = readLeaderRecord()
    const stale = !current || Date.now() - current.at > LEADER_STALE_MS

    if (!stale && current.tabId !== this.tabId) {
      return
    }

    this.isLeader = true
    writeLeaderRecord(this.tabId)
    this.post({
      type: 'leader-claim',
      tabId: this.tabId,
    } satisfies CoordinatorMessage)

    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
    }

    this.heartbeatTimer = window.setInterval(() => {
      if (!this.isLeader) return
      writeLeaderRecord(this.tabId)
    }, HEARTBEAT_MS)
  }

  private resignLeadership() {
    if (!this.isLeader) return

    const current = readLeaderRecord()
    if (current?.tabId === this.tabId) {
      localStorage.removeItem(LEADER_STORAGE_KEY)
    }

    this.isLeader = false
    if (this.heartbeatTimer !== null) {
      window.clearInterval(this.heartbeatTimer)
      this.heartbeatTimer = null
    }

    this.post({
      type: 'leader-resign',
      tabId: this.tabId,
    } satisfies CoordinatorMessage)
  }
}
