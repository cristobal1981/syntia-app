import { beforeEach, describe, expect, it, vi } from 'vitest'

const {
  getSession,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  odooSearchRead,
  fetchAttachmentBinary,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  odooSearchRead: vi.fn(),
  fetchAttachmentBinary: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', async () => {
  const actual = await vi.importActual<
    typeof import('@/src/modules/portal/infrastructure/odoo-json-client')
  >('@/src/modules/portal/infrastructure/odoo-json-client')
  return { ...actual, isOdooApiConfigured, odooSearchRead }
})
vi.mock('@/src/modules/portal/infrastructure/odoo-attachments-repository', () => ({
  fetchAttachmentBinary,
}))

import { downloadSignedDocumentAction } from '@/src/modules/firmas/application/download-signed-document-action'

const input = { requestId: 7, attachmentId: 99 }

function okBinary(over: Record<string, unknown> = {}) {
  return {
    filename: 'doc.pdf',
    mimetype: 'application/pdf',
    dataBase64: 'QUJD',
    resModel: 'sign.request',
    resId: 7,
    ...over,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  getSession.mockResolvedValue({ user: { id: 'u', role: 'client' } })
  resolveClientOdooPartnerId.mockResolvedValue(42)
  isOdooApiConfigured.mockReturnValue(true)
  odooSearchRead
    .mockResolvedValueOnce([{ id: 1 }])
    .mockResolvedValueOnce([{ id: 7, completed_document_attachment_ids: [99, 100] }])
  fetchAttachmentBinary.mockResolvedValue(okBinary())
})

describe('downloadSignedDocumentAction — gates', () => {
  it('SECURITY: sin sesión → forbidden sin tocar Odoo', async () => {
    getSession.mockResolvedValue(null)
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'forbidden' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(odooSearchRead).not.toHaveBeenCalled()
    expect(fetchAttachmentBinary).not.toHaveBeenCalled()
  })

  it.each(['advisor', 'admin'])('SECURITY: rol %s → forbidden', async (role) => {
    getSession.mockResolvedValue({ user: { id: 'u', role } })
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'forbidden' })
    expect(odooSearchRead).not.toHaveBeenCalled()
    expect(fetchAttachmentBinary).not.toHaveBeenCalled()
  })

  it('worker permitido', async () => {
    getSession.mockResolvedValue({ user: { id: 'u', role: 'worker' } })
    expect((await downloadSignedDocumentAction(input)).ok).toBe(true)
  })

  it('sin partner → not_linked', async () => {
    resolveClientOdooPartnerId.mockResolvedValue(null)
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'not_linked' })
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('Odoo sin configurar → odoo_unavailable sin consultar', async () => {
    isOdooApiConfigured.mockReturnValue(false)
    expect(await downloadSignedDocumentAction(input)).toEqual({
      ok: false,
      error: 'odoo_unavailable',
    })
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it.each([
    [{ requestId: 0, attachmentId: 99 }],
    [{ requestId: -1, attachmentId: 99 }],
    [{ requestId: 1.5, attachmentId: 99 }],
    [{ requestId: Number.NaN, attachmentId: 99 }],
    [{ requestId: 7, attachmentId: 0 }],
    [{ requestId: 7, attachmentId: -3 }],
    [{ requestId: 7, attachmentId: 2.5 }],
    [{ requestId: 7, attachmentId: Number.NaN }],
  ])('ids inválidos %j → not_found sin consultar', async (bad) => {
    expect(await downloadSignedDocumentAction(bad)).toEqual({ ok: false, error: 'not_found' })
    expect(odooSearchRead).not.toHaveBeenCalled()
    expect(fetchAttachmentBinary).not.toHaveBeenCalled()
  })
})

describe('downloadSignedDocumentAction — IDOR', () => {
  it('éxito: devuelve el binario y filtra por partner, solicitud y estados done', async () => {
    const result = await downloadSignedDocumentAction(input)
    expect(result).toEqual({
      ok: true,
      filename: 'doc.pdf',
      mimetype: 'application/pdf',
      dataBase64: 'QUJD',
    })
    expect(odooSearchRead).toHaveBeenNthCalledWith(1, 'sign.request.item', {
      domain: [
        ['sign_request_id', '=', 7],
        ['partner_id', '=', 42],
        ['state', 'in', ['completed']],
      ],
      fields: ['id'],
      limit: 1,
    })
    expect(odooSearchRead).toHaveBeenNthCalledWith(2, 'sign.request', {
      domain: [['id', '=', 7]],
      fields: ['completed_document_attachment_ids'],
      limit: 1,
    })
    expect(fetchAttachmentBinary).toHaveBeenCalledWith(99)
  })

  it('SECURITY: solicitud de otro partner → not_found y no descarga', async () => {
    odooSearchRead.mockReset()
    odooSearchRead.mockResolvedValueOnce([])
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'not_found' })
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
    expect(fetchAttachmentBinary).not.toHaveBeenCalled()
  })

  it('SECURITY: adjunto no listado entre los completados → not_found', async () => {
    odooSearchRead.mockReset()
    odooSearchRead
      .mockResolvedValueOnce([{ id: 1 }])
      .mockResolvedValueOnce([{ id: 7, completed_document_attachment_ids: [100] }])
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'not_found' })
    expect(fetchAttachmentBinary).not.toHaveBeenCalled()
  })

  it.each([[false], [null], [undefined]])(
    'completed_document_attachment_ids=%s → not_found',
    async (ids) => {
      odooSearchRead.mockReset()
      odooSearchRead
        .mockResolvedValueOnce([{ id: 1 }])
        .mockResolvedValueOnce([{ id: 7, completed_document_attachment_ids: ids }])
      expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'not_found' })
      expect(fetchAttachmentBinary).not.toHaveBeenCalled()
    }
  )

  it('solicitud inexistente (sin filas) → not_found', async () => {
    odooSearchRead.mockReset()
    odooSearchRead.mockResolvedValueOnce([{ id: 1 }]).mockResolvedValueOnce([])
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'not_found' })
  })

  it('SECURITY: binario con res_model distinto → not_found', async () => {
    fetchAttachmentBinary.mockResolvedValue(okBinary({ resModel: 'res.partner' }))
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'not_found' })
  })

  it('SECURITY: binario colgando de otra solicitud → not_found', async () => {
    fetchAttachmentBinary.mockResolvedValue(okBinary({ resId: 8 }))
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'not_found' })
  })
})

describe('downloadSignedDocumentAction — errores', () => {
  it('ODOO_ATTACHMENT_NOT_FOUND → not_found', async () => {
    fetchAttachmentBinary.mockRejectedValue(new Error('ODOO_ATTACHMENT_NOT_FOUND'))
    expect(await downloadSignedDocumentAction(input)).toEqual({ ok: false, error: 'not_found' })
  })

  it('rate limit → odoo_rate_limited', async () => {
    const { ODOO_ERROR } = await import('@/src/modules/portal/infrastructure/odoo-json-client')
    odooSearchRead.mockReset()
    odooSearchRead.mockRejectedValue(new Error(ODOO_ERROR.RATE_LIMITED))
    expect(await downloadSignedDocumentAction(input)).toEqual({
      ok: false,
      error: 'odoo_rate_limited',
    })
  })

  it('otro error → odoo_unavailable', async () => {
    odooSearchRead.mockReset()
    odooSearchRead.mockRejectedValue(new Error('boom'))
    expect(await downloadSignedDocumentAction(input)).toEqual({
      ok: false,
      error: 'odoo_unavailable',
    })
  })
})
