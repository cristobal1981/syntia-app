import { describe, expect, it } from 'vitest'

import {
  applyParsedInvoice,
  draftFromForm,
  emptyInvoiceForm,
  formFromInvoice,
  validateInvoiceForm,
  type InvoiceFormValues,
} from '@/src/modules/facturacion/domain/invoice-form'
import type { ParsedInvoice } from '@/src/modules/facturacion/domain/parse-invoice-text'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

function validForm(overrides: Partial<InvoiceFormValues> = {}): InvoiceFormValues {
  return {
    ...emptyInvoiceForm('recibida'),
    invoiceNumber: 'A-1',
    issueDate: '2026-05-07',
    counterpartyName: 'Papelería Insular S.L.',
    counterpartyTaxId: completeCif('B3545678'),
    counterpartyAddress: 'Calle Triana, 12, Arrecife',
    base: '210,50',
    ...overrides,
  }
}

const NOTHING: ParsedInvoice = {
  invoiceNumber: null,
  issueDate: null,
  dueDate: null,
  counterpartyName: null,
  counterpartyTaxId: null,
  regime: null,
  baseCents: null,
  taxRate: null,
  totalCents: null,
  withholdingRate: null,
}

describe('validateInvoiceForm', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validateInvoiceForm(validForm())).toEqual({})
  })

  it('el formulario vacío marca los campos obligatorios', () => {
    expect(Object.keys(validateInvoiceForm(emptyInvoiceForm())).sort()).toEqual(
      ['base', 'counterpartyName', 'counterpartyTaxId', 'invoiceNumber', 'issueDate'].sort()
    )
  })

  it('rechaza fechas imposibles', () => {
    expect(validateInvoiceForm(validForm({ issueDate: '2026-02-31' })).issueDate).toBe('issueDateInvalid')
  })

  it.each(['0', '-5', 'abc', ''])('rechaza la base «%s»', (base) => {
    expect(validateInvoiceForm(validForm({ base })).base).toBe('baseInvalid')
  })

  it('el porcentaje deducible debe ser un entero de 0 a 100, solo en recibidas', () => {
    expect(validateInvoiceForm(validForm({ deductiblePercent: '101' })).deductiblePercent).toBe('deductibleInvalid')
    expect(validateInvoiceForm(validForm({ deductiblePercent: '-1' })).deductiblePercent).toBe('deductibleInvalid')
    expect(validateInvoiceForm(validForm({ deductiblePercent: '50.5' })).deductiblePercent).toBe('deductibleInvalid')
    expect(validateInvoiceForm(validForm({ deductiblePercent: '0' })).deductiblePercent).toBeUndefined()
    expect(
      validateInvoiceForm(validForm({ direction: 'emitida', deductiblePercent: '999' })).deductiblePercent
    ).toBeUndefined()
  })

  it('el vencimiento es opcional, válido y no anterior a la factura', () => {
    expect(validateInvoiceForm(validForm({ dueDate: '' })).dueDate).toBeUndefined()
    expect(validateInvoiceForm(validForm({ dueDate: '2026-05-07' })).dueDate).toBeUndefined()
    expect(validateInvoiceForm(validForm({ dueDate: '2026-05-06' })).dueDate).toBe('dueBeforeIssue')
    expect(validateInvoiceForm(validForm({ dueDate: '2026-02-30' })).dueDate).toBe('dueDateInvalid')
  })

  it('el pago no puede ser anterior a la factura', () => {
    expect(validateInvoiceForm(validForm({ paymentDate: '2026-05-06' })).paymentDate).toBe('paymentBeforeIssue')
    expect(validateInvoiceForm(validForm({ paymentDate: '2026-05-07' })).paymentDate).toBeUndefined()
    expect(validateInvoiceForm(validForm({ paymentDate: '2026-13-01' })).paymentDate).toBe('paymentDateInvalid')
  })

  it('en una emitida el número no se pide (lo asigna la expedición) y el NIF puede esperar vacío', () => {
    const errors = validateInvoiceForm(
      validForm({ direction: 'emitida', categoryId: 'servicios', invoiceNumber: '', counterpartyTaxId: '' })
    )
    expect(errors.invoiceNumber).toBeUndefined()
    expect(errors.counterpartyTaxId).toBeUndefined()
  })

  it('pero si en una emitida se escribe un NIF, debe ser válido', () => {
    expect(
      validateInvoiceForm(validForm({ direction: 'emitida', categoryId: 'servicios', counterpartyTaxId: '1234' }))
        .counterpartyTaxId
    ).toBe('taxIdInvalid')
  })

  it('acepta NIF con guiones y minúsculas, y rechaza basura', () => {
    const cif = completeCif('B3545678')
    const spaced = `${cif[0].toLowerCase()}-${cif.slice(1, 3)}.${cif.slice(3)}`
    expect(validateInvoiceForm(validForm({ counterpartyTaxId: spaced })).counterpartyTaxId).toBeUndefined()
    const wrongControl = `${cif.slice(0, -1)}${(Number(cif.slice(-1)) + 1) % 10}`
    expect(validateInvoiceForm(validForm({ counterpartyTaxId: wrongControl })).counterpartyTaxId).toBe('taxIdInvalid')
    expect(validateInvoiceForm(validForm({ counterpartyTaxId: '12' })).counterpartyTaxId).toBe('taxIdInvalid')
  })
})

describe('draftFromForm', () => {
  it('calcula cuota, retención y total y normaliza el NIF', () => {
    const draft = draftFromForm(
      validForm({ base: '1.000,00', taxRate: '7', withholdingRate: '15', counterpartyTaxId: `${completeCif('B3545678').toLowerCase()}` }),
      { pdfName: 'f.pdf', attachmentMime: 'application/pdf', source: 'pdf' }
    )

    expect(draft).toMatchObject({
      baseCents: 100000,
      taxCents: 7000,
      withholdingCents: 15000,
      totalCents: 92000,
      counterpartyTaxId: completeCif('B3545678'),
      pdfName: 'f.pdf',
      source: 'pdf',
    })
  })

  it('una emitida nace como borrador sin número; una recibida queda registrada', () => {
    const issued = draftFromForm(validForm({ direction: 'emitida', categoryId: 'servicios', invoiceNumber: 'X' }), {
      pdfName: null,
      attachmentMime: null,
      source: 'manual',
    })
    expect(issued).toMatchObject({ status: 'borrador', invoiceNumber: '', kind: 'ordinaria', series: '', sequence: null, issuedAt: null })

    const received = draftFromForm(validForm(), { pdfName: null, attachmentMime: null, source: 'manual' })
    expect(received).toMatchObject({ status: 'definitiva', invoiceNumber: 'A-1' })
  })

  it('en las emitidas el porcentaje deducible no aplica y queda al 100 %', () => {
    const draft = draftFromForm(validForm({ direction: 'emitida', categoryId: 'servicios', deductiblePercent: '40' }), { pdfName: null, attachmentMime: null, source: 'manual' })
    expect(draft.deductiblePercent).toBe(100)
  })

  it('una categoría de la otra dirección se sustituye por la genérica', () => {
    const draft = draftFromForm(validForm({ direction: 'recibida', categoryId: 'servicios' }), { pdfName: null, attachmentMime: null, source: 'manual' })
    expect(draft.categoryId).toBe('otros-servicios')
  })

  it('sin vencimiento se aplica el plazo por defecto de 30 días', () => {
    const draft = draftFromForm(validForm({ issueDate: '2026-05-07', dueDate: '' }), { pdfName: null, attachmentMime: null, source: 'manual' })
    expect(draft.dueDate).toBe('2026-06-06')
  })

  it('con vencimiento se respeta', () => {
    const draft = draftFromForm(validForm({ dueDate: '2026-05-20' }), { pdfName: null, attachmentMime: null, source: 'manual' })
    expect(draft.dueDate).toBe('2026-05-20')
  })

  it('sin fecha de pago queda a null', () => {
    expect(draftFromForm(validForm(), { pdfName: null, attachmentMime: null, source: 'manual' }).paymentDate).toBeNull()
  })
})

describe('formFromInvoice', () => {
  it('ida y vuelta: una factura de ejemplo sobrevive a form → borrador', () => {
    for (const invoice of SAMPLE_INVOICES) {
      const draft = draftFromForm(formFromInvoice(invoice), { pdfName: invoice.pdfName, attachmentMime: invoice.attachmentMime, source: invoice.source })
      expect(draft, invoice.invoiceNumber).toMatchObject({
        direction: invoice.direction,
        // El número de una emitida lo asigna la expedición, no el formulario.
        invoiceNumber: invoice.direction === 'recibida' ? invoice.invoiceNumber : '',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        baseCents: invoice.baseCents,
        taxCents: invoice.taxCents,
        withholdingCents: invoice.withholdingCents,
        totalCents: invoice.totalCents,
        deductiblePercent: invoice.deductiblePercent,
        paymentDate: invoice.paymentDate,
      })
    }
  })
})

describe('applyParsedInvoice', () => {
  it('vuelca solo lo leído y no pisa con vacíos', () => {
    const base = validForm({ concept: 'Mi concepto' })
    const next = applyParsedInvoice(base, { ...NOTHING, invoiceNumber: 'X-9', baseCents: 12345 })

    expect(next.invoiceNumber).toBe('X-9')
    expect(next.base).toBe('123,45')
    expect(next.counterpartyName).toBe(base.counterpartyName)
    expect(next.concept).toBe('Mi concepto')
  })

  it('un tipo leído que no existe en el régimen se ignora', () => {
    const next = applyParsedInvoice(validForm({ taxRate: '7' }), { ...NOTHING, regime: 'igic', taxRate: 21 })
    expect(next.taxRate).toBe('7')
  })

  it('al detectar IVA sin tipo legible, se pone el general del IVA', () => {
    const next = applyParsedInvoice(validForm(), { ...NOTHING, regime: 'iva' })
    expect(next.regime).toBe('iva')
    expect(next.taxRate).toBe('21')
  })

  it('un tipo válido del régimen detectado se respeta', () => {
    const next = applyParsedInvoice(validForm(), { ...NOTHING, regime: 'iva', taxRate: 10, withholdingRate: 15 })
    expect(next.taxRate).toBe('10')
    expect(next.withholdingRate).toBe('15')
  })
})
