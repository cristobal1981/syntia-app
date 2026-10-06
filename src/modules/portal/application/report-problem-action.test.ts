import { describe, expect, it, vi, beforeEach } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'
import {
  reportProblemAction,
  type ReportProblemInput,
} from '@/src/modules/portal/application/report-problem-action'

const { getSession, isOdooApiConfigured, createReportProblemTicket, formatOdooHtmlDocument } =
  vi.hoisted(() => ({
    getSession: vi.fn(),
    isOdooApiConfigured: vi.fn(),
    createReportProblemTicket: vi.fn(),
    formatOdooHtmlDocument: vi.fn(),
  }))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-report-problem-repository', () => ({
  createReportProblemTicket,
}))
vi.mock('@/lib/format/odoo-html', () => ({
  formatOdooHtmlDocument,
  escapeHtml: (value: string) => value,
}))

function sessionFor(role: 'client' | 'worker' | 'advisor' | 'admin'): PortalSession {
  return {
    user: {
      id: `u-${role}`,
      email: `${role}@example.com`,
      name: `${role} name`,
      role,
    },
    expiresAt: Date.now() + 100000,
  }
}

function validInput(overrides?: Partial<ReportProblemInput>): ReportProblemInput {
  return {
    area: 'tramites',
    problem: 'Algo no funciona',
    steps: '',
    errorShown: '',
    pathname: '/tramites',
    userAgent: 'test-agent',
    ...overrides,
  }
}

beforeEach(() => {
  vi.resetAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
  formatOdooHtmlDocument.mockReturnValue('<div>html</div>')
  createReportProblemTicket.mockResolvedValue(123)
})

describe('session/role gate', () => {
  it('rejects when there is no session, without ever checking Odoo config', async () => {
    getSession.mockResolvedValue(null)

    const result = await reportProblemAction(validInput())

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(isOdooApiConfigured).not.toHaveBeenCalled()
    expect(createReportProblemTicket).not.toHaveBeenCalled()
  })

  it('rejects a role that is neither client nor worker (e.g. advisor)', async () => {
    getSession.mockResolvedValue(sessionFor('advisor'))

    const result = await reportProblemAction(validInput())

    expect(result).toEqual({ ok: false, error: 'forbidden' })
    expect(createReportProblemTicket).not.toHaveBeenCalled()
  })

  it.each(['client', 'worker'] as const)('allows role "%s" through the gate', async (role) => {
    getSession.mockResolvedValue(sessionFor(role))

    const result = await reportProblemAction(validInput())

    expect(result).toMatchObject({ ok: true })
  })
})

describe('Odoo availability guard', () => {
  it('rejects with odoo_unavailable before running any field validation', async () => {
    getSession.mockResolvedValue(sessionFor('client'))
    isOdooApiConfigured.mockReturnValue(false)

    const result = await reportProblemAction(validInput({ problem: '' }))

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
    expect(createReportProblemTicket).not.toHaveBeenCalled()
  })
})

describe('field validation', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('client'))
  })

  it('rejects an area outside the known copy keys', async () => {
    const result = await reportProblemAction(validInput({ area: 'not-a-real-area' }))

    expect(result).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { area: 'areaRequired' },
    })
    expect(createReportProblemTicket).not.toHaveBeenCalled()
  })

  it('rejects an empty problem description', async () => {
    const result = await reportProblemAction(validInput({ problem: '   ' }))

    expect(result).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { problem: 'problemRequired' },
    })
  })

  it('rejects a problem description over 2000 chars', async () => {
    const result = await reportProblemAction(validInput({ problem: 'x'.repeat(2001) }))

    expect(result).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { problem: 'problemTooLong' },
    })
  })

  it('accepts a problem description at exactly the 2000 char boundary', async () => {
    const result = await reportProblemAction(validInput({ problem: 'x'.repeat(2000) }))

    expect(result).toMatchObject({ ok: true })
  })

  it('rejects steps over 1000 chars', async () => {
    const result = await reportProblemAction(validInput({ steps: 'x'.repeat(1001) }))

    expect(result).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { steps: 'stepsTooLong' },
    })
  })

  it('rejects errorShown over 1000 chars', async () => {
    const result = await reportProblemAction(validInput({ errorShown: 'x'.repeat(1001) }))

    expect(result).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: { errorShown: 'errorShownTooLong' },
    })
  })

  it('collects every field error at once rather than stopping at the first', async () => {
    const result = await reportProblemAction(
      validInput({
        area: 'nope',
        problem: '',
        steps: 'x'.repeat(1001),
        errorShown: 'x'.repeat(1001),
      })
    )

    expect(result).toMatchObject({
      ok: false,
      error: 'validation',
      fieldErrors: {
        area: 'areaRequired',
        problem: 'problemRequired',
        steps: 'stepsTooLong',
        errorShown: 'errorShownTooLong',
      },
    })
  })
})

describe('ticket creation (happy path and content)', () => {
  it('builds the ticket with trimmed fields, optional rows only when present, and the session identity', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    const result = await reportProblemAction(
      validInput({
        problem: '  algo falla  ',
        steps: '',
        errorShown: '',
      })
    )

    expect(formatOdooHtmlDocument).toHaveBeenCalledTimes(1)
    const call = formatOdooHtmlDocument.mock.calls[0][0]
    expect(call.sections[0].rows).toEqual([
      { label: 'Apartado afectado', value: 'Trámites' },
      { label: 'Descripción del problema', value: 'algo falla' },
    ])
    expect(call.sections[1].rows).toEqual([
      { label: 'Reportado por', value: 'client name (client@example.com)' },
      { label: 'Página', value: '/tramites' },
      { label: 'Navegador', value: 'test-agent' },
    ])

    expect(createReportProblemTicket).toHaveBeenCalledWith({
      name: 'Problema reportado: Trámites',
      descriptionHtml: '<div>html</div>',
      reporterName: 'client name',
      reporterEmail: 'client@example.com',
    })
    expect(result).toEqual({ ok: true, ticketId: 123 })
  })

  it('includes steps and errorShown rows only when they are non-empty after trimming', async () => {
    getSession.mockResolvedValue(sessionFor('client'))

    await reportProblemAction(
      validInput({ steps: '  1. hacer X  ', errorShown: '  error 500  ' })
    )

    const call = formatOdooHtmlDocument.mock.calls[0][0]
    expect(call.sections[0].rows).toEqual([
      { label: 'Apartado afectado', value: 'Trámites' },
      { label: 'Descripción del problema', value: 'Algo no funciona' },
      { label: 'Pasos para reproducirlo', value: '1. hacer X' },
      { label: 'Error mostrado', value: 'error 500' },
    ])
  })
})

describe('ticket creation failure mapping', () => {
  beforeEach(() => {
    getSession.mockResolvedValue(sessionFor('client'))
  })

  it('maps ODOO_TICKET_TEAM_NOT_CONFIGURED to odoo_unavailable', async () => {
    createReportProblemTicket.mockRejectedValue(new Error('ODOO_TICKET_TEAM_NOT_CONFIGURED'))

    const result = await reportProblemAction(validInput())

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('maps ODOO_TICKET_CREATE_FAILED to create_failed', async () => {
    createReportProblemTicket.mockRejectedValue(new Error('ODOO_TICKET_CREATE_FAILED'))

    const result = await reportProblemAction(validInput())

    expect(result).toEqual({ ok: false, error: 'create_failed' })
  })

  it('falls back to odoo_unavailable for an unrecognized Error message', async () => {
    createReportProblemTicket.mockRejectedValue(new Error('something else entirely'))

    const result = await reportProblemAction(validInput())

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })

  it('falls back to odoo_unavailable for a thrown non-Error value', async () => {
    createReportProblemTicket.mockRejectedValue('a plain string rejection')

    const result = await reportProblemAction(validInput())

    expect(result).toEqual({ ok: false, error: 'odoo_unavailable' })
  })
})
