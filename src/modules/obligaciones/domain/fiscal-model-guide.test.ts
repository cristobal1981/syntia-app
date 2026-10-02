import { describe, expect, it } from 'vitest'

import {
  extractModelCodeFromLabel,
  fiscalModelMatchesQuery,
  formatKeywordHashtag,
  getFiscalModelGuideByCode,
  getFiscalModelGuideByLabel,
  getSortedFiscalModelGuideEntries,
  modelLabelMatchesGuideQuery,
  normalizeGuideSearchText,
} from '@/src/modules/obligaciones/domain/fiscal-model-guide'
import { fiscalModelsGuide } from '@/content/fiscal-models-guide'

describe('normalizeGuideSearchText', () => {
  it('strips diacritics and lowercases', () => {
    expect(normalizeGuideSearchText('Período Único')).toBe('periodo unico')
  })
})

describe('extractModelCodeFromLabel', () => {
  it('extracts the numeric code from "Modelo N"', () => {
    expect(extractModelCodeFromLabel('Modelo 303')).toBe('303')
  })

  it('returns null when the label has no "Modelo N" shape', () => {
    expect(extractModelCodeFromLabel('Algo raro')).toBeNull()
  })
})

describe('getFiscalModelGuideByCode / getFiscalModelGuideByLabel', () => {
  it('finds the real Modelo 100 guide entry by code', () => {
    expect(getFiscalModelGuideByCode('100')?.title).toBe('Declaración anual del IRPF')
  })

  it('finds the same entry by its "Modelo 100" label', () => {
    expect(getFiscalModelGuideByLabel('Modelo 100')?.code).toBe('100')
  })

  it('an unknown code/label returns undefined, not a thrown error', () => {
    expect(getFiscalModelGuideByCode('999999')).toBeUndefined()
    expect(getFiscalModelGuideByLabel('Totalmente desconocido')).toBeUndefined()
  })
})

describe('fiscalModelMatchesQuery', () => {
  const entry = fiscalModelsGuide.models.find((m) => m.code === '100')!

  it('an empty query matches everything', () => {
    expect(fiscalModelMatchesQuery(entry, '   ')).toBe(true)
  })

  it('matches the title/description text', () => {
    expect(fiscalModelMatchesQuery(entry, 'renta')).toBe(true)
  })

  it('matches a tag/keyword even when absent from title/description wording', () => {
    expect(fiscalModelMatchesQuery(entry, 'campaña')).toBe(true)
  })

  it('does not match an unrelated query', () => {
    expect(fiscalModelMatchesQuery(entry, 'totalmente irrelevante xyz')).toBe(false)
  })
})

describe('modelLabelMatchesGuideQuery', () => {
  it('an empty query matches everything', () => {
    expect(modelLabelMatchesGuideQuery('Modelo 100', '  ')).toBe(true)
  })

  it('matches directly against the model label text', () => {
    expect(modelLabelMatchesGuideQuery('Modelo 100', '100')).toBe(true)
  })

  it('falls through to the guide entry for a content match (e.g. "irpf" for Modelo 100)', () => {
    expect(modelLabelMatchesGuideQuery('Modelo 100', 'irpf')).toBe(true)
  })

  it('a model label with no guide entry and no direct text match returns false (not throwing)', () => {
    expect(modelLabelMatchesGuideQuery('Modelo 999999', 'irpf')).toBe(false)
  })
})

describe('getSortedFiscalModelGuideEntries', () => {
  it('sorts entries numerically by code', () => {
    const codes = getSortedFiscalModelGuideEntries().map((e) => Number.parseInt(e.code, 10))
    const sorted = [...codes].sort((a, b) => a - b)
    expect(codes).toEqual(sorted)
  })
})

describe('formatKeywordHashtag', () => {
  it('prefixes with # and strips whitespace', () => {
    expect(formatKeywordHashtag('declaración de la renta')).toBe('#declaracióndelarenta')
  })

  it('does not double-prefix a keyword that already starts with #', () => {
    expect(formatKeywordHashtag('#irpf')).toBe('#irpf')
  })
})
