import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { createProcedureTicketAction } from '@/src/modules/tramites/application/create-procedure-ticket-action'
import type {
  TrabajadorAltaPayload,
  TrabajadorBajaPayload,
} from '@/src/modules/tramites/domain/procedure-ticket-types'

const {
  getSession,
  getAllowedSectionsForWorker,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  createPartnerTask,
  createPartnerTicket,
  postRecordComment,
  createAttachmentsForRecord,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  createPartnerTask: vi.fn(),
  createPartnerTicket: vi.fn(),
  postRecordComment: vi.fn(),
  createAttachmentsForRecord: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))
vi.mock('@/src/modules/tramites/application/resolve-client-odoo-partner-id', () => ({
  resolveClientOdooPartnerId,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
}))
vi.mock('@/src/modules/tramites/infrastructure/odoo-create-task-repository', () => ({
  createPartnerTask,
}))
vi.mock('@/src/modules/tramites/infrastructure/odoo-create-ticket-repository', () => ({
  createPartnerTicket,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-messages-repository', () => ({
  postRecordComment,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-attachments-repository', () => ({
  createAttachmentsForRecord,
}))
vi.mock('@/src/modules/portal/infrastructure/portal-record-access', () => ({
  getOdooModelForRecordKind: () => 'project.task',
}))
vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  tramitesSnapshotCacheTag: () => 'tag',
}))
vi.mock('next/cache', () => ({ updateTag: vi.fn() }))

function sessionFor(role: 'client' | 'worker'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  }
}

const payload: TrabajadorBajaPayload = {
  type: 'baja-trabajador',
  fullName: 'Ana García',
  dni: '12345678A',
  endDate: '2026-09-01',
  reason: 'Fin de contrato',
  observations: '',
}

function altaTrabajadorPayload(
  overrides: Partial<TrabajadorAltaPayload> = {}
): TrabajadorAltaPayload {
  return {
    type: 'alta-trabajador',
    firstName: 'Ana',
    lastName: 'García',
    fullName: 'Ana García',
    dni: '12345678Z',
    naf: '',
    email: '',
    phone: '',
    iban: '',
    birthDate: '1990-01-01',
    addressStreet: 'Calle Mayor',
    addressNumber: '1',
    addressCity: 'Madrid',
    addressProvince: 'Madrid',
    addressPostalCode: '28001',
    startDate: '2099-01-01',
    workCenter: 'Oficina central',
    position: 'Administrativo',
    jobDuties: 'Atención al cliente',
    sepeOccupationCode: '4400',
    studiesLevel: '32',
    contractType: 'indefinido',
    isTelework: 'no',
    salaryType: 'convenio',
    workSchedule: 'completa',
    workDays: 'lunes',
    workHoursDescription: '9:00 a 17:00',
    workScheduleNotes: '',
    observations: '',
    requiresWorkAuthorization: 'no',
    ...overrides,
  }
}

beforeEach(() => {
  vi.clearAllMocks()
  resolveClientOdooPartnerId.mockResolvedValue(999)
  isOdooApiConfigured.mockReturnValue(true)
  createPartnerTask.mockResolvedValue(7)
  createPartnerTicket.mockResolvedValue(7)
  postRecordComment.mockResolvedValue({})
  createAttachmentsForRecord.mockResolvedValue([1])
})

describe('createProcedureTicketAction (/tramites section gate for colaboradores)', () => {
  it('refuses a worker without /tramites granted before ever hitting Odoo', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))

    const result = await createProcedureTicketAction(payload)

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(createPartnerTask).not.toHaveBeenCalled()
  })

  it('lets a worker with /tramites granted create the procedure', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))

    const result = await createProcedureTicketAction(payload)

    expect(result).toMatchObject({ ok: true })
    expect(createPartnerTicket).toHaveBeenCalled()
  })

  it('never section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await createProcedureTicketAction(payload)

    expect(result).toMatchObject({ ok: true })
    expect(getAllowedSectionsForWorker).not.toHaveBeenCalled()
  })
})

describe('createProcedureTicketAction (alta-trabajador identity document attachment)', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('client'))
  })

  it('creates the task without touching attachments when there is no identity document', async () => {
    const result = await createProcedureTicketAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: true })
    expect(createAttachmentsForRecord).not.toHaveBeenCalled()
  })

  it('rejects up front an identity document that fails attachment validation', async () => {
    const result = await createProcedureTicketAction(
      altaTrabajadorPayload({
        requiresWorkAuthorization: 'si',
        identityDocument: {
          name: 'malware.exe',
          mimetype: 'application/x-msdownload',
          dataBase64: 'AA==',
        },
      })
    )

    expect(result).toMatchObject({ ok: false, error: 'validation' })
    expect(createPartnerTask).not.toHaveBeenCalled()
    expect(createAttachmentsForRecord).not.toHaveBeenCalled()
  })

  it('uploads the identity document as an attachment on the created task', async () => {
    const result = await createProcedureTicketAction(
      altaTrabajadorPayload({
        requiresWorkAuthorization: 'si',
        identityDocument: {
          name: 'autorizacion.pdf',
          mimetype: 'application/pdf',
          dataBase64: 'AA==',
        },
      })
    )

    expect(result).toMatchObject({ ok: true })
    expect(createAttachmentsForRecord).toHaveBeenCalledWith({
      resModel: 'project.task',
      resId: 7,
      files: [{ name: 'autorizacion.pdf', mimetype: 'application/pdf', dataBase64: 'AA==' }],
    })
  })

  it('still returns ok when the attachment upload fails (best-effort, task already created)', async () => {
    createAttachmentsForRecord.mockRejectedValue(new Error('ODOO_DOWN'))

    const result = await createProcedureTicketAction(
      altaTrabajadorPayload({
        requiresWorkAuthorization: 'si',
        identityDocument: {
          name: 'autorizacion.pdf',
          mimetype: 'application/pdf',
          dataBase64: 'AA==',
        },
      })
    )

    expect(result).toMatchObject({ ok: true })
  })
})
