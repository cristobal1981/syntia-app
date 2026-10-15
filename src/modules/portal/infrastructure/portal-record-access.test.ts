import { describe, expect, it, vi, beforeEach } from 'vitest'

import {
  canClientReplyOnRecord,
  getOdooModelForRecordKind,
  resolveTaskWorkerSection,
  verifyClientRecordAccess,
} from '@/src/modules/portal/infrastructure/portal-record-access'

const { getCachedTramitesSnapshot, getCachedObligacionTaskIndex, odooSearchRead } = vi.hoisted(
  () => ({
    getCachedTramitesSnapshot: vi.fn(),
    getCachedObligacionTaskIndex: vi.fn(),
    odooSearchRead: vi.fn(),
  })
)

vi.mock('@/src/modules/portal/infrastructure/cached-client-odoo-access', () => ({
  getCachedTramitesSnapshot,
  getCachedObligacionTaskIndex,
}))
vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({ odooSearchRead }))
vi.mock('@/src/modules/tramites/infrastructure/tramites-env', () => ({
  getOdooTicketsModel: () => 'helpdesk.ticket',
  getTicketClosedField: () => 'close_date',
}))

const PARTNER_ID = 42

beforeEach(() => {
  vi.resetAllMocks()
})

describe('resolveTaskWorkerSection', () => {
  it('resolves a task that is in the tramites snapshot to /tramites', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [{ id: 101 }], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [] })

    const section = await resolveTaskWorkerSection(101, PARTNER_ID)

    expect(section).toBe('/tramites')
  })

  it('resolves a task that is only in the obligación task index to /obligaciones', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [{ id: 202 }] })

    const section = await resolveTaskWorkerSection(202, PARTNER_ID)

    expect(section).toBe('/obligaciones')
  })

  it('returns null for a task id that belongs to neither snapshot (e.g. another company entirely)', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [{ id: 101 }], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [{ id: 202 }] })

    const section = await resolveTaskWorkerSection(999, PARTNER_ID)

    expect(section).toBeNull()
  })

  it('prefers /tramites when a task id somehow appears in both snapshots (defensive: should never actually happen)', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [{ id: 303 }], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [{ id: 303 }] })

    const section = await resolveTaskWorkerSection(303, PARTNER_ID)

    expect(section).toBe('/tramites')
  })

  it('queries both snapshots for the given partner, not a hardcoded one', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [] })

    await resolveTaskWorkerSection(1, 777)

    expect(getCachedTramitesSnapshot).toHaveBeenCalledWith(777)
    expect(getCachedObligacionTaskIndex).toHaveBeenCalledWith(777)
  })
})

describe('verifyClientRecordAccess', () => {
  beforeEach(() => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [], tickets: [] })
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [] })
  })

  it('task in tramites snapshot: granted without calling Odoo', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [{ id: 5 }], tickets: [] })

    expect(await verifyClientRecordAccess('task', 5, PARTNER_ID)).toBe(true)
    expect(getCachedTramitesSnapshot).toHaveBeenCalledWith(PARTNER_ID)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('task in obligación index: granted without calling Odoo', async () => {
    getCachedObligacionTaskIndex.mockResolvedValue({ leaves: [{ id: 6 }] })

    expect(await verifyClientRecordAccess('task', 6, PARTNER_ID)).toBe(true)
    expect(getCachedObligacionTaskIndex).toHaveBeenCalledWith(PARTNER_ID)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('ticket in snapshot: granted without calling Odoo', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [], tickets: [{ id: 7 }] })

    expect(await verifyClientRecordAccess('ticket', 7, PARTNER_ID)).toBe(true)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('ticket id present only among snapshot TASKS does not grant ticket access', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [{ id: 7 }], tickets: [] })
    odooSearchRead.mockResolvedValue([])

    expect(await verifyClientRecordAccess('ticket', 7, PARTNER_ID)).toBe(false)
  })

  it('task id present only among snapshot TICKETS does not grant task access', async () => {
    getCachedTramitesSnapshot.mockResolvedValue({ tasks: [], tickets: [{ id: 8 }] })
    odooSearchRead.mockResolvedValue([])

    expect(await verifyClientRecordAccess('task', 8, PARTNER_ID)).toBe(false)
  })

  it('task not in snapshot: follows task -> project -> partner and grants when partner matches', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 9, project_id: [55, 'P'] }])
      .mockResolvedValueOnce([{ id: 55, partner_id: [PARTNER_ID, 'Me'] }])

    expect(await verifyClientRecordAccess('task', 9, PARTNER_ID)).toBe(true)
    expect(odooSearchRead).toHaveBeenNthCalledWith(1, 'project.task', {
      domain: [['id', '=', 9]],
      fields: ['project_id'],
      limit: 1,
    })
    expect(odooSearchRead).toHaveBeenNthCalledWith(2, 'project.project', {
      domain: [['id', '=', 55]],
      fields: ['partner_id'],
      limit: 1,
    })
  })

  it('task whose project belongs to ANOTHER partner is denied', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 9, project_id: [55, 'P'] }])
      .mockResolvedValueOnce([{ id: 55, partner_id: [PARTNER_ID + 1, 'Other'] }])

    expect(await verifyClientRecordAccess('task', 9, PARTNER_ID)).toBe(false)
  })

  it('task whose project has no partner (false) is denied', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 9, project_id: [55, 'P'] }])
      .mockResolvedValueOnce([{ id: 55, partner_id: false }])

    expect(await verifyClientRecordAccess('task', 9, PARTNER_ID)).toBe(false)
  })

  it('task whose project is missing from Odoo is denied', async () => {
    odooSearchRead
      .mockResolvedValueOnce([{ id: 9, project_id: [55, 'P'] }])
      .mockResolvedValueOnce([])

    expect(await verifyClientRecordAccess('task', 9, PARTNER_ID)).toBe(false)
  })

  it('task without a project is denied and the project is never queried', async () => {
    odooSearchRead.mockResolvedValueOnce([{ id: 9, project_id: false }])

    expect(await verifyClientRecordAccess('task', 9, PARTNER_ID)).toBe(false)
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })

  it('task not found in Odoo is denied', async () => {
    odooSearchRead.mockResolvedValueOnce([])

    expect(await verifyClientRecordAccess('task', 9, PARTNER_ID)).toBe(false)
    expect(odooSearchRead).toHaveBeenCalledTimes(1)
  })

  it('ticket not in snapshot: queries the tickets model and grants when partner matches', async () => {
    odooSearchRead.mockResolvedValueOnce([{ id: 11, partner_id: [PARTNER_ID, 'Me'] }])

    expect(await verifyClientRecordAccess('ticket', 11, PARTNER_ID)).toBe(true)
    expect(odooSearchRead).toHaveBeenCalledWith('helpdesk.ticket', {
      domain: [['id', '=', 11]],
      fields: ['partner_id'],
      limit: 1,
    })
  })

  it('ticket of ANOTHER partner is denied', async () => {
    odooSearchRead.mockResolvedValueOnce([{ id: 11, partner_id: [PARTNER_ID + 1, 'Other'] }])

    expect(await verifyClientRecordAccess('ticket', 11, PARTNER_ID)).toBe(false)
  })

  it('ticket without partner or not found is denied', async () => {
    odooSearchRead.mockResolvedValueOnce([{ id: 11, partner_id: false }])
    expect(await verifyClientRecordAccess('ticket', 11, PARTNER_ID)).toBe(false)

    odooSearchRead.mockResolvedValueOnce([])
    expect(await verifyClientRecordAccess('ticket', 11, PARTNER_ID)).toBe(false)
  })

  it('fails closed: an Odoo error is propagated, never turned into access granted', async () => {
    odooSearchRead.mockRejectedValue(new Error('ODOO_DOWN'))

    await expect(verifyClientRecordAccess('task', 9, PARTNER_ID)).rejects.toThrow('ODOO_DOWN')
    await expect(verifyClientRecordAccess('ticket', 9, PARTNER_ID)).rejects.toThrow('ODOO_DOWN')
  })

  it('fails closed: a snapshot error is propagated', async () => {
    getCachedTramitesSnapshot.mockRejectedValue(new Error('SNAP'))

    await expect(verifyClientRecordAccess('task', 9, PARTNER_ID)).rejects.toThrow('SNAP')
  })
})

describe('getOdooModelForRecordKind', () => {
  it('maps task and ticket to their Odoo models', () => {
    expect(getOdooModelForRecordKind('task')).toBe('project.task')
    expect(getOdooModelForRecordKind('ticket')).toBe('helpdesk.ticket')
  })
})

describe('canClientReplyOnRecord', () => {
  it('always allows replying on tasks without querying Odoo', async () => {
    expect(await canClientReplyOnRecord('task', 1)).toBe(true)
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('queries the ticket closed field', async () => {
    odooSearchRead.mockResolvedValue([{ id: 1, close_date: false }])

    await canClientReplyOnRecord('ticket', 1)

    expect(odooSearchRead).toHaveBeenCalledWith('helpdesk.ticket', {
      domain: [['id', '=', 1]],
      fields: ['close_date'],
      limit: 1,
    })
  })

  it.each([false, null, undefined, '', '   '])(
    'open ticket (closed value %j) can be replied to',
    async (closed) => {
      odooSearchRead.mockResolvedValue([{ id: 1, close_date: closed }])
      expect(await canClientReplyOnRecord('ticket', 1)).toBe(true)
    }
  )

  it.each(['2026-01-01 10:00:00', true, 123])(
    'closed ticket (closed value %j) cannot be replied to',
    async (closed) => {
      odooSearchRead.mockResolvedValue([{ id: 1, close_date: closed }])
      expect(await canClientReplyOnRecord('ticket', 1)).toBe(false)
    }
  )

  it('missing ticket cannot be replied to', async () => {
    odooSearchRead.mockResolvedValue([])
    expect(await canClientReplyOnRecord('ticket', 1)).toBe(false)
  })

  it('propagates Odoo errors instead of allowing the reply', async () => {
    odooSearchRead.mockRejectedValue(new Error('ODOO_DOWN'))
    await expect(canClientReplyOnRecord('ticket', 1)).rejects.toThrow('ODOO_DOWN')
  })
})
