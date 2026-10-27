import { beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import {
  ackPortalNotificationAction,
  checkPortalNewsSignalAction,
  checkPortalNotificationsAction,
  markChatterConversationSeenAction,
} from '@/src/modules/portal/application/portal-chatter-notifications-actions'
import {
  acknowledgeTramiteListItemSeenAction,
  acknowledgeTramitesListSeenAction,
} from '@/src/modules/tramites/application/tramites-list-seen-actions'

/**
 * Garantía de producto: entrar como cliente («vista como cliente») nunca
 * consume los avisos del cliente. Aquí NO se simula `getSession`: se usa el
 * real, con `applyViewAs`, y solo se falsean las cookies, la cabecera
 * `next-action` de una Server Action y el almacenamiento. Si una acción de
 * «visto» ganara `allowViewAsRead`, o `getSession` dejara de negar las
 * Server Actions bajo la vista, estos tests fallan.
 */

const {
  cookieValues,
  requestHeaders,
  getSessionFromToken,
  getViewAsFromToken,
  fetchViewAsClient,
  resolveDirectoryActorId,
  loadClientPortalNotifications,
  fetchChatterReadStateForUser,
  upsertChatterReadState,
  fetchWatchStateForUser,
  upsertWatchStateBatch,
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
  resolveWatchableAckStateFromSnapshots,
  verifyClientRecordAccess,
  resolveClientOdooPartnerId,
  getMaxPortalEventSeqForPartner,
} = vi.hoisted(() => ({
  cookieValues: new Map<string, string>(),
  requestHeaders: new Map<string, string>(),
  getSessionFromToken: vi.fn(),
  getViewAsFromToken: vi.fn(),
  fetchViewAsClient: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  loadClientPortalNotifications: vi.fn(),
  fetchChatterReadStateForUser: vi.fn(),
  upsertChatterReadState: vi.fn(),
  fetchWatchStateForUser: vi.fn(),
  upsertWatchStateBatch: vi.fn(),
  fetchTramitesListSeenState: vi.fn(),
  upsertTramitesListSeenState: vi.fn(),
  resolveWatchableAckStateFromSnapshots: vi.fn(),
  verifyClientRecordAccess: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  getMaxPortalEventSeqForPartner: vi.fn(),
}))

vi.mock('next/headers', () => ({
  cookies: async () => ({
    get: (name: string) => {
      const value = cookieValues.get(name)
      return value === undefined ? undefined : { name, value }
    },
  }),
  headers: async () => ({ get: (name: string) => requestHeaders.get(name) ?? null }),
}))
vi.mock('@/src/modules/auth/infrastructure/session-cookie', () => ({
  getSessionFromToken,
  getViewAsFromToken,
}))
vi.mock('@/src/modules/auth/infrastructure/fetch-view-as-client', () => ({ fetchViewAsClient }))
// Sin Supabase configurado `getSession` no revalida contra la BD (no es lo que se prueba).
vi.mock('@/src/modules/auth/infrastructure/supabase/env', () => ({
  isSupabaseConfigured: () => false,
}))
vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  isSupabaseServiceRoleConfigured: () => false,
}))
vi.mock('@/src/modules/colaboradores/application/get-worker-access-status', () => ({
  getWorkerAccessStatus: vi.fn(),
}))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker: vi.fn(),
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({ resolveDirectoryActorId }))
vi.mock('@/src/modules/portal/application/load-client-portal-notifications', () => ({
  loadClientPortalNotifications,
}))
vi.mock('@/src/modules/portal/infrastructure/chatter-read-state.supabase', () => ({
  fetchChatterReadStateForUser,
  upsertChatterReadState,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured: () => true,
  runWithOdooPriority: <T>(task: () => Promise<T>) => task(),
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-watch-state.supabase', () => ({
  fetchWatchStateForUser,
  upsertWatchStateBatch,
}))
vi.mock('@/src/modules/portal/infrastructure/resolve-watchable-ack-state', () => ({
  resolveWatchableAckStateFromSnapshots,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({
  verifyClientRecordAccess,
}))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase', () => ({
  fetchTramitesListSeenState,
  upsertTramitesListSeenState,
}))
vi.mock('@/src/modules/push/infrastructure/portal-events.supabase', () => ({
  getMaxPortalEventSeqForPartner,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-chatter-env', () => ({
  isPortalNewsSignalEnabled: () => true,
  getPortalNewsFullCheckMaxAgeMs: () => 300_000,
}))

const STAFF_SESSION: PortalSession = {
  user: { id: 'u-admin', email: 'admin@example.com', name: 'Admin', role: 'admin' },
  expiresAt: Date.now() + 100_000,
}
const CLIENT_USER = {
  id: 'u-client',
  email: 'cliente@example.com',
  name: 'Cliente',
  role: 'client' as const,
}
const CLIENT_SESSION: PortalSession = { user: CLIENT_USER, expiresAt: Date.now() + 100_000 }

/** Cada petición del navegador como Server Action (lleva la cabecera `next-action`). */
function asServerAction() {
  requestHeaders.set('next-action', 'abc123')
}

function enterViewAs() {
  cookieValues.set('syntia-portal-session', 'staff-token')
  cookieValues.set('syntia-view-as', 'view-as-token')
  getSessionFromToken.mockResolvedValue(STAFF_SESSION)
  getViewAsFromToken.mockResolvedValue({ staffAuthId: 'u-admin', clientUserId: 'u-client' })
  fetchViewAsClient.mockResolvedValue({ user: CLIENT_USER, advisorId: null })
}

function enterAsRealClient() {
  cookieValues.set('syntia-portal-session', 'client-token')
  getSessionFromToken.mockResolvedValue(CLIENT_SESSION)
}

const ACTIONS: { name: string; run: () => Promise<unknown> }[] = [
  { name: 'sondeo de la campana (checkPortalNotificationsAction)', run: () => checkPortalNotificationsAction() },
  { name: 'señal de novedades (checkPortalNewsSignalAction)', run: () => checkPortalNewsSignalAction() },
  {
    name: 'marcar conversación vista (markChatterConversationSeenAction)',
    run: () => markChatterConversationSeenAction({ kind: 'task', recordId: 7, lastSeenMessageId: 50 }),
  },
  {
    name: 'confirmar aviso de estado (ackPortalNotificationAction status_change)',
    run: () => ackPortalNotificationAction({ scope: 'tramite', recordId: 7, reason: 'status_change' }),
  },
  {
    name: 'confirmar aviso de responsable (ackPortalNotificationAction assignee_change)',
    run: () => ackPortalNotificationAction({ scope: 'tramite', recordId: 7, reason: 'assignee_change' }),
  },
  {
    name: 'confirmar aviso de firma (ackPortalNotificationAction new_firma)',
    run: () => ackPortalNotificationAction({ scope: 'firma', recordId: 7, reason: 'new_firma' }),
  },
  { name: 'lista de trámites vista (acknowledgeTramitesListSeenAction)', run: () => acknowledgeTramitesListSeenAction(['task:7']) },
  { name: 'trámite de la lista visto (acknowledgeTramiteListItemSeenAction)', run: () => acknowledgeTramiteListItemSeenAction('task:7') },
]

function writesMade() {
  return (
    upsertChatterReadState.mock.calls.length +
    upsertWatchStateBatch.mock.calls.length +
    upsertTramitesListSeenState.mock.calls.length
  )
}

beforeEach(() => {
  vi.resetAllMocks()
  cookieValues.clear()
  requestHeaders.clear()
  resolveDirectoryActorId.mockImplementation(async (user: { id: string }) => `actor-${user.id}`)
  resolveClientOdooPartnerId.mockResolvedValue(999)
  verifyClientRecordAccess.mockResolvedValue(true)
  fetchChatterReadStateForUser.mockResolvedValue(new Map())
  fetchWatchStateForUser.mockResolvedValue(new Map())
  fetchTramitesListSeenState.mockResolvedValue({ openItemKeys: [], initialized: true })
  resolveWatchableAckStateFromSnapshots.mockResolvedValue({
    lastState: 'x',
    lastIsClosed: false,
    lastAttachmentCount: 0,
    lastAssigneeKey: '1',
  })
  loadClientPortalNotifications.mockResolvedValue({
    ok: true,
    unread: [],
    readState: {},
    pendingFirmaIds: [],
    hasChanges: false,
    stats: {
      activeTramitesAndConsultas: 0,
      obligacionesInProgress: 0,
      pendingSignatures: 0,
      nextObligacion: null,
    },
  })
  getMaxPortalEventSeqForPartner.mockResolvedValue(5)
})

describe('vista como cliente: no consume los avisos del cliente', () => {
  for (const action of ACTIONS) {
    it(`${action.name}: sin sesión ni escrituras bajo la vista`, async () => {
      enterViewAs()
      asServerAction()

      await action.run()

      expect(writesMade()).toBe(0)
      expect(loadClientPortalNotifications).not.toHaveBeenCalled()
      expect(fetchChatterReadStateForUser).not.toHaveBeenCalled()
      expect(fetchWatchStateForUser).not.toHaveBeenCalled()
      expect(fetchTramitesListSeenState).not.toHaveBeenCalled()
      expect(getMaxPortalEventSeqForPartner).not.toHaveBeenCalled()
    })
  }

  it('las acciones con resultado responden forbidden bajo la vista', async () => {
    enterViewAs()
    asServerAction()

    expect(await checkPortalNotificationsAction()).toMatchObject({ ok: false, error: 'forbidden' })
    expect(await checkPortalNewsSignalAction()).toMatchObject({ ok: false, error: 'forbidden' })
    expect(
      await markChatterConversationSeenAction({ kind: 'task', recordId: 7, lastSeenMessageId: 50 })
    ).toMatchObject({ ok: false, error: 'forbidden' })
    expect(
      await ackPortalNotificationAction({ scope: 'tramite', recordId: 7, reason: 'status_change' })
    ).toMatchObject({ ok: false, error: 'forbidden' })
  })

  it('el sondeo del staff nunca se hace con el id del cliente: ni siquiera con la sesión real del staff', async () => {
    // Sin la superposición (cookie de vista caducada) manda la sesión del staff: no es cliente.
    cookieValues.set('syntia-portal-session', 'staff-token')
    getSessionFromToken.mockResolvedValue(STAFF_SESSION)
    asServerAction()

    expect(await checkPortalNotificationsAction()).toMatchObject({ ok: false, error: 'forbidden' })
    expect(writesMade()).toBe(0)
    expect(loadClientPortalNotifications).not.toHaveBeenCalled()
  })
})

describe('control: las mismas acciones SÍ escriben con la sesión real del cliente', () => {
  // Si estos fallaran, los tests de arriba pasarían por el motivo equivocado.
  it('el sondeo carga y persiste con el id del cliente', async () => {
    enterAsRealClient()
    asServerAction()

    await checkPortalNotificationsAction()

    expect(loadClientPortalNotifications).toHaveBeenCalledWith(
      expect.objectContaining({ actorId: 'actor-u-client', persist: true })
    )
  })

  it('marcar vista, confirmar aviso y lista vista escriben para el cliente', async () => {
    enterAsRealClient()
    asServerAction()

    await markChatterConversationSeenAction({ kind: 'task', recordId: 7, lastSeenMessageId: 50 })
    expect(upsertChatterReadState).toHaveBeenCalledWith('actor-u-client', 'task', 7, 50)

    await ackPortalNotificationAction({ scope: 'tramite', recordId: 7, reason: 'status_change' })
    expect(upsertWatchStateBatch).toHaveBeenCalledTimes(1)

    await acknowledgeTramitesListSeenAction(['task:7'])
    await acknowledgeTramiteListItemSeenAction('task:8')
    expect(upsertTramitesListSeenState).toHaveBeenCalledTimes(2)
  })

  it('la señal de novedades responde con el seq del cliente', async () => {
    enterAsRealClient()
    asServerAction()

    expect(await checkPortalNewsSignalAction()).toMatchObject({ ok: true, mode: 'events', seq: 5 })
  })
})
