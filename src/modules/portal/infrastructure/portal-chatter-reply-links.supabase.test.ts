import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  fetchChatterReplyLinks,
  recordChatterReplyLink,
} from '@/src/modules/portal/infrastructure/portal-chatter-reply-links.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

type QueryResult = { data?: unknown; error?: { message: string } | null }

function chainFor(result: QueryResult) {
  const resolved = Promise.resolve(result)
  const chain: Record<string, unknown> = {}
  chain.select = () => chain
  chain.in = vi.fn(() => chain)
  chain.upsert = vi.fn(() => resolved)
  chain.then = (resolve: (v: QueryResult) => void, reject: (e: unknown) => void) =>
    resolved.then(resolve, reject)
  return chain
}

beforeEach(() => {
  vi.resetAllMocks()
})

describe('recordChatterReplyLink', () => {
  it('upserts keyed on message_id (one trusted parent per message, always the latest choice)', async () => {
    const chain = chainFor({ error: null })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await recordChatterReplyLink({ messageId: 10, parentMessageId: 5 })

    expect(chain.upsert).toHaveBeenCalledWith(
      { message_id: 10, parent_message_id: 5 },
      { onConflict: 'message_id' }
    )
  })

  it('throws on a DB error', async () => {
    const chain = chainFor({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    await expect(
      recordChatterReplyLink({ messageId: 10, parentMessageId: 5 })
    ).rejects.toThrow('boom')
  })
})

describe('fetchChatterReplyLinks', () => {
  it('is a no-op (never touches Supabase) for an empty id list', async () => {
    const result = await fetchChatterReplyLinks([])

    expect(result.size).toBe(0)
    expect(createSupabaseAdminClient).not.toHaveBeenCalled()
  })

  it('scopes the lookup to exactly the given message ids and maps message->parent', async () => {
    const chain = chainFor({
      data: [
        { message_id: 10, parent_message_id: 5 },
        { message_id: 11, parent_message_id: 6 },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({ from: () => chain })

    const result = await fetchChatterReplyLinks([10, 11])

    expect(chain.in).toHaveBeenCalledWith('message_id', [10, 11])
    expect(result.get(10)).toBe(5)
    expect(result.get(11)).toBe(6)
  })

  it('throws on a DB error', async () => {
    createSupabaseAdminClient.mockReturnValue({
      from: () => chainFor({ data: null, error: { message: 'boom' } }),
    })

    await expect(fetchChatterReplyLinks([10])).rejects.toThrow('boom')
  })
})
