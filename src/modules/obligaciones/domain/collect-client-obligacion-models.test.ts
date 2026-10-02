import { describe, expect, it } from 'vitest'

import { collectClientObligacionModels } from '@/src/modules/obligaciones/domain/collect-client-obligacion-models'
import type { ObligacionesSnapshot } from '@/src/modules/obligaciones/domain/types'

function snapshotWithTaskNames(names: string[]): ObligacionesSnapshot {
  return {
    years: [
      {
        year: 2026,
        label: '2026',
        periods: [
          {
            key: 'p',
            label: 'Anuales',
            tasks: names.map((name, index) => ({
              id: index + 1,
              name,
              attachmentCount: 0,
            })),
          },
        ],
      },
    ],
  }
}

describe('collectClientObligacionModels', () => {
  it('dedupes repeated models across tasks/periods/years down to a unique label list', () => {
    const snapshot = snapshotWithTaskNames([
      'Modelo 303 - Cliente (Ene)',
      'Modelo 303 - Cliente (Feb)',
      'Modelo 100 - Cliente',
    ])
    expect(collectClientObligacionModels(snapshot)).toEqual(['Modelo 100', 'Modelo 303'])
  })

  it('sorts by the numeric model code (130 before 303), NOT alphabetically ("130" vs "303" happens to agree, so use 9 vs 100 to prove it)', () => {
    const snapshot = snapshotWithTaskNames(['Modelo 100 - Cliente', 'Modelo 9 - Cliente'])
    // alphabetical would put "Modelo 100" before "Modelo 9" (string compare);
    // numeric-aware sort must put Modelo 9 first.
    expect(collectClientObligacionModels(snapshot)).toEqual(['Modelo 9', 'Modelo 100'])
  })

  it('a model-less label (no "Modelo N" match) falls back to locale string comparison, not crashing', () => {
    const snapshot = snapshotWithTaskNames(['Algo raro', 'Modelo 100 - Cliente'])
    expect(collectClientObligacionModels(snapshot)).toEqual(['Algo raro', 'Modelo 100'])
  })

  it('an empty snapshot returns an empty list', () => {
    expect(collectClientObligacionModels({ years: [] })).toEqual([])
  })
})
