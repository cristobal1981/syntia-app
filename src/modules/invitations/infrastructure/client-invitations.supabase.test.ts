import { beforeEach, describe, expect, it, vi } from 'vitest'

const { createSupabaseAdminClient } = vi.hoisted(() => ({ createSupabaseAdminClient: vi.fn() }))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

import {
  countInvitationsByInviter,
  findInviterOfEmail,
  portalAccountExistsForEmail,
  recordInvitation,
  removeInvitation,
} from '@/src/modules/invitations/infrastructure/client-invitations.supabase'

type Result = { data?: unknown; count?: number | null; error?: { message: string; code?: string } | null }

/** Cadena de Supabase que se resuelve con `result` en cualquier punto y guarda las llamadas. */
function chain(result: Result, calls: Array<[string, unknown[]]>) {
  const resolved = Promise.resolve(result)
  const node: Record<string, unknown> = {}
  for (const name of ['select', 'eq', 'limit', 'insert', 'delete']) {
    node[name] = (...args: unknown[]) => {
      calls.push([name, args])
      return node
    }
  }
  node.then = (resolve: (value: Result) => void, reject: (reason: unknown) => void) =>
    resolved.then(resolve, reject)
  return node
}

function mockClient(result: Result) {
  const calls: Array<[string, unknown[]]> = []
  const from = vi.fn(() => chain(result, calls))
  createSupabaseAdminClient.mockReturnValue({ from })
  return { calls, from }
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('countInvitationsByInviter', () => {
  it('cuenta las invitaciones del cliente en client_invitations', async () => {
    const { calls, from } = mockClient({ count: 3, error: null })

    await expect(countInvitationsByInviter('u-1')).resolves.toBe(3)
    expect(from).toHaveBeenCalledWith('client_invitations')
    expect(calls).toContainEqual(['eq', ['inviter_user_id', 'u-1']])
  })

  it('devuelve 0 cuando el recuento viene nulo', async () => {
    mockClient({ count: null, error: null })

    await expect(countInvitationsByInviter('u-1')).resolves.toBe(0)
  })

  it('lanza el error de la base de datos', async () => {
    mockClient({ error: { message: 'boom' } })

    await expect(countInvitationsByInviter('u-1')).rejects.toThrow('boom')
  })
})

describe('findInviterOfEmail', () => {
  it('devuelve quién invitó ya a ese correo', async () => {
    const { calls } = mockClient({ data: [{ inviter_user_id: 'u-9' }], error: null })

    await expect(findInviterOfEmail('a@b.es')).resolves.toBe('u-9')
    expect(calls).toContainEqual(['eq', ['invitee_email', 'a@b.es']])
  })

  it('devuelve null si nadie lo invitó', async () => {
    mockClient({ data: [], error: null })

    await expect(findInviterOfEmail('a@b.es')).resolves.toBeNull()
  })
})

describe('portalAccountExistsForEmail', () => {
  it('consulta la tabla users por correo', async () => {
    const { calls, from } = mockClient({ data: [{ id: 'u' }], error: null })

    await expect(portalAccountExistsForEmail('a@b.es')).resolves.toBe(true)
    expect(from).toHaveBeenCalledWith('users')
    expect(calls).toContainEqual(['eq', ['email', 'a@b.es']])
  })

  it('devuelve false si no hay cuenta', async () => {
    mockClient({ data: [], error: null })

    await expect(portalAccountExistsForEmail('a@b.es')).resolves.toBe(false)
  })
})

describe('recordInvitation', () => {
  it('inserta quién invita y a qué correo', async () => {
    const { calls } = mockClient({ error: null })

    await expect(recordInvitation({ inviterUserId: 'u-1', inviteeEmail: 'a@b.es' })).resolves.toBe(
      true
    )
    expect(calls).toContainEqual([
      'insert',
      [{ inviter_user_id: 'u-1', invitee_email: 'a@b.es' }],
    ])
  })

  it('devuelve false ante una violación de unicidad (correo ya invitado)', async () => {
    mockClient({ error: { message: 'duplicate', code: '23505' } })

    await expect(recordInvitation({ inviterUserId: 'u-1', inviteeEmail: 'a@b.es' })).resolves.toBe(
      false
    )
  })

  it('lanza cualquier otro error', async () => {
    mockClient({ error: { message: 'boom', code: '42P01' } })

    await expect(
      recordInvitation({ inviterUserId: 'u-1', inviteeEmail: 'a@b.es' })
    ).rejects.toThrow('boom')
  })
})

describe('removeInvitation', () => {
  it('borra por correo', async () => {
    const { calls } = mockClient({ error: null })

    await removeInvitation('a@b.es')

    expect(calls.map(([name]) => name)).toContain('delete')
    expect(calls).toContainEqual(['eq', ['invitee_email', 'a@b.es']])
  })

  it('lanza el error de la base de datos', async () => {
    mockClient({ error: { message: 'boom' } })

    await expect(removeInvitation('a@b.es')).rejects.toThrow('boom')
  })
})
