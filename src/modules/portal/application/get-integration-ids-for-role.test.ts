import { describe, expect, it } from 'vitest'

import { getIntegrationIdsForRole } from '@/src/modules/portal/application/get-integration-ids-for-role'

describe('getIntegrationIdsForRole', () => {
  it('returns no integrations for client/worker — integrations are staff-only', () => {
    expect(getIntegrationIdsForRole('client')).toEqual([])
    expect(getIntegrationIdsForRole('worker')).toEqual([])
  })

  it('gives advisor odoo+google but NOT n8n', () => {
    const ids = getIntegrationIdsForRole('advisor')

    expect(ids).toEqual(['odoo', 'google'])
    expect(ids).not.toContain('n8n')
  })

  it('gives admin ALL THREE integrations, including n8n (admin-only)', () => {
    expect(getIntegrationIdsForRole('admin')).toEqual(['odoo', 'google', 'n8n'])
  })
})
