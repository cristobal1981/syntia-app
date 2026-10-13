import { describe, expect, it } from 'vitest'

import {
  currentYearInMadrid,
  INVOICE_YEAR_FOLDER_NAME,
  invoiceFolderName,
  isSafeDriveFolderName,
} from '@/src/modules/documents/domain/invoice-upload-target'

describe('nombres de carpeta de facturas', () => {
  it('«Año en curso» y «Facturas de compras [año]»', () => {
    expect(INVOICE_YEAR_FOLDER_NAME).toBe('Año en curso')
    expect(invoiceFolderName(2026)).toBe('Facturas de compras [2026]')
  })
})

describe('currentYearInMadrid', () => {
  it('usa la hora de España, no la del servidor', () => {
    // 31 dic 2026 23:30 UTC ya es 1 ene 2027 en Madrid (UTC+1).
    expect(currentYearInMadrid(new Date('2026-12-31T23:30:00Z'))).toBe(2027)
    expect(currentYearInMadrid(new Date('2026-12-31T22:30:00Z'))).toBe(2026)
  })

  it('en verano (UTC+2) el cambio de año llega a las 22:00 UTC', () => {
    expect(currentYearInMadrid(new Date('2026-06-15T12:00:00Z'))).toBe(2026)
  })
})

describe('isSafeDriveFolderName', () => {
  it.each(['Año en curso', 'Facturas de compras [2026]'])('acepta %s', (name) => {
    expect(isSafeDriveFolderName(name)).toBe(true)
  })

  it.each(["a'b", 'a\\b', '', 'x'.repeat(256), 'a\nb'])('rechaza %j', (name) => {
    expect(isSafeDriveFolderName(name)).toBe(false)
  })
})
