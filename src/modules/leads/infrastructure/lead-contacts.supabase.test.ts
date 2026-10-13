import { describe, expect, it, vi, beforeEach } from 'vitest'

import { recordLeadContact } from '@/src/modules/leads/infrastructure/lead-contacts.supabase'

const { createSupabaseAdminClient } = vi.hoisted(() => ({
  createSupabaseAdminClient: vi.fn(),
}))

vi.mock('@/src/modules/directory/infrastructure/supabase-admin', () => ({
  createSupabaseAdminClient,
}))

beforeEach(() => {
  vi.resetAllMocks()
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
