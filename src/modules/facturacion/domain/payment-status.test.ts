import { describe, expect, it } from 'vitest'

import { daysOverdue, paymentStatus } from '@/src/modules/facturacion/domain/payment-status'

const unpaid = { paymentDate: null, dueDate: '2026-06-10' }

describe('paymentStatus', () => {
  it('una factura con fecha de pago está pagada, aunque haya vencido', () => {
    expect(paymentStatus({ paymentDate: '2026-07-01', dueDate: '2026-06-10' }, '2026-12-01')).toBe('pagada')
  })

  it('el día del vencimiento aún no es vencida; al día siguiente sí', () => {
    expect(paymentStatus(unpaid, '2026-06-10')).toBe('pendiente')
    expect(paymentStatus(unpaid, '2026-06-11')).toBe('vencida')
  })

  it('antes del vencimiento está pendiente', () => {
    expect(paymentStatus(unpaid, '2026-05-01')).toBe('pendiente')
  })
})

describe('daysOverdue', () => {
  it('cuenta los días desde el vencimiento', () => {
    expect(daysOverdue(unpaid, '2026-06-11')).toBe(1)
    expect(daysOverdue(unpaid, '2026-07-10')).toBe(30)
  })

  it('es 0 si no ha vencido, vence hoy o está pagada', () => {
    expect(daysOverdue(unpaid, '2026-06-10')).toBe(0)
    expect(daysOverdue(unpaid, '2026-01-01')).toBe(0)
    expect(daysOverdue({ paymentDate: '2026-06-01', dueDate: '2026-06-10' }, '2026-12-01')).toBe(0)
  })
})
