import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  formatSignatureDate,
  formatSignatureDateCompact,
  getDaysUntilSignatureDue,
  isSignatureDueSoon,
  SIGNATURE_DUE_SOON_DAYS,
} from '@/src/modules/firmas/domain/signature-due-date'

describe('formatSignatureDate / formatSignatureDateCompact', () => {
  it('returns null for an undefined value', () => {
    expect(formatSignatureDate(undefined)).toBeNull()
    expect(formatSignatureDateCompact(undefined)).toBeNull()
  })

  it('returns null for an unparseable date string (not a thrown error)', () => {
    expect(formatSignatureDate('not-a-date')).toBeNull()
  })

  it('formats a valid date in long Spanish form', () => {
    expect(formatSignatureDate('2026-03-15')).toContain('marzo')
  })

  it('the compact variant uses a short month, differing from the long form', () => {
    const long = formatSignatureDate('2026-03-15')
    const compact = formatSignatureDateCompact('2026-03-15')
    expect(compact).not.toBe(long)
  })
})

describe('getDaysUntilSignatureDue / isSignatureDueSoon', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-03-10T15:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('returns null for an undefined due date', () => {
    expect(getDaysUntilSignatureDue(undefined)).toBeNull()
    expect(isSignatureDueSoon(undefined)).toBe(false)
  })

  it('returns null for an unparseable date', () => {
    expect(getDaysUntilSignatureDue('garbage')).toBeNull()
  })

  it('counts whole days remaining, ignoring time-of-day', () => {
    expect(getDaysUntilSignatureDue('2026-03-15')).toBe(5)
  })

  it('a date in the past returns a negative count', () => {
    expect(getDaysUntilSignatureDue('2026-03-05')).toBe(-5)
  })

  it('due today (0 days) counts as due soon', () => {
    expect(isSignatureDueSoon('2026-03-10')).toBe(true)
  })

  it(`exactly ${SIGNATURE_DUE_SOON_DAYS} days out is still due soon (inclusive boundary)`, () => {
    expect(isSignatureDueSoon('2026-03-17')).toBe(true)
  })

  it(`${SIGNATURE_DUE_SOON_DAYS + 1} days out is NOT due soon (exclusive just past the boundary)`, () => {
    expect(isSignatureDueSoon('2026-03-18')).toBe(false)
  })

  it('an OVERDUE signature (negative days) is NOT "due soon" — distinct state, not a false positive', () => {
    expect(isSignatureDueSoon('2026-03-05')).toBe(false)
  })
})
