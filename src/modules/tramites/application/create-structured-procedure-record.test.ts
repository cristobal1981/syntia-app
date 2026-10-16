import { beforeEach, describe, expect, it, vi } from 'vitest'
import { updateTag } from 'next/cache'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { createStructuredProcedureRecord } from '@/src/modules/tramites/application/create-structured-procedure-record'
import type { TrabajadorBajaPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'

const m = vi.hoisted(() => ({
  getSession: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  createPartnerTicket: vi.fn(),
  createPartnerTask: vi.fn(),
  postRecordComment: vi.fn(),
  createAttachmentsForRecord: vi.fn(),
  validateChatterUploadFiles: vi.fn(),
  checkRateLimit: vi.fn(),
  isProcedureTypeAvailable: vi.fn(),
}))

vi.mock('@/src/modules/tramites/domain/procedure-ticket-types', async (importOriginal) => {
  const actual = await importOriginal<
    typeof import('@/src/modules/tramites/domain/procedure-ticket-types')
  >()
  return { ...actual, isProcedureTypeAvailable: m.isProcedureTypeAvailable }
})
vi.mock('@/lib/rate-limit/check-rate-limit', () => ({ checkRateLimit: m.checkRateLimit }))
vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession: m.getSession }))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections: m.getWorkerWriteSections,
}))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId: m.resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured: m.isOdooApiConfigured,
}))
vi.mock('@/src/modules/tramites/infrastructure/odoo-create-ticket-repository', () => ({
  createPartnerTicket: m.createPartnerTicket,
}))
vi.mock('@/src/modules/tramites/infrastructure/odoo-create-task-repository', () => ({
  createPartnerTask: m.createPartnerTask,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-messages-repository', () => ({
  postRecordComment: m.postRecordComment,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-attachments-repository', () => ({
  createAttachmentsForRecord: m.createAttachmentsForRecord,
}))
vi.mock('@/src/modules/portal/lib/chatter-attachment-validation', () => ({
  validateChatterUploadFiles: m.validateChatterUploadFiles,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({
  getOdooModelForRecordKind: (kind: string) => `model:${kind}`,
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  tramitesSnapshotCacheTag: (id: number) => `tag:${id}`,
}))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

function sessionFor(role: 'client' | 'worker' | 'admin'): PortalSession {
  return {
    user: { id: `u-${role}`, email: 'a@b.c', name: role, role },
    expiresAt: Date.now() + 100000,
  } as PortalSession
}

const payload: TrabajadorBajaPayload = {
  type: 'baja-trabajador',
  fullName: ' Ana García ',
  dni: '12345678Z',
  endDate: '2099-01-01',
  reason: 'fin_contrato',
  observations: '',
}

const file = { name: 'dni.pdf', mimetype: 'application/pdf', dataBase64: 'AA==' }

function run(overrides: Partial<Parameters<typeof createStructuredProcedureRecord>[0]> = {}) {
  return createStructuredProcedureRecord({
    payload,
    recordKind: 'ticket',
    postChatterMessage: true,
    ...overrides,
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  m.getSession.mockResolvedValue(sessionFor('client'))
  m.isProcedureTypeAvailable.mockReturnValue(true)
  m.checkRateLimit.mockResolvedValue(true)
  m.resolveClientOdooPartnerId.mockResolvedValue(999)
  m.isOdooApiConfigured.mockReturnValue(true)
  m.createPartnerTicket.mockResolvedValue(11)
  m.createPartnerTask.mockResolvedValue(22)
  m.postRecordComment.mockResolvedValue({})
  m.createAttachmentsForRecord.mockResolvedValue(undefined)
  m.validateChatterUploadFiles.mockReturnValue({ ok: true })
})

describe('createStructuredProcedureRecord — guards', () => {
  it('sin sesión: forbidden y nada más se toca', async () => {
    m.getSession.mockResolvedValue(null)
    expect(await run()).toEqual({ ok: false, error: 'forbidden' })
    expect(m.checkRateLimit).not.toHaveBeenCalled()
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
  })

  it('rol que no es cliente ni colaborador: forbidden', async () => {
    m.getSession.mockResolvedValue(sessionFor('admin'))
    expect(await run()).toEqual({ ok: false, error: 'forbidden' })
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
  })

  it('colaborador sin /tramites en escritura: forbidden antes del rate limit', async () => {
    m.getSession.mockResolvedValue(sessionFor('worker'))
    m.getWorkerWriteSections.mockResolvedValue(new Set(['/documentos']))
    expect(await run()).toEqual({ ok: false, error: 'forbidden' })
    expect(m.checkRateLimit).not.toHaveBeenCalled()
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
  })

  it('colaborador con /tramites en escritura pasa', async () => {
    m.getSession.mockResolvedValue(sessionFor('worker'))
    m.getWorkerWriteSections.mockResolvedValue(new Set(['/tramites']))
    expect(await run()).toMatchObject({ ok: true })
  })

  it('cliente no consulta secciones de escritura', async () => {
    await run()
    expect(m.getWorkerWriteSections).not.toHaveBeenCalled()
  })

  it('tipo retirado: forbidden sin consumir rate limit', async () => {
    m.isProcedureTypeAvailable.mockReturnValue(false)
    expect(await run()).toEqual({ ok: false, error: 'forbidden' })
    expect(m.checkRateLimit).not.toHaveBeenCalled()
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
  })

  it('rate limit: clave por usuario con 5 por 300 s; si se supera, rate_limited sin resolver partner', async () => {
    await run()
    expect(m.checkRateLimit).toHaveBeenCalledWith('create-procedure-record:u-client', {
      limit: 5,
      windowSeconds: 300,
    })
    m.checkRateLimit.mockResolvedValue(false)
    expect(await run()).toEqual({ ok: false, error: 'rate_limited' })
    expect(m.resolveClientOdooPartnerId).toHaveBeenCalledTimes(1)
  })

  it('sin partner vinculado: not_linked', async () => {
    m.resolveClientOdooPartnerId.mockResolvedValue(null)
    expect(await run()).toEqual({ ok: false, error: 'not_linked' })
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
  })

  it('Odoo sin configurar: odoo_unavailable', async () => {
    m.isOdooApiConfigured.mockReturnValue(false)
    expect(await run()).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
  })
})

describe('createStructuredProcedureRecord — validación', () => {
  it('payload inválido: validation con fieldErrors y sin crear nada', async () => {
    const result = await run({ payload: { ...payload, dni: 'xx', endDate: '' } })
    expect(result).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { dni: 'dniInvalid', endDate: 'dateRequired' },
    })
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
    expect(m.postRecordComment).not.toHaveBeenCalled()
  })

  it('valida el payload NORMALIZADO: espacios en el DNI no lo invalidan', async () => {
    const result = await run({ payload: { ...payload, dni: ' 1234 5678 z ' } })
    expect(result).toMatchObject({ ok: true })
  })

  it('adjunto inválido: validation con identityDocument y sin crear', async () => {
    m.validateChatterUploadFiles.mockReturnValue({ ok: false, error: 'invalid_attachment' })
    const result = await run({ identityAttachment: file })
    expect(result).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { identityDocument: 'attachmentRequired' },
    })
    expect(m.validateChatterUploadFiles).toHaveBeenCalledWith([file])
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
  })

  it('sin adjunto no se llama a la validación de adjuntos', async () => {
    await run({ identityAttachment: null })
    expect(m.validateChatterUploadFiles).not.toHaveBeenCalled()
  })
})

describe('createStructuredProcedureRecord — creación', () => {
  it('ticket: crea ticket (no task) con partner, asunto y descripción; devuelve id y nombre', async () => {
    const result = await run()
    expect(m.createPartnerTask).not.toHaveBeenCalled()
    expect(m.createPartnerTicket).toHaveBeenCalledWith(
      expect.objectContaining({
        partnerId: 999,
        subject: expect.any(String),
        description: expect.any(String),
      })
    )
    const arg = m.createPartnerTicket.mock.calls[0][0]
    expect(result).toEqual({ ok: true, recordId: 11, name: arg.subject })
    expect(arg.subject.length).toBeGreaterThan(0)
  })

  it('task: crea task (no ticket)', async () => {
    const result = await run({ recordKind: 'task' })
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
    expect(m.createPartnerTask).toHaveBeenCalledWith(
      expect.objectContaining({ partnerId: 999, name: expect.any(String) })
    )
    expect(result).toMatchObject({ ok: true, recordId: 22 })
  })

  it('chatter: postChatterMessage true publica en el modelo del tipo; false no publica', async () => {
    await run({ recordKind: 'task' })
    expect(m.postRecordComment).toHaveBeenCalledWith(
      expect.objectContaining({ resModel: 'model:task', recordId: 22, clientPartnerId: 999 })
    )
    m.postRecordComment.mockClear()
    await run({ postChatterMessage: false })
    expect(m.postRecordComment).not.toHaveBeenCalled()
  })

  it('adjunto: se sube al record creado con su modelo', async () => {
    await run({ identityAttachment: file })
    expect(m.createAttachmentsForRecord).toHaveBeenCalledWith({
      resModel: 'model:ticket',
      resId: 11,
      files: [file],
    })
  })

  it('adjunto: un fallo al subir es best-effort y el record sigue siendo ok', async () => {
    m.createAttachmentsForRecord.mockRejectedValue(new Error('boom'))
    const result = await run({ identityAttachment: file })
    expect(result).toMatchObject({ ok: true, recordId: 11 })
    expect(updateTag).toHaveBeenCalledWith('tag:999')
  })

  it('expira el snapshot del partner tras crear', async () => {
    await run()
    expect(updateTag).toHaveBeenCalledWith('tag:999')
  })
})

describe('createStructuredProcedureRecord — bajas de cliente', () => {
  const bajaAutonomo = {
    type: 'baja-autonomo' as const,
    desiredDate: '2099-01-01',
    reason: 'cese_actividad',
    observations: '',
  }

  it('baja de autónomo: crea el ticket sin nombre ni DNI y con la fecha de la petición', async () => {
    const result = await run({ payload: bajaAutonomo })
    expect(result).toMatchObject({ ok: true, recordId: 11, name: 'Baja de autónomo' })
    const arg = m.createPartnerTicket.mock.calls[0][0]
    expect(arg.description).toContain('Fecha de la petición')
  })

  it('baja de servicio sin servicio: devuelve el error de validación y no crea nada', async () => {
    const result = await run({
      payload: { type: 'baja-servicio', service: '', desiredDate: '2099-01-01', observations: '' },
    })
    expect(result).toEqual({
      ok: false,
      error: 'validation',
      fieldErrors: { service: 'selectRequired' },
    })
    expect(m.createPartnerTicket).not.toHaveBeenCalled()
  })

  it('la misma fecha de petición va en la descripción y en el chatter', async () => {
    await run({ payload: bajaAutonomo })
    const description: string = m.createPartnerTicket.mock.calls[0][0].description
    const chatter: string = m.postRecordComment.mock.calls[0][0].htmlBody
    const dateText = (html: string) => html.match(/\d{1,2} de \w+ de \d{4} a las \d{1,2}:\d{2}/)?.[0]
    expect(dateText(description)).toBeDefined()
    expect(dateText(description)).toEqual(dateText(chatter))
  })
})

describe('createStructuredProcedureRecord — mapeo de errores de Odoo', () => {
  it.each([
    ['ODOO_TICKET_TEAM_NOT_CONFIGURED', 'odoo_unavailable'],
    ['ODOO_CLIENT_PROJECT_NOT_FOUND', 'not_linked'],
    ['ODOO_TICKET_CREATE_FAILED', 'create_failed'],
    ['ODOO_TASK_CREATE_FAILED', 'create_failed'],
    ['cualquier otra cosa', 'odoo_unavailable'],
  ])('%s -> %s', async (message, expected) => {
    m.createPartnerTicket.mockRejectedValue(new Error(message))
    expect(await run()).toEqual({ ok: false, error: expected })
    expect(updateTag).not.toHaveBeenCalled()
  })

  it('un rechazo que no es Error es odoo_unavailable', async () => {
    m.createPartnerTicket.mockRejectedValue('string')
    expect(await run()).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('si falla el chatter el resultado es error y no se expira el snapshot', async () => {
    m.postRecordComment.mockRejectedValue(new Error('x'))
    expect(await run()).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(updateTag).not.toHaveBeenCalled()
    expect(m.createAttachmentsForRecord).not.toHaveBeenCalled()
  })
})
