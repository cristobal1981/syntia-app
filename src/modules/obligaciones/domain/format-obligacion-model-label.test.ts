import { describe, expect, it } from 'vitest'

import { formatObligacionModelLabel } from '@/src/modules/obligaciones/domain/format-obligacion-model-label'

describe('formatObligacionModelLabel', () => {
  it('strips the trailing " - client name" and keeps just "Modelo N"', () => {
    expect(formatObligacionModelLabel('Modelo 303 - Juan Pérez SL')).toBe('Modelo 303')
  })

  it('is case-insensitive on "Modelo"', () => {
    expect(formatObligacionModelLabel('modelo 111 - Cliente')).toBe('modelo 111')
  })

  it('a name with no " - suffix" and no "Modelo N" prefix returns itself trimmed', () => {
    expect(formatObligacionModelLabel('  Algo raro  ')).toBe('Algo raro')
  })

  it('a name with a "Modelo N" prefix but no client suffix still extracts "Modelo N"', () => {
    expect(formatObligacionModelLabel('Modelo 130')).toBe('Modelo 130')
  })

  it('when the trailing "- segment" strip still leaves a "Modelo N" prefix match, everything after "Modelo N" is discarded too (collapses to the bare model label)', () => {
    expect(formatObligacionModelLabel('Modelo 200 - Comercial García - Pérez SL')).toBe(
      'Modelo 200'
    )
  })

  it('a name with NO "Modelo N" prefix keeps everything up to (but not including) the last "- segment"', () => {
    expect(formatObligacionModelLabel('Algo raro - Comercial García - Pérez SL')).toBe(
      'Algo raro - Comercial García'
    )
  })
})
