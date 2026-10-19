import { describe, expect, it } from 'vitest'

import { draftFromInvoice } from '@/src/modules/facturacion/domain/compute-invoice'
import {
  emitDraft,
  initialInvoicingState,
  rectifyInvoice,
  removeInvoice,
  removeParty,
  saveInvoice,
  saveIssuer,
  saveParty,
  setPaymentDate,
  setReview,
  type InvoicingState,
  type OperationContext,
} from '@/src/modules/facturacion/domain/invoicing-state'
import { EMPTY_ISSUER } from '@/src/modules/facturacion/domain/issuer'
import { emptyParty } from '@/src/modules/facturacion/domain/party-directory'
import { accountedInvoices } from '@/src/modules/facturacion/domain/invoice-rules'
import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'
import { completeCif } from '@/src/modules/facturacion/domain/tax-id'

let counter = 0
function context(now = new Date(2026, 9, 16, 12, 0)): OperationContext {
  return { now, newId: () => `id-${++counter}` }
}

function stateWith(overrides: Partial<InvoicingState> = {}): InvoicingState {
  return { ...initialInvoicingState(), events: [], ...overrides }
}

const issuedInvoice = makeInvoice({ id: 'issued', invoiceNumber: 'F-2026-0001', issueDate: '2026-10-01' })
const draftInvoice = makeInvoice({
  id: 'draft',
  status: 'borrador',
  invoiceNumber: '',
  series: '',
  sequence: null,
  issuedAt: null,
  issueDate: '2026-10-16',
  counterpartyTaxId: completeCif('B3512345'),
})

describe('saveInvoice', () => {
  it('crea una factura nueva con identificador, fecha de alta y un apunte en el historial', () => {
    const state = stateWith({ invoices: [] })
    const result = saveInvoice(state, draftFromInvoice(draftInvoice), context())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.invoices).toHaveLength(1)
    expect(result.invoice.id).toMatch(/^id-/)
    expect(result.invoice.createdAt).toBe(new Date(2026, 9, 16, 12, 0).toISOString())
    expect(result.state.events.map((event) => event.type)).toEqual(['creada'])
  })

  it('modifica un borrador', () => {
    const state = stateWith({ invoices: [draftInvoice] })
    const result = saveInvoice(state, { ...draftFromInvoice(draftInvoice), concept: 'Otro concepto' }, context(), 'draft')

    expect(result.ok && result.invoice.concept).toBe('Otro concepto')
    expect(result.state.events.at(-1)?.type).toBe('modificada')
  })

  it('RECHAZA modificar una factura expedida, la deja intacta y anota el intento', () => {
    const state = stateWith({ invoices: [issuedInvoice] })
    const result = saveInvoice(state, { ...draftFromInvoice(issuedInvoice), baseCents: 1, concept: 'Trampa' }, context(), 'issued')

    expect(result.ok).toBe(false)
    if (result.ok || result.error !== 'locked') throw new Error('debía rechazarse')
    expect(result.fields).toEqual(['concept', 'baseCents'].sort((a, b) => ['concept', 'baseCents'].indexOf(a) - ['concept', 'baseCents'].indexOf(b)))
    expect(result.state.invoices).toEqual([issuedInvoice])
    expect(result.state.events.at(-1)).toMatchObject({ type: 'bloqueada', invoiceId: 'issued' })
  })

  it('el guardado de una expedida con los mismos datos no cambia nada', () => {
    const state = stateWith({ invoices: [issuedInvoice] })
    const result = saveInvoice(state, draftFromInvoice(issuedInvoice), context(), 'issued')
    expect(result.ok && result.invoice).toEqual(issuedInvoice)
  })

  it('no conserva el número de una emitida aunque el formulario lo envíe', () => {
    const state = stateWith({ invoices: [draftInvoice] })
    const result = saveInvoice(state, { ...draftFromInvoice(draftInvoice), invoiceNumber: 'F-2026-9999' }, context(), 'draft')
    expect(result.ok && result.invoice.invoiceNumber).toBe('')
  })

  it('un identificador que no existe devuelve not_found', () => {
    expect(saveInvoice(stateWith(), draftFromInvoice(draftInvoice), context(), 'nope')).toMatchObject({ ok: false, error: 'not_found' })
  })
})

describe('emitDraft', () => {
  it('expide el borrador: número correlativo, bloqueado y apunte en el historial', () => {
    const state = stateWith({ invoices: [draftInvoice] })
    const result = emitDraft(state, 'draft', context())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.invoice).toMatchObject({ status: 'definitiva', invoiceNumber: 'F-2026-0001', sequence: 1 })
    expect(result.state.events.at(-1)).toMatchObject({ type: 'expedida', invoiceId: 'draft' })
  })

  it('tras expedirla ya no admite cambios', () => {
    const emitted = emitDraft(stateWith({ invoices: [draftInvoice] }), 'draft', context())
    if (!emitted.ok) throw new Error('debía expedirse')

    const attempt = saveInvoice(emitted.state, { ...draftFromInvoice(emitted.invoice), baseCents: 5 }, context(), 'draft')
    expect(attempt.ok).toBe(false)
  })

  it('con datos del emisor incompletos no se expide y el estado no cambia', () => {
    const state = stateWith({ invoices: [draftInvoice], issuer: EMPTY_ISSUER })
    const result = emitDraft(state, 'draft', context())
    expect(result).toMatchObject({ ok: false, error: 'invalid' })
    expect(result.state).toBe(state)
  })

  it('continúa la numeración tras las facturas existentes', () => {
    const state = stateWith({ invoices: [issuedInvoice, draftInvoice] })
    const result = emitDraft(state, 'draft', context())
    expect(result.ok && result.invoice.invoiceNumber).toBe('F-2026-0002')
  })
})

describe('rectifyInvoice', () => {
  const base = () => stateWith({ invoices: [issuedInvoice] })

  it('expide una rectificativa en la serie R sin tocar la original', () => {
    const state = base()
    const result = rectifyInvoice(state, 'issued', { mode: 'total', reason: 'Error en el precio', issueDate: '2026-10-16' }, context())

    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.invoice).toMatchObject({ invoiceNumber: 'R-2026-0001', kind: 'rectificativa', rectifies: 'issued', status: 'definitiva' })
    expect(result.state.invoices.find((invoice) => invoice.id === 'issued')).toEqual(issuedInvoice)
    expect(result.state.events.map((event) => event.type)).toEqual(['creada', 'expedida', 'rectificada'])
  })

  it('el efecto contable neto de factura + rectificativa total es cero', () => {
    const result = rectifyInvoice(base(), 'issued', { mode: 'total', reason: 'Anulación', issueDate: '2026-10-16' }, context())
    if (!result.ok) throw new Error('debía expedirse')

    const invoices = accountedInvoices(result.state.invoices)
    expect(invoices.reduce((total, invoice) => total + invoice.baseCents, 0)).toBe(0)
    expect(invoices.reduce((total, invoice) => total + invoice.totalCents, 0)).toBe(0)
  })

  it('no permite rectificar dos veces por completo', () => {
    const first = rectifyInvoice(base(), 'issued', { mode: 'total', reason: 'Anulación', issueDate: '2026-10-16' }, context())
    if (!first.ok) throw new Error('debía expedirse')
    const second = rectifyInvoice(first.state, 'issued', { mode: 'total', reason: 'Otra vez', issueDate: '2026-10-16' }, context())
    expect(second).toMatchObject({ ok: false, error: 'invalid', issues: ['already_rectified'] })
  })

  it('sin motivo no se rectifica y no queda ningún borrador suelto', () => {
    const state = base()
    const result = rectifyInvoice(state, 'issued', { mode: 'total', reason: '', issueDate: '2026-10-16' }, context())
    expect(result).toMatchObject({ ok: false, error: 'invalid', issues: ['reason'] })
    expect(result.state).toBe(state)
  })

  it('si la expedición falla (emisor incompleto) el estado queda como estaba', () => {
    const state = stateWith({ invoices: [issuedInvoice], issuer: EMPTY_ISSUER })
    const result = rectifyInvoice(state, 'issued', { mode: 'total', reason: 'Error', issueDate: '2026-10-16' }, context())
    expect(result).toMatchObject({ ok: false, error: 'emission' })
    expect(result.state.invoices).toEqual([issuedInvoice])
  })

  it('una rectificativa no se rectifica a su vez', () => {
    const first = rectifyInvoice(base(), 'issued', { mode: 'parcial', reason: 'Descuento', issueDate: '2026-10-16', deltaBaseCents: -1000 }, context())
    if (!first.ok) throw new Error('debía expedirse')
    const again = rectifyInvoice(first.state, first.invoice.id, { mode: 'total', reason: 'x', issueDate: '2026-10-16' }, context())
    expect(again).toMatchObject({ ok: false, error: 'invalid', issues: ['not_rectifiable'] })
  })
})

describe('removeInvoice', () => {
  it('borra un borrador', () => {
    const result = removeInvoice(stateWith({ invoices: [draftInvoice] }), 'draft', context())
    expect(result.ok && result.state.invoices).toEqual([])
    expect(result.state.events.at(-1)?.type).toBe('eliminada')
  })

  it('NO borra una factura expedida y anota el intento', () => {
    const result = removeInvoice(stateWith({ invoices: [issuedInvoice] }), 'issued', context())
    expect(result).toMatchObject({ ok: false, error: 'locked' })
    expect(result.state.invoices).toEqual([issuedInvoice])
    expect(result.state.events.at(-1)?.type).toBe('bloqueada')
  })

  it('un borrador sí se puede borrar', () => {
    const draft = makeInvoice({ id: 'borr', status: 'borrador', invoiceNumber: '', series: '', sequence: null, issuedAt: null })
    expect(removeInvoice(stateWith({ invoices: [draft] }), 'borr', context()).ok).toBe(true)
  })
})

describe('setPaymentDate / setReview — permitidos aunque esté expedida', () => {
  it('registrar el cobro de una expedida', () => {
    const result = setPaymentDate(stateWith({ invoices: [issuedInvoice] }), 'issued', '2026-10-20', context())
    expect(result.ok && result.invoice).toMatchObject({ paymentDate: '2026-10-20', baseCents: issuedInvoice.baseCents })
    expect(result.state.events.at(-1)?.type).toBe('cobro')
  })

  it('quitar el cobro', () => {
    const paid = { ...issuedInvoice, paymentDate: '2026-10-20' }
    const result = setPaymentDate(stateWith({ invoices: [paid] }), 'issued', null, context())
    expect(result.ok && result.invoice.paymentDate).toBeNull()
  })

  it('marcar la revisión', () => {
    const result = setReview(stateWith({ invoices: [issuedInvoice] }), 'issued', 'revisada', context())
    expect(result.ok && result.invoice.review).toBe('revisada')
    expect(result.state.events.at(-1)?.type).toBe('revision')
  })

  it('una factura inexistente devuelve not_found', () => {
    expect(setPaymentDate(stateWith(), 'nope', null, context())).toMatchObject({ ok: false, error: 'not_found' })
  })
})

describe('terceros y emisor', () => {
  const newParty = { ...emptyParty(), id: 'p-new', name: 'Cliente Nuevo S.L.', taxId: completeCif('B3500000') }

  it('crea un tercero válido', () => {
    const state = stateWith({ parties: [] })
    const result = saveParty(state, newParty, context())
    expect(result.ok && result.state.parties).toEqual([newParty])
  })

  it('rechaza un tercero con datos inválidos y no cambia el estado', () => {
    const state = stateWith({ parties: [] })
    const result = saveParty(state, { ...newParty, name: '', taxId: '12' }, context())
    expect(result.ok).toBe(false)
    if (!result.ok) expect(Object.keys(result.errors).sort()).toEqual(['name', 'taxId'])
    expect(result.state).toBe(state)
  })

  it('admite un tercero con el mismo NIF que otro: la sugerencia de duplicado no obliga', () => {
    const state = stateWith({ parties: [newParty] })
    const result = saveParty(state, { ...newParty, id: 'otro' }, context())
    expect(result.ok && result.state.parties.map((party) => party.id)).toEqual(['p-new', 'otro'])
  })

  it('editar un tercero NO altera las facturas ya expedidas con sus datos', () => {
    const party = { ...newParty, taxId: issuedInvoice.counterpartyTaxId, name: issuedInvoice.counterpartyName }
    const state = stateWith({ invoices: [issuedInvoice], parties: [party] })
    const result = saveParty(state, { ...party, name: 'Nombre cambiado S.L.' }, context())

    expect(result.ok && result.state.parties[0].name).toBe('Nombre cambiado S.L.')
    expect(result.state.invoices[0].counterpartyName).toBe(issuedInvoice.counterpartyName)
  })

  it('no borra un tercero que tiene facturas; sí uno sin ellas', () => {
    const used = { ...newParty, id: 'used', taxId: issuedInvoice.counterpartyTaxId }
    const unused = { ...newParty, id: 'unused' }
    const state = stateWith({ invoices: [issuedInvoice], parties: [used, unused] })

    expect(removeParty(state, 'used', context())).toMatchObject({ ok: false, error: 'in_use' })
    const removed = removeParty(state, 'unused', context())
    expect(removed.ok && removed.state.parties.map((party) => party.id)).toEqual(['used'])
  })

  it('cambiar los datos fiscales no altera las facturas ya expedidas', () => {
    const state = stateWith({ invoices: [issuedInvoice] })
    const next = saveIssuer(state, { ...state.issuer, name: 'Nuevo nombre' }, context())
    expect(next.invoices[0].issuer?.name).toBe(issuedInvoice.issuer?.name)
    expect(next.invoices[0].issuer?.name).not.toBe('Nuevo nombre')
  })

  it('guarda los datos del emisor y lo anota', () => {
    const state = stateWith()
    const next = saveIssuer(state, { ...state.issuer, name: 'Nuevo nombre' }, context())
    expect(next.issuer.name).toBe('Nuevo nombre')
    expect(next.events.at(-1)?.summary).toContain('emisor')
  })
})

describe('datos de ejemplo', () => {
  const state = initialInvoicingState()

  it('las emitidas expedidas están numeradas sin saltos, por serie y año', () => {
    for (const series of ['F', 'R']) {
      const sequences = state.invoices
        .filter((invoice) => invoice.status === 'definitiva' && invoice.series === series)
        .map((invoice) => invoice.sequence)
        .sort((a, b) => (a ?? 0) - (b ?? 0))
      expect(sequences, series).toEqual(sequences.map((_, index) => index + 1))
    }
  })

  it('el número de cada emitida coincide con su serie, año y orden', () => {
    for (const invoice of state.invoices.filter((candidate) => candidate.status === 'definitiva')) {
      expect(invoice.invoiceNumber).toBe(`${invoice.series}-${invoice.issueDate.slice(0, 4)}-${String(invoice.sequence).padStart(4, '0')}`)
    }
  })

  it('la rectificativa de ejemplo apunta a una factura que existe y está expedida', () => {
    const rectificativas = state.invoices.filter((invoice) => invoice.kind === 'rectificativa')
    expect(rectificativas.length).toBeGreaterThan(0)
    for (const rectificativa of rectificativas) {
      const original = state.invoices.find((invoice) => invoice.id === rectificativa.rectifies)
      expect(original?.status).toBe('definitiva')
      expect(rectificativa.rectificationReason).not.toBe('')
    }
  })

  it('hay un borrador de ejemplo sin número', () => {
    const drafts = state.invoices.filter((invoice) => invoice.status === 'borrador')
    expect(drafts.length).toBeGreaterThan(0)
    for (const draft of drafts) expect(draft.invoiceNumber).toBe('')
  })

  it('cada tercero de las facturas tiene su ficha en el directorio y un NIF válido', () => {
    const taxIds = new Set(state.parties.map((party) => party.taxId))
    for (const invoice of state.invoices) expect(taxIds.has(invoice.counterpartyTaxId), invoice.counterpartyName).toBe(true)
  })
})
