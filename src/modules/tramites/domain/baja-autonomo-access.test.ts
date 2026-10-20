import { describe, expect, it } from 'vitest'

import {
  BAJA_AUTONOMO_ACCESS_GRACE_DAYS,
  bajaAutonomoDownloadDeadline,
} from '@/src/modules/tramites/domain/baja-autonomo-access'

describe('bajaAutonomoDownloadDeadline', () => {
  it('el margen son 5 días', () => {
    expect(BAJA_AUTONOMO_ACCESS_GRACE_DAYS).toBe(5)
  })

  it('suma 5 días a la fecha de baja', () => {
    expect(bajaAutonomoDownloadDeadline('2026-11-10')).toBe('2026-11-15')
  })

  it('cruza fin de mes y de año', () => {
    expect(bajaAutonomoDownloadDeadline('2026-10-28')).toBe('2026-11-02')
    expect(bajaAutonomoDownloadDeadline('2026-12-31')).toBe('2027-01-05')
  })

  it('respeta los años bisiestos', () => {
    expect(bajaAutonomoDownloadDeadline('2028-02-27')).toBe('2028-03-03')
    expect(bajaAutonomoDownloadDeadline('2027-02-27')).toBe('2027-03-04')
  })
})
