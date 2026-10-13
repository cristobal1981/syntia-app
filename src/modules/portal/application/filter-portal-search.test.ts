import { describe, expect, it } from 'vitest'

import type { PortalSearchItem } from '@/src/modules/portal/domain/portal-search-types'
import {
  filterPortalSearchItems,
  getPortalSearchSuggestions,
} from '@/src/modules/portal/application/filter-portal-search'

function item(overrides: Partial<PortalSearchItem>): PortalSearchItem {
  return {
    id: 'id',
    kind: 'page',
    label: 'Label',
    href: '/x',
    icon: 'home',
    keywords: [],
    ...overrides,
  }
}

describe('filterPortalSearchItems', () => {
  it('returns all items unchanged when the query is empty or whitespace-only', () => {
    const items = [item({ id: 'a', label: 'Trámites' }), item({ id: 'b', label: 'Firmas' })]

    expect(filterPortalSearchItems(items, '')).toEqual(items)
    expect(filterPortalSearchItems(items, '   ')).toEqual(items)
  })

  it('matches on the label, case-insensitively', () => {
    const items = [item({ id: 'a', label: 'Obligaciones' }), item({ id: 'b', label: 'Firmas' })]

    const result = filterPortalSearchItems(items, 'obliga')

    expect(result.map((i) => i.id)).toEqual(['a'])
  })

  it('matches on the label ignoring accents (NFD normalization)', () => {
    const items = [item({ id: 'a', label: 'Óbligaciones' })]

    expect(filterPortalSearchItems(items, 'obligaciones')).toHaveLength(1)
    expect(filterPortalSearchItems(items, 'óbligaciones')).toHaveLength(1)
  })

  it('matches on the description when the label does not match', () => {
    const items = [
      item({ id: 'a', label: 'Guías', description: 'Plazos fiscales del modelo 303' }),
    ]

    expect(filterPortalSearchItems(items, 'modelo 303')).toHaveLength(1)
  })

  it('matches on keywords when neither label nor description match', () => {
    const items = [
      item({ id: 'a', label: 'Guías', description: 'Ayuda', keywords: ['iva', 'irpf'] }),
    ]

    expect(filterPortalSearchItems(items, 'irpf')).toHaveLength(1)
    expect(filterPortalSearchItems(items, 'iva')).toHaveLength(1)
  })

  it('excludes items with no match anywhere', () => {
    const items = [
      item({ id: 'a', label: 'Guías', description: 'Ayuda', keywords: ['iva'] }),
    ]

    expect(filterPortalSearchItems(items, 'facturas')).toEqual([])
  })

  it('matches as a substring, not only whole-word', () => {
    const items = [item({ id: 'a', label: 'Obligaciones' })]

    expect(filterPortalSearchItems(items, 'bliga')).toHaveLength(1)
  })
})

describe('getPortalSearchSuggestions', () => {
  const items = Array.from({ length: 7 }, (_, i) => item({ id: `item-${i}` }))

  it('defaults to the first 5 items', () => {
    const result = getPortalSearchSuggestions(items)

    expect(result.map((i) => i.id)).toEqual(['item-0', 'item-1', 'item-2', 'item-3', 'item-4'])
  })

  it('honors a custom limit', () => {
    const result = getPortalSearchSuggestions(items, 2)

    expect(result.map((i) => i.id)).toEqual(['item-0', 'item-1'])
  })

  it('returns all items when there are fewer than the limit', () => {
    const result = getPortalSearchSuggestions(items.slice(0, 3), 5)

    expect(result).toHaveLength(3)
  })
})
