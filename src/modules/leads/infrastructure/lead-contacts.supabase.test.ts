import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  listLatestContactByLead,
  recordLeadContact,
} from '@/src/modules/leads/infrastructure/lead-contacts.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

beforeEach(() => {
  vi.resetAllMocks()
})

describe('listLatestContactByLead', () => {
  it('se queda con el created_at más reciente por lead_id (la query ya viene ordenada desc)', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        { lead_id: 'a', created_at: '2026-02-01T00:00:00.000Z' },
        { lead_id: 'a', created_at: '2026-01-01T00:00:00.000Z' },
        { lead_id: 'b', created_at: '2026-01-15T00:00:00.000Z' },
      ],
      error: null,
    })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ order }) }),
    })

    const result = await listLatestContactByLead()

    expect(result.get('a')).toBe('2026-02-01T00:00:00.000Z')
    expect(result.get('b')).toBe('2026-01-15T00:00:00.000Z')
    expect(result.size).toBe(2)
  })

  it('devuelve un Map vacío cuando no hay contactos', async () => {
    const order = vi.fn().mockResolvedValue({ data: [], error: null })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ order }) }),
    })

    const result = await listLatestContactByLead()

    expect(result.size).toBe(0)
  })

  it('lanza un Error con el mensaje de Supabase si la query falla', async () => {
    const order = vi.fn().mockResolvedValue({ data: null, error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ order }) }),
    })

    await expect(listLatestContactByLead()).rejects.toThrow('boom')
  })
})

describe('recordLeadContact', () => {
  it('inserta con los campos snake_case correctos', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert }),
    })

    await recordLeadContact({
      leadId: 'lead-1',
      sentBy: 'user-1',
      sentTo: 'lead@example.com',
      subject: 'Asunto',
      bodyHtml: '<p>hola</p>',
      bodyText: 'hola',
      resendEmailId: 'resend-1',
    })

    expect(insert).toHaveBeenCalledWith({
      lead_id: 'lead-1',
      sent_by: 'user-1',
      sent_to: 'lead@example.com',
      subject: 'Asunto',
      body_html: '<p>hola</p>',
      body_text: 'hola',
      resend_email_id: 'resend-1',
    })
  })

  it('lanza un Error con el mensaje de Supabase si el insert falla', async () => {
    const insert = vi.fn().mockResolvedValue({ error: { message: 'boom' } })
    createSupabaseAdminClient.mockReturnValue({
      from: vi.fn().mockReturnValue({ insert }),
    })

    await expect(
      recordLeadContact({
        leadId: 'lead-1',
        sentBy: 'user-1',
        sentTo: 'lead@example.com',
        subject: 'Asunto',
        bodyHtml: '<p>hola</p>',
        bodyText: 'hola',
        resendEmailId: null,
      })
    ).rejects.toThrow('boom')
  })
})
