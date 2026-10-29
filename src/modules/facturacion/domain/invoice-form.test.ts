import { describe, expect, it } from 'vitest'

import {
  draftFromForm,
  emptyInvoiceForm,
  formFromInvoice,
  formLinesBaseCents,
  validateInvoiceForm,
  type InvoiceFormLine,
  type InvoiceFormValues,
} from '@/src/modules/facturacion/domain/invoice-form'
import { validateFormLines } from '@/src/modules/facturacion/domain/invoice-form'
import { localIsoDate } from '@/src/modules/facturacion/domain/dates'
import { DEMO_ISSUER } from '@/src/modules/facturacion/domain/issuer'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'
import { SAMPLE_INVOICES } from '@/src/modules/facturacion/domain/sample-invoices'

function line(unitPrice: string, overrides: Partial<InvoiceFormLine> = {}): InvoiceFormLine {
  return { id: `l-${unitPrice}-${overrides.description ?? ''}`, productId: '', description: 'Diseño de logotipo', quantity: '1', unitPrice, ...overrides }
}

function validForm(overrides: Partial<InvoiceFormValues> = {}): InvoiceFormValues {
  return {
    ...emptyInvoiceForm(),
    issueDate: '2026-05-07',
    dateReason: 'Trabajo entregado en mayo',
    counterpartyKind: 'empresa',
    counterpartyName: 'Papelería Insular S.L.',
    counterpartyTaxId: completeCif('B3545678'),
    counterpartyAddress: 'Calle Triana, 12, Arrecife',
    lines: [line('210,50')],
    ...overrides,
  }
}

describe('validateInvoiceForm', () => {
  it('un formulario completo no tiene errores', () => {
    expect(validateInvoiceForm(validForm())).toEqual({})
  })

  it('el formulario vacío marca solo los campos obligatorios: el NIF puede esperar y el número lo asigna la expedición', () => {
    expect(Object.keys(validateInvoiceForm(emptyInvoiceForm())).sort()).toEqual(['lines', 'counterpartyName'].sort())
  })

  it('rechaza fechas imposibles', () => {
    expect(validateInvoiceForm(validForm({ issueDate: '2026-02-31' })).issueDate).toBe('issueDateInvalid')
  })

  it.each(['0', '-5', 'abc', ''])('rechaza el precio «%s» de una línea', (price) => {
    expect(validateInvoiceForm(validForm({ lines: [line(price)] })).lines).toBe('linesInvalid')
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
    expect(draftFromForm(validForm({ dateReason: ' Entrega ' }), DEMO_ISSUER).dateReason).toBe('Entrega')
    expect(draftFromForm(validForm({ issueDate: localIsoDate(), dateReason: 'sobra' }), DEMO_ISSUER).dateReason).toBe('')
  })
})

describe('forma de cobro', () => {
  it('por defecto transferencia y se conserva en el borrador y al editar', () => {
    expect(emptyInvoiceForm().paymentMethod).toBe('transferencia')
    const draft = draftFromForm(validForm({ paymentMethod: 'tarjeta' }), DEMO_ISSUER)
    expect(draft.paymentMethod).toBe('tarjeta')
    expect(formFromInvoice({ ...SAMPLE_INVOICES[0], paymentMethod: 'contado' }).paymentMethod).toBe('contado')
  })

  it('un valor desconocido vuelve a transferencia', () => {
    expect(draftFromForm(validForm({ paymentMethod: 'bizum' as never }), DEMO_ISSUER).paymentMethod).toBe('transferencia')
  })
})

describe('límites de entrada', () => {
  it('la base máxima se admite y un céntimo más se rechaza', () => {
    expect(validateInvoiceForm(validForm({ lines: [line('9.999.999,99')] })).lines).toBeUndefined()
    expect(validateInvoiceForm(validForm({ lines: [line('9.999.999,99'), line('0,01')] })).lines).toBe('baseTooLarge')
  })

  it('el precio de una línea tiene un máximo', () => {
    const over = line('10.000.000,00')
    const huge = line('999999999999999999', { id: 'huge' })
    expect(validateFormLines([over])[over.id].unitPrice).toBe('priceTooLarge')
    expect(validateFormLines([huge]).huge.unitPrice).toBe('priceTooLarge')
  })

  it('el nombre, el domicilio y el concepto tienen un máximo', () => {
    expect(validateInvoiceForm(validForm({ counterpartyName: 'A'.repeat(120) })).counterpartyName).toBeUndefined()
    expect(validateInvoiceForm(validForm({ counterpartyName: 'A'.repeat(121) })).counterpartyName).toBe('tooLong')
    expect(validateInvoiceForm(validForm({ counterpartyAddress: 'C'.repeat(201) })).counterpartyAddress).toBe('tooLong')
  })

  it('la descripción de una línea tiene un máximo', () => {
    const ok = line('10', { description: 'x'.repeat(300) })
    const long = line('10', { description: 'x'.repeat(301) })
    expect(validateFormLines([ok])).toEqual({})
    expect(validateFormLines([long])[long.id].description).toBe('descriptionTooLong')
  })

  it('emoji y caracteres no latinos no rompen la validación', () => {
    expect(validateInvoiceForm(validForm({ counterpartyName: '🏨 Hotel 株式会社 مرحبا', lines: [line('10', { description: 'Diseño 🎨' })] }))).toEqual({})
  })
})

describe('draftFromForm', () => {
  it('calcula cuota, retención y total y normaliza el NIF', () => {
    const draft = draftFromForm(
      validForm({ lines: [line('1.000,00')], counterpartyTaxId: `${completeCif('B3545678').toLowerCase()}` }),
      DEMO_ISSUER
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
    expect(draftFromForm(validForm(), DEMO_ISSUER)).toMatchObject({
      status: 'borrador',
      invoiceNumber: '',
      kind: 'ordinaria',
      series: '',
      sequence: null,
      issuedAt: null,
    })
  })

  it('una categoría desconocida se sustituye por la genérica', () => {
    expect(draftFromForm(validForm({ categoryId: 'otros-servicios' }), DEMO_ISSUER).categoryId).toBe('servicios')
  })

  it('sin vencimiento se aplica el plazo por defecto de 30 días', () => {
    expect(draftFromForm(validForm({ issueDate: '2026-05-07', dueDate: '' }), DEMO_ISSUER).dueDate).toBe('2026-06-06')
  })

  it('con vencimiento se respeta', () => {
    expect(draftFromForm(validForm({ dueDate: '2026-05-20' }), DEMO_ISSUER).dueDate).toBe('2026-05-20')
  })

  it('sin fecha de cobro queda a null', () => {
    expect(draftFromForm(validForm(), DEMO_ISSUER).paymentDate).toBeNull()
  })
})

describe('formFromInvoice', () => {
  it('ida y vuelta: una factura de ejemplo sobrevive a form → borrador', () => {
    for (const invoice of SAMPLE_INVOICES) {
      const draft = draftFromForm(formFromInvoice(invoice), DEMO_ISSUER, invoice.source)
      expect(draft, invoice.invoiceNumber).toMatchObject({
        // El número lo asigna la expedición, no el formulario.
        invoiceNumber: '',
        issueDate: invoice.issueDate,
        dueDate: invoice.dueDate,
        baseCents: invoice.baseCents,
        paymentDate: invoice.paymentDate,
        lines: invoice.lines,
      })
    }
  })

  it('al volver a guardar, impuesto y retención salen de las reglas y no de lo guardado', () => {
    const sample = { ...SAMPLE_INVOICES[0], taxRate: 3, withholdingRate: 0 }
    const draft = draftFromForm(formFromInvoice(sample), DEMO_ISSUER)
    expect(draft).toMatchObject({ regime: 'igic', taxRate: 7, withholdingRate: 15, taxNote: '' })
    expect(draft.totalCents).toBe(draft.baseCents + draft.taxCents - draft.withholdingCents)
  })
})

describe('impuestos del borrador', () => {
  it('salen de las reglas según el emisor y el cliente', () => {
    expect(draftFromForm(validForm({ counterpartyKind: 'empresa' }), DEMO_ISSUER)).toMatchObject({
      regime: 'igic',
      taxRate: 7,
      withholdingRate: 15,
      taxNote: '',
    })
    expect(draftFromForm(validForm({ counterpartyKind: 'particular' }), DEMO_ISSUER).withholdingRate).toBe(0)
  })

  it('un cliente de la península no lleva impuesto y la factura lo explica', () => {
    const draft = draftFromForm(validForm({ counterpartyTerritory: 'peninsula' }), DEMO_ISSUER)
    expect(draft).toMatchObject({ taxRate: 0, taxCents: 0 })
    expect(draft.taxNote).toContain('no sujeta')
    expect(draft.counterpartyTerritory).toBe('peninsula')
  })

  it('el territorio y el tipo del cliente vuelven al formulario al editar', () => {
    const form = formFromInvoice({ ...SAMPLE_INVOICES[0], counterpartyTerritory: 'ue', counterpartyKind: 'autonomo' })
    expect(form).toMatchObject({ counterpartyTerritory: 'ue', counterpartyKind: 'autonomo' })
  })
})

describe('formLinesBaseCents', () => {
  it('suma las líneas escritas y nunca baja de cero', () => {
    expect(formLinesBaseCents([line('10', { id: 'a', quantity: '2' }), line('5,50', { id: 'b' })])).toBe(2550)
    expect(formLinesBaseCents([line('-5', { id: 'c' })])).toBe(0)
    expect(formLinesBaseCents([line('abc', { id: 'd' })])).toBe(0)
  })
})

describe('líneas de la factura', () => {
  it('sin líneas o con demasiadas se rechaza', () => {
    expect(validateInvoiceForm(validForm({ lines: [] })).lines).toBe('linesRequired')
    const many = Array.from({ length: 51 }, (_, index) => line('1', { id: `m${index}` }))
    expect(validateInvoiceForm(validForm({ lines: many })).lines).toBe('tooManyLines')
    expect(validateInvoiceForm(validForm({ lines: many.slice(0, 50) })).lines).toBeUndefined()
  })

  it('cada línea marca sus propios campos', () => {
    const bad = line('abc', { id: 'x', description: ' ', quantity: '0' })
    expect(validateFormLines([bad]).x).toEqual({
      description: 'descriptionRequired',
      quantity: 'quantityInvalid',
      unitPrice: 'priceInvalid',
    })
  })

  it('la base es la suma de cantidad por precio de cada línea y el borrador guarda las líneas', () => {
    const draft = draftFromForm(
      validForm({ lines: [line('100', { id: 'a', quantity: '2' }), line('10,50', { id: 'b', description: 'Dominio', quantity: '1,5' })] }),
      DEMO_ISSUER
    )
    expect(draft.lines).toEqual([
      { id: 'a', description: 'Diseño de logotipo', quantity: 2, unitPriceCents: 10000 },
      { id: 'b', description: 'Dominio', quantity: 1.5, unitPriceCents: 1050 },
    ])
    expect(draft.baseCents).toBe(20000 + 1575)
    expect(draft.concept).toBe('Diseño de logotipo (+1 más)')
  })

  it('al editar, las líneas vuelven al formulario como texto', () => {
    const form = formFromInvoice({
      ...SAMPLE_INVOICES[0],
      lines: [{ id: 'a', description: 'Hora', quantity: 1.5, unitPriceCents: 4500 }],
    })
    expect(form.lines).toEqual([{ id: 'a', productId: '', description: 'Hora', quantity: '1,5', unitPrice: '45,00' }])
  })

  it('una factura antigua sin líneas se edita con una línea hecha de su concepto y su base', () => {
    const form = formFromInvoice({ ...SAMPLE_INVOICES[0], lines: [] })
    expect(form.lines).toHaveLength(1)
    expect(form.lines[0].description).toBe(SAMPLE_INVOICES[0].concept)
  })
})
