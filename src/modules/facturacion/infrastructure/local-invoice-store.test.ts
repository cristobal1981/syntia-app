import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { makeInvoice } from '@/src/modules/facturacion/domain/test-fixtures'
import { draftFromInvoice } from '@/src/modules/facturacion/domain/compute-invoice'
import { initialInvoicingState, removeInvoice, saveInvoice, setPaymentDate } from '@/src/modules/facturacion/domain/invoicing-state'
import {
  getInvoicingSnapshot,
  resetInvoicing,
  runInvoicingOperation,
  subscribeToInvoicing,
} from '@/src/modules/facturacion/infrastructure/local-invoice-store'

const KEY = 'syntia:facturacion-mock:v2'

function fakeWindow() {
  const data = new Map<string, string>()
  const listeners = new Map<string, Set<(event: unknown) => void>>()
  return {
    data,
    localStorage: {
      getItem: (key: string) => data.get(key) ?? null,
      setItem: (key: string, value: string) => void data.set(key, value),
      removeItem: (key: string) => void data.delete(key),
    },
    addEventListener: (type: string, fn: (event: unknown) => void) => {
      listeners.set(type, (listeners.get(type) ?? new Set()).add(fn))
    },
    removeEventListener: (type: string, fn: (event: unknown) => void) => void listeners.get(type)?.delete(fn),
  }
}

let win: ReturnType<typeof fakeWindow>

beforeEach(() => {
  win = fakeWindow()
  vi.stubGlobal('window', win)
  resetInvoicing()
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('instantánea', () => {
  it('sin nada guardado devuelve los datos de ejemplo, con la misma referencia entre lecturas', () => {
    const first = getInvoicingSnapshot()
    expect(first.invoices.length).toBe(initialInvoicingState().invoices.length)
    expect(getInvoicingSnapshot()).toBe(first)
  })

  it('un dato corrupto o con otra forma vuelve a los de ejemplo', () => {
    win.data.set(KEY, '{no es json')
    expect(getInvoicingSnapshot().invoices.length).toBeGreaterThan(0)
    win.data.set(KEY, JSON.stringify({ invoices: 'no' }))
    expect(getInvoicingSnapshot().invoices.length).toBeGreaterThan(0)
  })

  it('descarta las facturas guardadas con formato inválido', () => {
    const state = initialInvoicingState()
    win.data.set(KEY, JSON.stringify({ ...state, invoices: [...state.invoices, { id: 'x' }, null, 5] }))
    expect(getInvoicingSnapshot().invoices).toHaveLength(state.invoices.length)
  })
})

describe('runInvoicingOperation', () => {
  it('persiste el resultado y avisa a los suscriptores', () => {
    const listener = vi.fn()
    const unsubscribe = subscribeToInvoicing(listener)

    const target = getInvoicingSnapshot().invoices.find((invoice) => invoice.status === 'definitiva' && invoice.paymentDate === null)!
    const result = runInvoicingOperation((state, context) => setPaymentDate(state, target.id, '2026-10-20', context))

    expect(result.ok).toBe(true)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(getInvoicingSnapshot().invoices.find((invoice) => invoice.id === target.id)?.paymentDate).toBe('2026-10-20')
    expect(win.data.get(KEY)).toContain('2026-10-20')
    unsubscribe()
  })

  it('un intento de modificar una factura expedida se rechaza, no cambia la factura y queda en el historial guardado', () => {
    const issued = getInvoicingSnapshot().invoices.find((invoice) => invoice.id === 'ejemplo-06')!
    const before = JSON.stringify(issued)

    const result = runInvoicingOperation((state, context) =>
      saveInvoice(state, { ...draftFromInvoice(issued), baseCents: 1, concept: 'Cambiada' }, context, issued.id)
    )

    expect(result.ok).toBe(false)
    const after = getInvoicingSnapshot()
    expect(JSON.stringify(after.invoices.find((invoice) => invoice.id === issued.id))).toBe(before)
    expect(after.events.at(-1)).toMatchObject({ type: 'bloqueada', invoiceId: issued.id })
    expect(win.data.get(KEY)).toContain('bloqueada')
  })

  it('un intento de borrar una expedida se rechaza igual', () => {
    const count = getInvoicingSnapshot().invoices.length
    const result = runInvoicingOperation((state, context) => removeInvoice(state, 'ejemplo-06', context))
    expect(result.ok).toBe(false)
    expect(getInvoicingSnapshot().invoices).toHaveLength(count)
  })

  it('la expedición sobrevive a una recarga (lo guardado se vuelve a leer)', () => {
    runInvoicingOperation((state, context) => setPaymentDate(state, 'ejemplo-06', '2026-10-21', context))
    const saved = win.data.get(KEY)!

    // Simula otra pestaña o una recarga: la caché se invalida al cambiar el texto guardado.
    win.data.set(KEY, saved + ' ')
    const reloaded = getInvoicingSnapshot()
    expect(reloaded.invoices.find((invoice) => invoice.id === 'ejemplo-06')?.invoiceNumber).toBe('F-2026-0003')
  })

  it('el historial se recorta para no agotar el almacenamiento', () => {
    for (let index = 0; index < 520; index += 1) {
      runInvoicingOperation((state, context) => setPaymentDate(state, 'ejemplo-06', index % 2 ? null : '2026-10-21', context))
    }
    const events = JSON.parse(win.data.get(KEY)!).events as unknown[]
    expect(events.length).toBeLessThanOrEqual(500)
  })
})

describe('resetInvoicing', () => {
  it('borra lo guardado y vuelve a los datos de ejemplo', () => {
    runInvoicingOperation((state, context) => setPaymentDate(state, 'ejemplo-06', '2026-10-21', context))
    expect(win.data.has(KEY)).toBe(true)

    resetInvoicing()
    expect(win.data.has(KEY)).toBe(false)
    expect(getInvoicingSnapshot().events).toEqual([])
  })

  describe('facturas guardadas antes de existir fecha con motivo y forma de cobro', () => {
    const stored = (extra: Record<string, unknown>) => {
      const legacy: Record<string, unknown> = { ...makeInvoice({ id: 'viejo' }) }
      delete legacy.dateReason
      delete legacy.paymentMethod
      win.data.set(KEY, JSON.stringify({ ...initialInvoicingState(), invoices: [{ ...legacy, ...extra }] }))
      return getInvoicingSnapshot().invoices[0]
    }

    it('se rellenan con motivo vacío y transferencia', () => {
      expect(stored({})).toMatchObject({ dateReason: '', paymentMethod: 'transferencia' })
    })

    it('se conservan los valores válidos y se descartan los desconocidos', () => {
      expect(stored({ dateReason: 'Entrega', paymentMethod: 'tarjeta' })).toMatchObject({ dateReason: 'Entrega', paymentMethod: 'tarjeta' })
      expect(stored({ dateReason: 7, paymentMethod: 'bizum' })).toMatchObject({ dateReason: '', paymentMethod: 'transferencia' })
    })
  })
})
