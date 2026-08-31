import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import { createAltaTrabajadorTaskAction } from '@/src/modules/alta-trabajador/application/create-alta-trabajador-task-action'
import type { TrabajadorAltaPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'

const {
  getSession,
  getWorkerWriteSections,
  resolveClientOdooPartnerId,
  isOdooApiConfigured,
  createPartnerTask,
  postRecordComment,
  createAttachmentsForRecord,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientOdooPartnerId: vi.fn(),
  isOdooApiConfigured: vi.fn(),
  createPartnerTask: vi.fn(),
  postRecordComment: vi.fn(),
  createAttachmentsForRecord: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections,
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
  getSession.mockResolvedValue(sessionFor('client'))
  resolveClientOdooPartnerId.mockResolvedValue(999)
  isOdooApiConfigured.mockReturnValue(true)
  createPartnerTask.mockResolvedValue(7)
  createAttachmentsForRecord.mockResolvedValue([1])
})

describe('createAltaTrabajadorTaskAction (/tramites section gate for colaboradores)', () => {
  it('refuses a worker without /tramites in write before ever hitting Odoo', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/documentos']))

    const result = await createAltaTrabajadorTaskAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: false, error: 'forbidden' })
    expect(resolveClientOdooPartnerId).not.toHaveBeenCalled()
    expect(createPartnerTask).not.toHaveBeenCalled()
  })

  it('lets a worker with /tramites granted at "write" level create the task', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getWorkerWriteSections.mockResolvedValue(new Set(['/tramites']))

    const result = await createAltaTrabajadorTaskAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: true })
    expect(createPartnerTask).toHaveBeenCalled()
  })

  it('never section-checks a full client', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await createAltaTrabajadorTaskAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: true })
    expect(getWorkerWriteSections).not.toHaveBeenCalled()
  })
})

describe('createAltaTrabajadorTaskAction (no chatter message)', () => {
  it('never posts a chatter message — the resumen already lives in the task description', async () => {
    const result = await createAltaTrabajadorTaskAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: true })
    expect(postRecordComment).not.toHaveBeenCalled()
  })
})

describe('createAltaTrabajadorTaskAction (identity document attachment)', () => {
  it('creates the task without touching attachments when there is no identity document', async () => {
    const result = await createAltaTrabajadorTaskAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: true })
    expect(createAttachmentsForRecord).not.toHaveBeenCalled()
  })

  it('rejects up front an identity document that fails attachment validation', async () => {
    const result = await createAltaTrabajadorTaskAction(
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
    const result = await createAltaTrabajadorTaskAction(
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

    const result = await createAltaTrabajadorTaskAction(
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

describe('createAltaTrabajadorTaskAction (Odoo error mapping)', () => {
  it('maps a missing client project to not_linked', async () => {
    createPartnerTask.mockRejectedValue(new Error('ODOO_CLIENT_PROJECT_NOT_FOUND'))

    const result = await createAltaTrabajadorTaskAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: false, error: 'not_linked' })
  })

  it('maps a task-create failure to create_failed', async () => {
    createPartnerTask.mockRejectedValue(new Error('ODOO_TASK_CREATE_FAILED'))

    const result = await createAltaTrabajadorTaskAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: false, error: 'create_failed' })
  })

  it('falls back to odoo_unavailable for any other error', async () => {
    createPartnerTask.mockRejectedValue(new Error('ODOO_TIMEOUT'))

    const result = await createAltaTrabajadorTaskAction(altaTrabajadorPayload())

    expect(result).toMatchObject({ ok: false, error: 'odoo_unavailable' })
  })
})
