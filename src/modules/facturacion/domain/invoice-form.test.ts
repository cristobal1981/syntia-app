import { describe, expect, it } from 'vitest'

import {
  draftFromForm,
  emptyInvoiceForm,
  formFromInvoice,
  validateInvoiceForm,
  type InvoiceFormValues,
} from '@/src/modules/facturacion/domain/invoice-form'
import { localIsoDate } from '@/src/modules/facturacion/domain/dates'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

function validForm(overrides: Partial<InvoiceFormValues> = {}): InvoiceFormValues {
  return {
    ...emptyInvoiceForm(),
    issueDate: '2026-05-07',
    dateReason: 'Trabajo entregado en mayo',
    counterpartyName: 'Papelería Insular S.L.',
    counterpartyTaxId: completeCif('B3545678'),
    counterpartyAddress: 'Calle Triana, 12, Arrecife',
    base: '210,50',
    ...overrides,
  }
}

describe('validateInvoiceForm', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validateInvoiceForm(validForm())).toEqual({})
  })

  it('el formulario vacío marca solo los campos obligatorios: el NIF puede esperar y el número lo asigna la expedición', () => {
    expect(Object.keys(validateInvoiceForm(emptyInvoiceForm())).sort()).toEqual(['base', 'counterpartyName'].sort())
  })

  it('rechaza fechas imposibles', () => {
    expect(validateInvoiceForm(validForm({ issueDate: '2026-02-31' })).issueDate).toBe('issueDateInvalid')
  })

  it.each(['0', '-5', 'abc', ''])('rechaza la base «%s»', (base) => {
    expect(validateInvoiceForm(validForm({ base })).base).toBe('baseInvalid')
  })

  it('el vencimiento es opcional, válido y no anterior a la factura', () => {
    expect(validateInvoiceForm(validForm({ dueDate: '' })).dueDate).toBeUndefined()
    expect(validateInvoiceForm(validForm({ dueDate: '2026-05-07' })).dueDate).toBeUndefined()
    expect(validateInvoiceForm(validForm({ dueDate: '2026-05-06' })).dueDate).toBe('dueBeforeIssue')
    expect(validateInvoiceForm(validForm({ dueDate: '2026-02-30' })).dueDate).toBe('dueDateInvalid')
  })

  it('el cobro no puede ser anterior a la factura', () => {
    expect(validateInvoiceForm(validForm({ paymentDate: '2026-05-06' })).paymentDate).toBe('paymentBeforeIssue')
    expect(validateInvoiceForm(validForm({ paymentDate: '2026-05-07' })).paymentDate).toBeUndefined()
    expect(validateInvoiceForm(validForm({ paymentDate: '2026-13-01' })).paymentDate).toBe('paymentDateInvalid')
  })

  it('el NIF puede esperar vacío hasta la expedición', () => {
    expect(validateInvoiceForm(validForm({ counterpartyTaxId: '' })).counterpartyTaxId).toBeUndefined()
  })

  it('pero si se escribe un NIF, debe ser válido', () => {
    expect(validateInvoiceForm(validForm({ counterpartyTaxId: '1234' })).counterpartyTaxId).toBe('taxIdInvalid')
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

describe('fecha de la factura', () => {
  it('por defecto es hoy', () => {
    expect(emptyInvoiceForm().issueDate).toBe(localIsoDate())
  })

  it('una fecha anterior a hoy exige motivo; hoy y el futuro no', () => {
    const today = '2026-06-15'
    expect(validateInvoiceForm(validForm({ issueDate: '2026-06-14', dateReason: '' }), today).dateReason).toBe('dateReasonRequired')
    expect(validateInvoiceForm(validForm({ issueDate: '2026-06-14', dateReason: '  ' }), today).dateReason).toBe('dateReasonRequired')
    expect(validateInvoiceForm(validForm({ issueDate: '2026-06-14', dateReason: 'Entrega' }), today).dateReason).toBeUndefined()
    expect(validateInvoiceForm(validForm({ issueDate: today, dateReason: '' }), today).dateReason).toBeUndefined()
  })

  it('el motivo tiene un máximo', () => {
    expect(validateInvoiceForm(validForm({ dateReason: 'x'.repeat(301) })).dateReason).toBe('tooLong')
  })

  it('el borrador solo guarda el motivo si la fecha es anterior a hoy', () => {
    expect(draftFromForm(validForm({ dateReason: ' Entrega ' })).dateReason).toBe('Entrega')
    expect(draftFromForm(validForm({ issueDate: localIsoDate(), dateReason: 'sobra' })).dateReason).toBe('')
  })
})

describe('forma de cobro', () => {
  it('por defecto transferencia y se conserva en el borrador y al editar', () => {
    expect(emptyInvoiceForm().paymentMethod).toBe('transferencia')
    const draft = draftFromForm(validForm({ paymentMethod: 'tarjeta' }))
    expect(draft.paymentMethod).toBe('tarjeta')
    expect(formFromInvoice({ ...SAMPLE_INVOICES[0], paymentMethod: 'contado' }).paymentMethod).toBe('contado')
  })

  it('un valor desconocido vuelve a transferencia', () => {
    expect(draftFromForm(validForm({ paymentMethod: 'bizum' as never })).paymentMethod).toBe('transferencia')
  })
})

describe('límites de entrada', () => {
  it('el importe máximo se admite y uno más se rechaza', () => {
    expect(validateInvoiceForm(validForm({ base: '9.999.999,99' })).base).toBeUndefined()
    expect(validateInvoiceForm(validForm({ base: '10.000.000,00' })).base).toBe('baseTooLarge')
    expect(validateInvoiceForm(validForm({ base: '999999999999999999' })).base).toBe('baseTooLarge')
  })

  it('el nombre, el domicilio y el concepto tienen un máximo', () => {
    expect(validateInvoiceForm(validForm({ counterpartyName: 'A'.repeat(120) })).counterpartyName).toBeUndefined()
    expect(validateInvoiceForm(validForm({ counterpartyName: 'A'.repeat(121) })).counterpartyName).toBe('tooLong')
    expect(validateInvoiceForm(validForm({ counterpartyAddress: 'C'.repeat(201) })).counterpartyAddress).toBe('tooLong')
    expect(validateInvoiceForm(validForm({ concept: 'x'.repeat(300) })).concept).toBeUndefined()
    expect(validateInvoiceForm(validForm({ concept: 'x'.repeat(301) })).concept).toBe('tooLong')
  })

  it('emoji y caracteres no latinos no rompen la validación', () => {
    expect(validateInvoiceForm(validForm({ counterpartyName: '🏨 Hotel 株式会社 مرحبا', concept: 'Diseño 🎨' }))).toEqual({})
  })
})

describe('draftFromForm', () => {
  it('calcula cuota, retención y total y normaliza el NIF', () => {
    const draft = draftFromForm(
      validForm({ base: '1.000,00', taxRate: '7', withholdingRate: '15', counterpartyTaxId: `${completeCif('B3545678').toLowerCase()}` })
    )

    expect(draft).toMatchObject({
      baseCents: 100000,
      taxCents: 7000,
      withholdingCents: 15000,
      totalCents: 92000,
      counterpartyTaxId: completeCif('B3545678'),
      source: 'manual',
    })
  })

  it('nace como borrador sin número, serie ni expedición', () => {
    expect(draftFromForm(validForm())).toMatchObject({
      status: 'borrador',
      invoiceNumber: '',
      kind: 'ordinaria',
      series: '',
      sequence: null,
      issuedAt: null,
    })
  })

  it('una categoría desconocida se sustituye por la genérica', () => {
    expect(draftFromForm(validForm({ categoryId: 'otros-servicios' })).categoryId).toBe('servicios')
  })

  it('sin vencimiento se aplica el plazo por defecto de 30 días', () => {
    expect(draftFromForm(validForm({ issueDate: '2026-05-07', dueDate: '' })).dueDate).toBe('2026-06-06')
  })

  it('con vencimiento se respeta', () => {
    expect(draftFromForm(validForm({ dueDate: '2026-05-20' })).dueDate).toBe('2026-05-20')
  })

  it('sin fecha de cobro queda a null', () => {
    expect(draftFromForm(validForm()).paymentDate).toBeNull()
  })
})

describe('formFromInvoice', () => {
  it('ida y vuelta: una factura de ejemplo sobrevive a form → borrador', () => {
    for (const invoice of SAMPLE_INVOICES) {
      const draft = draftFromForm(formFromInvoice(invoice), invoice.source)
      expect(draft, invoice.invoiceNumber).toMatchObject({
        // El número lo asigna la expedición, no el formulario.
        invoiceNumber: '',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        baseCents: invoice.baseCents,
        taxCents: invoice.taxCents,
        withholdingCents: invoice.withholdingCents,
        totalCents: invoice.totalCents,
        paymentDate: invoice.paymentDate,
      })
    }
  })
})
