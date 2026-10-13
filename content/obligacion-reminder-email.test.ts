import { describe, expect, it } from 'vitest'

import { buildObligacionReminderDigestEmail } from '@/content/obligacion-reminder-email'

const item = (overrides: Partial<Record<string, unknown>> = {}) => ({
  clientName: 'Cliente A',
  modelLabel: 'Modelo 303',
  deadline: new Date(2026, 3, 20),
  daysLeft: 5,
  ...overrides,
})

describe('buildObligacionReminderDigestEmail', () => {
  it('orders cards by deadline, soonest first, across different clients', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [
        item({ clientName: 'Cliente Lejano', deadline: new Date(2026, 3, 25), daysLeft: 10 }),
        item({ clientName: 'Cliente Urgente', deadline: new Date(2026, 3, 18), daysLeft: 1 }),
      ],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    const urgentIndex = email.text.indexOf('Cliente Urgente')
    const lejanoIndex = email.text.indexOf('Cliente Lejano')
    expect(urgentIndex).toBeGreaterThan(-1)
    expect(urgentIndex).toBeLessThan(lejanoIndex)
  })

  it('keeps a client with a single shared deadline in one card, not one per model', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [
        item({ clientName: 'Cliente A', modelLabel: 'Modelo 303' }),
        item({ clientName: 'Cliente A', modelLabel: 'Modelo 111' }),
      ],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    const occurrences = email.html.split('Cliente A').length - 1
    expect(occurrences).toBe(1)
    expect(email.html).toContain('Modelo 303')
    expect(email.html).toContain('Modelo 111')
  })

  it('splits the same client into separate cards when their models have different deadlines', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [
        item({ clientName: 'Cliente A', modelLabel: 'Modelo Pronto', deadline: new Date(2026, 3, 18), daysLeft: 1 }),
        item({ clientName: 'Cliente A', modelLabel: 'Modelo Tarde', deadline: new Date(2026, 3, 25), daysLeft: 10 }),
      ],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    const occurrences = email.html.split('Cliente A').length - 1
    expect(occurrences).toBe(2)
    const prontoIndex = email.text.indexOf('Modelo Pronto')
    const tardeIndex = email.text.indexOf('Modelo Tarde')
    expect(prontoIndex).toBeLessThan(tardeIndex)
  })

  it('includes the obligation and distinct-client count in the subject when there is more than one item', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [
        item({ clientName: 'Cliente A' }),
        item({ clientName: 'Cliente B', modelLabel: 'Modelo 111' }),
      ],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    expect(email.subject).toBe('2 obligaciones fiscales próximas a vencer (2 clientes)')
  })

  it('counts a client once in the subject even if it has cards for two different deadlines', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [
        item({ clientName: 'Cliente A', modelLabel: 'Modelo Pronto', deadline: new Date(2026, 3, 18), daysLeft: 1 }),
        item({ clientName: 'Cliente A', modelLabel: 'Modelo Tarde', deadline: new Date(2026, 3, 25), daysLeft: 10 }),
      ],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    expect(email.subject).toBe('2 obligaciones fiscales próximas a vencer (1 clientes)')
  })

  it('uses a single-item subject naming the client when there is exactly one item', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [item({ clientName: 'Cliente A', modelLabel: 'Modelo 303', daysLeft: 0 })],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    expect(email.subject).toBe('Modelo 303 (Cliente A) vence hoy')
  })

  it('renders the model as a chip linking to the Odoo task when taskUrl is present', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [item({ taskUrl: 'https://odoo.example.com/web#id=5&model=project.task&view_type=form' })],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    expect(email.html).toContain('href="https://odoo.example.com/web#id=5&model=project.task&view_type=form"')
    expect(email.text).toContain('https://odoo.example.com/web#id=5&model=project.task&view_type=form')
  })

  it('renders the model as a non-clickable chip, without a dangling link, when taskUrl is absent', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [item({ taskUrl: undefined })],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    expect(email.html).not.toContain('<a href')
    expect(email.html).toContain('Modelo 303')
  })

  it('shows an urgency badge for a card due today or tomorrow', () => {
    const today = buildObligacionReminderDigestEmail({
      items: [item({ daysLeft: 0 })],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })
    const tomorrow = buildObligacionReminderDigestEmail({
      items: [item({ daysLeft: 1 })],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    expect(today.html).toContain('Vence hoy')
    expect(tomorrow.html).toContain('Vence mañana')
  })

  it('shows an urgency badge for a card due in exactly 2 days (the urgent-stage threshold)', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [item({ daysLeft: 2 })],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    expect(email.html).toContain('Vence en 2 días')
  })

  it('hides the urgency badge for a card due later than the urgent-stage threshold', () => {
    const email = buildObligacionReminderDigestEmail({
      items: [item({ daysLeft: 5 })],
      realRecipientEmail: 'admin@example.com',
      isOverrideRecipient: false,
    })

    expect(email.html).not.toContain('Vence hoy')
    expect(email.html).not.toContain('Vence mañana')
    expect(email.html).not.toContain('Vence en')
  })
})
