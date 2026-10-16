import { describe, expect, it } from 'vitest'

import {
  countParsedFields,
  findDateInText,
  parseInvoiceText,
} from '@/src/modules/facturacion/domain/parse-invoice-text'

const IGIC_INVOICE = `
Papelería Insular S.L.
CIF: B35456789
C/ Triana 12, Arrecife

FACTURA
Factura Nº: A-9921
Fecha: 07/05/2026

Cliente: Estudio Gráfico Tías
NIF: 12345678Z

Descripción                 Importe
Papel y material de oficina 210,50

Base imponible 210,50 €
IGIC 7 % 14,74 €
Total factura 225,24 €
`

describe('parseInvoiceText — factura con IGIC', () => {
  const parsed = parseInvoiceText(IGIC_INVOICE, { ownTaxId: '12345678Z' })

  it('lee número, fecha y tercero (sin confundirlo con el NIF propio)', () => {
    expect(parsed.invoiceNumber).toBe('A-9921')
    expect(parsed.issueDate).toBe('2026-05-07')
    expect(parsed.counterpartyTaxId).toBe('B35456789')
    expect(parsed.counterpartyName).toBe('Papelería Insular S.L.')
  })

  it('lee base, tipo, total y detecta el régimen', () => {
    expect(parsed.baseCents).toBe(21050)
    expect(parsed.taxRate).toBe(7)
    expect(parsed.totalCents).toBe(22524)
    expect(parsed.regime).toBe('igic')
    expect(parsed.withholdingRate).toBeNull()
  })

  it('cuenta los campos entendidos', () => {
    expect(countParsedFields(parsed)).toBe(7)
  })
})

describe('parseInvoiceText — otros formatos', () => {
  it('factura con IVA, retención de IRPF y fecha escrita', () => {
    const parsed = parseInvoiceText(`
Marta Ruiz Consultora
NIF 87654321X
Factura número 2026/0042
Fecha de emisión: 3 de marzo de 2026
Base imponible: 1.000,00
IVA 21%: 210,00
Retención IRPF 15%: 150,00
Total: 1.060,00 €
`)
    expect(parsed.invoiceNumber).toBe('2026/0042')
    expect(parsed.issueDate).toBe('2026-03-03')
    expect(parsed.regime).toBe('iva')
    expect(parsed.baseCents).toBe(100000)
    expect(parsed.taxRate).toBe(21)
    expect(parsed.withholdingRate).toBe(15)
    expect(parsed.totalCents).toBe(106000)
    expect(parsed.counterpartyTaxId).toBe('87654321X')
  })

  it('el importe puede estar en la línea siguiente a su etiqueta', () => {
    const parsed = parseInvoiceText('Base imponible\n500,00\nIGIC 7%\n35,00\nTotal\n535,00')
    expect(parsed.baseCents).toBe(50000)
    expect(parsed.totalCents).toBe(53500)
  })

  it('sin base, la deduce del total y el tipo; sin total, lo deduce de la base', () => {
    expect(parseInvoiceText('IGIC 7%\nTotal 107,00').baseCents).toBe(10000)
    expect(parseInvoiceText('IGIC 7%\nBase imponible 100,00').totalCents).toBe(10700)
  })

  it('con retención no deduce importes (el total ya no es base + impuesto)', () => {
    const parsed = parseInvoiceText('IGIC 7%\nIRPF 15%\nTotal 92,00')
    expect(parsed.baseCents).toBeNull()
  })

  it('no confunde el subtotal con el total', () => {
    const parsed = parseInvoiceText('Subtotal 100,00\nIGIC 7% 7,00\nTotal 107,00')
    expect(parsed.totalCents).toBe(10700)
  })

  it('lee el vencimiento sin confundirlo con la fecha de la factura', () => {
    const parsed = parseInvoiceText('Fecha: 01/03/2026\nFecha de vencimiento: 31/03/2026\nFactura Nº: A-100')
    expect(parsed.issueDate).toBe('2026-03-01')
    expect(parsed.dueDate).toBe('2026-03-31')
  })

  it('descarta un vencimiento anterior a la factura', () => {
    const parsed = parseInvoiceText('Fecha: 01/03/2026\nVencimiento: 01/02/2026')
    expect(parsed.dueDate).toBeNull()
  })

  it('un texto sin datos de factura deja todo a null', () => {
    const parsed = parseInvoiceText('Hola, esto no es una factura.')
    expect(countParsedFields(parsed)).toBe(0)
    expect(parsed.baseCents).toBeNull()
    expect(parsed.issueDate).toBeNull()
    expect(parsed.regime).toBeNull()
  })

  it('texto vacío: nada que leer', () => {
    expect(countParsedFields(parseInvoiceText(''))).toBe(0)
  })

  it('un número pegado a «Factura» sin marcador también se lee', () => {
    expect(parseInvoiceText('Factura 2026-014\nFecha 03/03/2026').invoiceNumber).toBe('2026-014')
  })

  it('no toma un importe de «Total factura» como número de factura', () => {
    expect(parseInvoiceText('Total factura 225,24 €').invoiceNumber).toBeNull()
  })

  it('no toma la fecha como número de factura', () => {
    expect(parseInvoiceText('Fecha factura: 12/03/2026').invoiceNumber).toBeNull()
  })

  it('ignora el NIF propio aunque aparezca primero', () => {
    const parsed = parseInvoiceText('NIF 12345678Z\nProveedor B35000001', { ownTaxId: '12345678-z' })
    expect(parsed.counterpartyTaxId).toBe('B35000001')
  })
})

describe('findDateInText', () => {
  it.each([
    ['07/05/2026', '2026-05-07'],
    ['7-5-26', '2026-05-07'],
    ['2026-05-07', '2026-05-07'],
    ['7 de mayo de 2026', '2026-05-07'],
    ['Emitida el 31.12.2026 en Arrecife', '2026-12-31'],
  ])('%s → %s', (text, iso) => {
    expect(findDateInText(text)).toBe(iso)
  })

  it.each(['31/02/2026', '45/13/2026', '1 de brumario de 2026', 'sin fecha'])('rechaza «%s»', (text) => {
    expect(findDateInText(text)).toBeNull()
  })
})
