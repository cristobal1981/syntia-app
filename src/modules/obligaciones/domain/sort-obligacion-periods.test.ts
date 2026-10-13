import { describe, expect, it } from 'vitest'

import {
  comparePeriodSortKeys,
  getMonthFromTaskName,
  getPeriodSortKey,
  normalizePeriodName,
  sortObligacionPeriodRows,
} from '@/src/modules/obligaciones/domain/sort-obligacion-periods'

describe('normalizePeriodName', () => {
  it('strips accents and lowercases', () => {
    expect(normalizePeriodName('Período Año')).toBe('periodo ano')
  })
})

describe('getPeriodSortKey — priority buckets', () => {
  // The whole display order (anual < trimestre < mensual < periodo < other)
  // lives in these bucket numbers — a swap here silently reorders every
  // client's fiscal calendar.
  it.each([
    ['Anuales', [0, 0, 'anuales']],
    ['Anual', [0, 0, 'anual']],
    ['Trimestre 1', [1, 1, 'trimestre 1']],
    ['Trimestre 4', [1, 4, 'trimestre 4']],
    ['Mensuales', [2, 0, 'mensuales']],
    ['Mensual', [2, 0, 'mensual']],
    ['Periodo 3', [3, 3, 'periodo 3']],
    ['Marzo', [2, 3, 'marzo']],
    ['Diciembre', [2, 12, 'diciembre']],
    ['Algo totalmente desconocido', [4, 0, 'algo totalmente desconocido']],
  ])('"%s" -> %j', (name, expected) => {
    expect(getPeriodSortKey(name)).toEqual(expected)
  })

  it('a month name is case/accent-insensitive', () => {
    expect(getPeriodSortKey('MARZO')).toEqual([2, 3, 'marzo'])
  })

  it('trimestre number is parsed from the digits right after "trimestre"', () => {
    expect(getPeriodSortKey('Trimestre 2 (extra text)')[1]).toBe(2)
  })
})

describe('comparePeriodSortKeys', () => {
  it('sorts anual before trimestre before mensual before periodo before other', () => {
    const keys = [
      getPeriodSortKey('Periodo 1'),
      getPeriodSortKey('Marzo'),
      getPeriodSortKey('Anual'),
      getPeriodSortKey('Trimestre 2'),
      getPeriodSortKey('Rareza'),
    ]
    const sorted = [...keys].sort(comparePeriodSortKeys)
    expect(sorted.map((k) => k[0])).toEqual([0, 1, 2, 3, 4])
  })

  it('within the same bucket, sorts by the numeric index (trimestre 1 before trimestre 4)', () => {
    const t4 = getPeriodSortKey('Trimestre 4')
    const t1 = getPeriodSortKey('Trimestre 1')
    expect(comparePeriodSortKeys(t1, t4)).toBeLessThan(0)
    expect(comparePeriodSortKeys(t4, t1)).toBeGreaterThan(0)
  })

  it('falls back to locale string compare on the third element when bucket and index tie', () => {
    expect(comparePeriodSortKeys([0, 0, 'anual'], [0, 0, 'anuales'])).toBeLessThan(0)
  })

  it('equal keys compare as 0', () => {
    expect(comparePeriodSortKeys([1, 2, 'trimestre 2'], [1, 2, 'trimestre 2'])).toBe(0)
  })
})

describe('sortObligacionPeriodRows', () => {
  it('sorts rows by fiscal priority, not alphabetically by name', () => {
    const rows = [
      { id: 1, name: 'Mensuales' },
      { id: 2, name: 'Anual' },
      { id: 3, name: 'Trimestre 3' },
    ]
    expect(sortObligacionPeriodRows(rows).map((r) => r.id)).toEqual([2, 3, 1])
  })

  it('DEFENSIVE COPY: does not mutate the input array', () => {
    const rows = [
      { id: 1, name: 'Mensuales' },
      { id: 2, name: 'Anual' },
    ]
    const original = [...rows]
    sortObligacionPeriodRows(rows)
    expect(rows).toEqual(original)
  })
})

describe('getMonthFromTaskName', () => {
  it('extracts the month even with a trailing " - client name" suffix', () => {
    expect(getMonthFromTaskName('Marzo - Juan Pérez SL')).toEqual({
      label: 'Marzo',
      monthIndex: 3,
    })
  })

  it('returns null when no month name is present', () => {
    expect(getMonthFromTaskName('Modelo 303 - Cliente')).toBeNull()
  })

  it('monthIndex is 1-based (Enero=1 .. Diciembre=12), not 0-based', () => {
    expect(getMonthFromTaskName('Enero')?.monthIndex).toBe(1)
    expect(getMonthFromTaskName('Diciembre')?.monthIndex).toBe(12)
  })
})
