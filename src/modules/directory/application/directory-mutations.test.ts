import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import type { ClientRecord, DirectoryListScope } from '@/src/modules/directory/domain/types'
import {
  canEditClient,
  createClientAction,
  createClientCore,
  createGestorAction,
  deleteClientAction,
  deleteGestorAction,
  listOdooGestoresForImportAction,
  listOdooPartnersForImportAction,
  resendClientAccessEmailAction,
  resendGestorAccessEmailAction,
  updateClientAction,
  updateGestorAction,
} from '@/src/modules/directory/application/directory-mutations'

const {
  getSession,
  requireDirectorySession,
  buildDirectoryScope,
  listOdooPartnersForImport,
  listOdooGestoresForImport,
  createGestor,
  updateGestor,
  deleteGestor,
  getGestor,
  resendGestorAccessEmail,
  createClient,
  updateClient,
  deleteClient,
  getClient,
  resendClientAccessEmail,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  requireDirectorySession: vi.fn(),
  buildDirectoryScope: vi.fn(),
  listOdooPartnersForImport: vi.fn(),
  listOdooGestoresForImport: vi.fn(),
  createGestor: vi.fn(),
  updateGestor: vi.fn(),
  deleteGestor: vi.fn(),
  getGestor: vi.fn(),
  resendGestorAccessEmail: vi.fn(),
  createClient: vi.fn(),
  updateClient: vi.fn(),
  deleteClient: vi.fn(),
  getClient: vi.fn(),
  resendClientAccessEmail: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/directory/application/directory-queries', () => ({
  requireDirectorySession,
  buildDirectoryScope,
}))
vi.mock('@/src/modules/directory/application/list-odoo-partners-for-import', () => ({
  listOdooPartnersForImport,
}))
vi.mock('@/src/modules/directory/application/list-odoo-gestores-for-import', () => ({
  listOdooGestoresForImport,
}))
vi.mock('@/src/modules/directory/infrastructure/get-directory-repository', () => ({
  getDirectoryRepository: () => ({
    createGestor,
    updateGestor,
    deleteGestor,
    getGestor,
    resendGestorAccessEmail,
    createClient,
    updateClient,
    deleteClient,
    getClient,
    resendClientAccessEmail,
  }),
}))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

function sessionFor(role: 'admin' | 'advisor' | 'client' | 'worker'): PortalSession {
  return {
    user: { id: `auth-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

function scopeFor(role: DirectoryListScope['role'], userId: string): DirectoryListScope {
  return { role, userId }
}

function client(overrides: Partial<ClientRecord> = {}): ClientRecord {
  return {
    id: 'client-1',
    name: 'Cliente Uno',
    email: 'cliente@example.com',
    clientKind: 'person',
    firstName: 'Cliente',
    firstSurname: 'Uno',
    status: 'active',
    advisorId: 'advisor-1',
    ...overrides,
  }
}

function gestorFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('firstName', 'Ana')
  fd.set('firstSurname', 'García')
  fd.set('email', 'ana@example.com')
  fd.set('role', 'advisor')
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

function clientFormData(overrides: Record<string, string> = {}): FormData {
  const fd = new FormData()
  fd.set('clientKind', 'person')
  fd.set('firstName', 'Cliente')
  fd.set('firstSurname', 'Uno')
  fd.set('email', 'cliente@example.com')
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

function updateClientFormData(overrides: Record<string, string> = {}): FormData {
  const fd = clientFormData(overrides)
  fd.set('id', 'client-1')
  fd.set('status', 'active')
  for (const [k, v] of Object.entries(overrides)) fd.set(k, v)
  return fd
}

beforeEach(() => {
  vi.resetAllMocks()
})

// ---------------------------------------------------------------------------
// Gestores (admin-only actions)
// ---------------------------------------------------------------------------

describe('createGestorAction (admin-only)', () => {
  it.each(['advisor', 'client', 'worker'] as const)(
    'returns forbidden for role=%s without touching the repository',
    async (role) => {
      requireDirectorySession.mockResolvedValue(sessionFor(role))

      const result = await createGestorAction(null, gestorFormData())

      expect(result).toEqual({ ok: false, error: 'forbidden' })
      expect(createGestor).not.toHaveBeenCalled()
    }
  )

  it('returns validation fieldErrors and never calls the repository when the name/email are invalid', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))

    const result = await createGestorAction(
      null,
      gestorFormData({ firstName: '', email: 'not-an-email' })
    )

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.error).toBe('validation')
      expect(result.fieldErrors).toMatchObject({
        firstName: expect.any(String),
        email: expect.any(String),
      })
    }
    expect(createGestor).not.toHaveBeenCalled()
  })

  it('creates the gestor for an admin with valid input and reports inviteSent from the repository', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    createGestor.mockResolvedValue({ inviteSent: true })

    const result = await createGestorAction(null, gestorFormData())

    expect(result).toEqual({ ok: true, inviteSent: true })
    expect(createGestor).toHaveBeenCalledTimes(1)
  })

  it('maps a DUPLICATE_EMAIL repository error to a field error, not a generic failure', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    createGestor.mockRejectedValue(new Error('DUPLICATE_EMAIL'))

    const result = await createGestorAction(null, gestorFormData())

    expect(result).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { email: 'Ya existe un usuario con ese correo.' },
    })
  })

  it('propagates "unauthorized" from requireDirectorySession', async () => {
    requireDirectorySession.mockRejectedValue(new Error('unauthorized'))

    const result = await createGestorAction(null, gestorFormData())

    expect(result).toEqual({ ok: false, error: 'unauthorized' })
  })
})

describe('updateGestorAction (admin-only)', () => {
  it('returns forbidden for a non-admin', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))

    const result = await updateGestorAction(null, gestorFormData({ id: 'g-1' }))

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(updateGestor).not.toHaveBeenCalled()
  })

  it('updates the gestor for an admin with valid input', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))

    const result = await updateGestorAction(null, gestorFormData({ id: 'g-1' }))

    expect(result).toEqual({ ok: true })
    expect(updateGestor).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'g-1', email: 'ana@example.com' })
    )
  })
})

describe('deleteGestorAction (admin-only, blocks self-deletion)', () => {
  it('returns forbidden for a non-admin', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))

    const result = await deleteGestorAction('g-1')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(deleteGestor).not.toHaveBeenCalled()
  })

  it('BLOCKS an admin from deleting their own account, with a specific message', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'self-id'))

    const result = await deleteGestorAction('self-id')

    expect(result).toEqual({
      ok: false,
      error: 'forbidden',
      message: 'No puedes eliminar tu propia cuenta.',
    })
    expect(getGestor).not.toHaveBeenCalled()
    expect(deleteGestor).not.toHaveBeenCalled()
  })

  it('returns not_found when the target gestor does not exist', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'self-id'))
    getGestor.mockResolvedValue(null)

    const result = await deleteGestorAction('other-id')

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(deleteGestor).not.toHaveBeenCalled()
  })

  it('deletes a different gestor successfully', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'self-id'))
    getGestor.mockResolvedValue({ id: 'other-id' })

    const result = await deleteGestorAction('other-id')

    expect(result).toEqual({ ok: true })
    expect(deleteGestor).toHaveBeenCalledWith('other-id')
  })

  it('maps DELETE_AUTH_FAILED to a specific support message', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'self-id'))
    getGestor.mockResolvedValue({ id: 'other-id' })
    deleteGestor.mockRejectedValue(new Error('DELETE_AUTH_FAILED'))

    const result = await deleteGestorAction('other-id')

    expect(result).toEqual({
      ok: false,
      error: 'unknown',
      message:
        'Se eliminó el asesor del portal, pero no pudimos borrar su cuenta de acceso. Contacta con soporte.',
    })
  })
})

describe('resendGestorAccessEmailAction (admin-only, blocks self-target)', () => {
  it('returns forbidden for a non-admin', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))

    const result = await resendGestorAccessEmailAction('g-1')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(resendGestorAccessEmail).not.toHaveBeenCalled()
  })

  it('BLOCKS an admin from resending their own access email', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'self-id'))

    const result = await resendGestorAccessEmailAction('self-id')

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('forbidden')
    expect(resendGestorAccessEmail).not.toHaveBeenCalled()
  })

  it('resends access for a different gestor', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'self-id'))
    getGestor.mockResolvedValue({ id: 'other-id' })

    const result = await resendGestorAccessEmailAction('other-id')

    expect(result).toEqual({ ok: true })
    expect(resendGestorAccessEmail).toHaveBeenCalledWith('other-id')
  })
})

// ---------------------------------------------------------------------------
// Clientes (admin + advisor, con ownership scoping para advisor)
// ---------------------------------------------------------------------------

describe('createClientAction', () => {
  it('returns forbidden for role=client', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('client'))
    buildDirectoryScope.mockResolvedValue(scopeFor('client', 'client-user'))

    const result = await createClientAction(null, clientFormData())

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(createClient).not.toHaveBeenCalled()
  })

  it('FORCES advisorId to the acting advisor — an advisor cannot assign a client to someone else', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-self'))
    createClient.mockResolvedValue({ inviteSent: false })

    await createClientAction(
      null,
      clientFormData({ advisorId: 'someone-else' })
    )

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ advisorId: 'advisor-self' })
    )
  })

  it('lets an admin set an arbitrary advisorId', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))
    createClient.mockResolvedValue({ inviteSent: false })

    await createClientAction(
      null,
      clientFormData({ advisorId: 'chosen-advisor' })
    )

    expect(createClient).toHaveBeenCalledWith(
      expect.objectContaining({ advisorId: 'chosen-advisor' })
    )
  })

  it('returns validation errors without calling the repository', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))

    const result = await createClientAction(
      null,
      clientFormData({ email: 'not-an-email' })
    )

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('validation')
    expect(createClient).not.toHaveBeenCalled()
  })
})

describe('createClientCore (used directly by the Odoo webhook, no session)', () => {
  it('creates the client with the given input, validation errors block the write', async () => {
    const result = await createClientCore({
      clientKind: 'person',
      firstName: '',
      firstSurname: 'Uno',
      email: 'x@example.com',
    })

    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.error).toBe('validation')
    expect(createClient).not.toHaveBeenCalled()
  })

  it('creates the client when input is valid', async () => {
    createClient.mockResolvedValue({ inviteSent: true })

    const result = await createClientCore({
      clientKind: 'person',
      firstName: 'Cliente',
      firstSurname: 'Uno',
      email: 'x@example.com',
    })

    expect(result).toEqual({ ok: true, inviteSent: true })
  })
})

describe('updateClientAction', () => {
  it('reads the target client id from the form field "id" — NOT any other field (e.g. email)', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))
    getClient.mockResolvedValue(client({ id: 'client-1' }))

    await updateClientAction(null, updateClientFormData({ id: 'client-1' }))

    expect(getClient).toHaveBeenCalledWith('client-1')
    expect(updateClient).toHaveBeenCalledWith(
      expect.objectContaining({ id: 'client-1' })
    )
  })

  it('returns forbidden for role=client', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('client'))
    buildDirectoryScope.mockResolvedValue(scopeFor('client', 'client-user'))

    const result = await updateClientAction(null, updateClientFormData())

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(getClient).not.toHaveBeenCalled()
  })

  it("returns 'unknown'/not-found when the client doesn't exist", async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))
    getClient.mockResolvedValue(null)

    const result = await updateClientAction(null, updateClientFormData())

    expect(result).toEqual({
      ok: false,
      error: 'unknown',
      message: 'Cliente no encontrado.',
    })
    expect(updateClient).not.toHaveBeenCalled()
  })

  it('BLOCKS an advisor from editing a client owned by a different advisor', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-B' }))

    const result = await updateClientAction(null, updateClientFormData())

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(updateClient).not.toHaveBeenCalled()
  })

  it('ALLOWS an advisor to edit their own client, and FORCES advisorId back to the existing owner (cannot reassign)', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-A' }))

    await updateClientAction(
      null,
      updateClientFormData({ advisorId: 'advisor-B' })
    )

    expect(updateClient).toHaveBeenCalledWith(
      expect.objectContaining({ advisorId: 'advisor-A' })
    )
  })

  it('lets an admin reassign a client to a different advisor', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-A' }))

    await updateClientAction(
      null,
      updateClientFormData({ advisorId: 'advisor-B' })
    )

    expect(updateClient).toHaveBeenCalledWith(
      expect.objectContaining({ advisorId: 'advisor-B' })
    )
  })

  it('runs validation AFTER the ownership check, so a rejected advisor never leaks whether the input was otherwise valid', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-B' }))

    const result = await updateClientAction(
      null,
      updateClientFormData({ email: 'not-an-email' })
    )

    expect(result).toEqual({ ok: false, error: 'forbidden' })
  })
})

describe('deleteClientAction', () => {
  it('returns forbidden for role=client', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('client'))
    buildDirectoryScope.mockResolvedValue(scopeFor('client', 'client-user'))

    const result = await deleteClientAction('client-1')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(getClient).not.toHaveBeenCalled()
  })

  it('returns not_found when the client does not exist', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))
    getClient.mockResolvedValue(null)

    const result = await deleteClientAction('client-1')

    expect(result).toEqual({ ok: false, error: 'not_found' })
    expect(deleteClient).not.toHaveBeenCalled()
  })

  it('BLOCKS an advisor from deleting a client owned by a different advisor', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-B' }))

    const result = await deleteClientAction('client-1')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(deleteClient).not.toHaveBeenCalled()
  })

  it('ALLOWS an advisor to delete their own client', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-A' }))

    const result = await deleteClientAction('client-1')

    expect(result).toEqual({ ok: true })
    expect(deleteClient).toHaveBeenCalledWith('client-1')
  })

  it('maps DELETE_AUTH_FAILED to a specific support message', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    buildDirectoryScope.mockResolvedValue(scopeFor('admin', 'admin-1'))
    getClient.mockResolvedValue(client())
    deleteClient.mockRejectedValue(new Error('DELETE_AUTH_FAILED'))

    const result = await deleteClientAction('client-1')

    expect(result).toEqual({
      ok: false,
      error: 'unknown',
      message:
        'Se eliminó el cliente del portal, pero no pudimos borrar su cuenta de acceso. Contacta con soporte.',
    })
  })
})

describe('resendClientAccessEmailAction', () => {
  it('returns forbidden for role=client', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('client'))
    buildDirectoryScope.mockResolvedValue(scopeFor('client', 'client-user'))

    const result = await resendClientAccessEmailAction('client-1')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(resendClientAccessEmail).not.toHaveBeenCalled()
  })

  it('BLOCKS an advisor from resending access for a client owned by a different advisor', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-B' }))

    const result = await resendClientAccessEmailAction('client-1')

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(resendClientAccessEmail).not.toHaveBeenCalled()
  })

  it('resends access for the advisor own client', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-A' }))

    const result = await resendClientAccessEmailAction('client-1')

    expect(result).toEqual({ ok: true })
    expect(resendClientAccessEmail).toHaveBeenCalledWith('client-1')
  })
})

// ---------------------------------------------------------------------------
// Import desde Odoo
// ---------------------------------------------------------------------------

describe('listOdooPartnersForImportAction', () => {
  it('returns forbidden for role=client', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('client'))

    const result = await listOdooPartnersForImportAction()

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(listOdooPartnersForImport).not.toHaveBeenCalled()
  })

  it.each(['admin', 'advisor'] as const)(
    'allows role=%s and forwards the ok result',
    async (role) => {
      requireDirectorySession.mockResolvedValue(sessionFor(role))
      listOdooPartnersForImport.mockResolvedValue({ ok: true, partners: [] })

      const result = await listOdooPartnersForImportAction()

      expect(result).toEqual({ ok: true, partners: [] })
    }
  )
})

describe('listOdooGestoresForImportAction (admin-only)', () => {
  it('returns forbidden for a non-admin', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('advisor'))

    const result = await listOdooGestoresForImportAction()

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(listOdooGestoresForImport).not.toHaveBeenCalled()
  })

  it('allows an admin and forwards the ok result', async () => {
    requireDirectorySession.mockResolvedValue(sessionFor('admin'))
    listOdooGestoresForImport.mockResolvedValue({ ok: true, users: [] })

    const result = await listOdooGestoresForImportAction()

    expect(result).toEqual({ ok: true, users: [] })
  })
})

// ---------------------------------------------------------------------------
// canEditClient
// ---------------------------------------------------------------------------

describe('canEditClient', () => {
  it('returns false with no session', async () => {
    getSession.mockResolvedValue(null)

    await expect(canEditClient('client-1')).resolves.toBe(false)
  })

  it('returns false for role=client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    await expect(canEditClient('client-1')).resolves.toBe(false)
    expect(getClient).not.toHaveBeenCalled()
  })

  it('returns true for an admin WITHOUT checking ownership', async () => {
    getSession.mockResolvedValue(sessionFor('admin'))

    await expect(canEditClient('client-1')).resolves.toBe(true)
    expect(getClient).not.toHaveBeenCalled()
  })

  it('returns true for an advisor who owns the client', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-A' }))

    await expect(canEditClient('client-1')).resolves.toBe(true)
  })

  it('returns false for an advisor who does NOT own the client', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))
    buildDirectoryScope.mockResolvedValue(scopeFor('advisor', 'advisor-A'))
    getClient.mockResolvedValue(client({ advisorId: 'advisor-B' }))

    await expect(canEditClient('client-1')).resolves.toBe(false)
  })
})
