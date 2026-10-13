import { describe, expect, it } from 'vitest'

import { guias } from '@/content/guias'
import {
  getGuideBySlug,
  getGuidesByCategory,
  getGuidesForModelCode,
  getGuidesForWindowSlugs,
} from '@/src/modules/guias/domain/guide-search'

describe('getGuideBySlug', () => {
  it('finds a real guide by its exact slug', () => {
    expect(getGuideBySlug('modelos-aeat')?.slug).toBe('modelos-aeat')
  })

  it('returns undefined for an unknown slug instead of throwing', () => {
    expect(getGuideBySlug('no-existe-esta-guia')).toBeUndefined()
  })
})

describe('getGuidesForWindowSlugs', () => {
  it('resolves a list of slugs to their entries, preserving order', () => {
    const slugs = guias.entries.slice(0, 2).map((entry) => entry.slug)
    const result = getGuidesForWindowSlugs(slugs)
    expect(result.map((entry) => entry.slug)).toEqual(slugs)
  })

  it('silently drops unknown slugs instead of returning undefined entries', () => {
    const result = getGuidesForWindowSlugs(['no-existe', 'modelos-aeat'])
    expect(result).toHaveLength(1)
    expect(result[0]?.slug).toBe('modelos-aeat')
  })

  it('returns an empty array for an empty input', () => {
    expect(getGuidesForWindowSlugs([])).toEqual([])
  })
})

describe('getGuidesForModelCode', () => {
  it('only returns guides whose relatedModelCodes actually include the code', () => {
    const anyEntryWithCode = guias.entries.find(
      (entry) => entry.relatedModelCodes && entry.relatedModelCodes.length > 0
    )
    if (!anyEntryWithCode?.relatedModelCodes?.[0]) {
      // No hay datos de ejemplo en content/guias.ts para probar esto de verdad.
      return
    }
    const code = anyEntryWithCode.relatedModelCodes[0]
    const result = getGuidesForModelCode(code)
    expect(result.length).toBeGreaterThan(0)
    for (const entry of result) {
      expect(entry.relatedModelCodes).toContain(code)
    }
  })

  it('returns an empty array for a model code nothing references', () => {
    expect(getGuidesForModelCode('MODELO-QUE-NO-EXISTE-999')).toEqual([])
  })
})

describe('getGuidesByCategory', () => {
  it('every group only contains entries that actually belong to that category', () => {
    for (const group of getGuidesByCategory()) {
      for (const entry of group.entries) {
        expect(entry.category).toBe(group.category)
      }
    }
  })

  it('omits categories with zero entries instead of returning empty groups', () => {
    for (const group of getGuidesByCategory()) {
      expect(group.entries.length).toBeGreaterThan(0)
    }
  })

  it('every real guide entry appears in exactly one group', () => {
    const groups = getGuidesByCategory()
    const allGroupedSlugs = groups.flatMap((group) =>
      group.entries.map((entry) => entry.slug)
    )
    const allRealSlugs = guias.entries.map((entry) => entry.slug)
    expect(allGroupedSlugs.sort()).toEqual(allRealSlugs.sort())
  })

  it('labels each group with the real category label, not the raw id', () => {
    for (const group of getGuidesByCategory()) {
      expect(group.label).toBe(guias.categories[group.category])
    }
  })
})
