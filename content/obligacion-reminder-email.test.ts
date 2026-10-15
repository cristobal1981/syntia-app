import { describe, expect, it } from 'vitest'

import { buildObligacionReminderDigestEmail } from '@/content/obligacion-reminder-email'

const item = (overrides: Partial<Record<string, unknown>> = {}) => ({
  clientName: 'Cliente A',
  modelLabel: 'Modelo 303',
  deadline: new Date(2026, 3, 20),
  daysLeft: 5,
  kind: 'normal' as const,
  completion: { level: 'missing' as const },
  ...overrides,
})

const build = (items: ReturnType<typeof item>[], completeCount?: number) =>
  buildObligacionReminderDigestEmail({
    items,
    completeCount,
    realRecipientEmail: 'admin@example.com',
    isOverrideRecipient: false,
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

    expect(email.subject).toBe('2 obligaciones fiscales próximas a vencer (1 cliente)')
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

  it('titles a presentation-day digest as the last day and says so in the intro', () => {
    const one = build([item({ kind: 'presentacion', daysLeft: 0 })])
    const many = build([
      item({ kind: 'presentacion', daysLeft: 0 }),
      item({ clientName: 'Cliente B', kind: 'presentacion', daysLeft: 0 }),
    ])

    expect(one.subject).toBe('Hoy se presenta Modelo 303 (Cliente A) y no está completa')
    expect(many.subject).toBe('Hoy se presentan 2 obligaciones sin completar (2 clientes)')
    expect(one.html).toContain('Hoy es el último día para presentar')
    expect(one.html).toContain('Se presenta hoy')
  })

  it('titles a domiciliation digest and badges the card as to be domiciled', () => {
    const one = build([item({ kind: 'domiciliar', daysLeft: 6 })])
    const many = build([
      item({ kind: 'domiciliar' }),
      item({ clientName: 'Cliente B', kind: 'domiciliar' }),
    ])

    expect(one.subject).toBe('Modelo 303 (Cliente A): a domiciliar')
    expect(many.subject).toBe('2 obligaciones a domiciliar (2 clientes)')
    expect(one.html).toContain('A domiciliar')
    expect(one.html).toContain('plazo de domiciliación')
  })

  it('falls back to the generic subject when kinds are mixed', () => {
    const email = build([
      item({ kind: 'domiciliar' }),
      item({ clientName: 'Cliente B', kind: 'normal' }),
    ])

    expect(email.subject).toBe('2 obligaciones fiscales próximas a vencer (2 clientes)')
  })

  it('shows a days badge only for the normal notice with days left', () => {
    const soon = build([item({ kind: 'normal', daysLeft: 2 })])
    const tomorrow = build([item({ kind: 'normal', daysLeft: 1 })])

    expect(soon.html).toContain('Vence en 2 días')
    expect(tomorrow.html).toContain('Vence mañana')
  })

  it('paints a red chip with only the model name and no icon, since both things are missing', () => {
    const email = build([item({ modelLabel: 'Modelo Rojo', completion: { level: 'missing' } })])

    expect(email.html).toContain('border: 1px solid #C0392B')
    const chip = email.html.slice(
      email.html.indexOf('Modelo Rojo'),
      email.html.indexOf('</span>', email.html.indexOf('Modelo Rojo'))
    )
    expect(chip).not.toContain('📎')
    expect(chip).not.toContain('✔')
    expect(chip).not.toContain('Sin justificante')
  })

  it('an amber chip shows next to the model the single thing that is missing, with its icon', () => {
    const noDoc = build([
      item({
        modelLabel: 'Modelo A',
        completion: { level: 'partial', reason: 'done_without_document' },
      }),
    ])
    const noDone = build([
      item({
        modelLabel: 'Modelo B',
        completion: { level: 'partial', reason: 'document_without_done' },
      }),
    ])

    const chipOf = (html: string, label: string) => {
      const start = html.indexOf(label)
      return html.slice(start, html.indexOf('</a>', start))
    }
    expect(chipOf(noDoc.html, 'Modelo A')).toContain('📎 Sin justificante')
    expect(chipOf(noDoc.html, 'Modelo A')).not.toContain('Sin marcar como hecha')
    expect(chipOf(noDone.html, 'Modelo B')).toContain('✔ Sin marcar como hecha')
    expect(chipOf(noDone.html, 'Modelo B')).not.toContain('Sin justificante')
  })

  it('opens with a summary of how many are red, amber and already complete', () => {
    const email = build(
      [
        item({ modelLabel: 'Rojo 1', completion: { level: 'missing' } }),
        item({ modelLabel: 'Rojo 2', completion: { level: 'missing' } }),
        item({
          modelLabel: 'Ambar 1',
          completion: { level: 'partial', reason: 'done_without_document' },
        }),
      ],
      7
    )

    expect(email.html).toContain('Resumen · plazo 20 abr')
    expect(email.html).toMatch(/>2<\/td>[\s\S]*?>Rojo</)
    expect(email.html).toMatch(/>1<\/td>[\s\S]*?>Ámbar</)
    expect(email.html).toMatch(/>7<\/td>[\s\S]*?>Completas</)
    expect(email.html).toContain('Hechas y con justificante: no se avisan')
    expect(email.text).toContain(
      'Resumen (plazo 20 abr): 2 sin hacer y sin justificante, 1 con una de las dos cosas, 7 completas.'
    )
    // El resumen va antes de la lista de clientes.
    expect(email.html.indexOf('Resumen · plazo')).toBeLessThan(email.html.indexOf('Cliente A'))
  })

  it('lists every deadline covered when the digest spans several', () => {
    const email = build([
      item({ deadline: new Date(2026, 3, 20) }),
      item({ clientName: 'Cliente B', deadline: new Date(2026, 3, 30) }),
    ])

    expect(email.html).toContain('Resumen · plazo 20 abr y 30 abr')
  })

  it('shows 0 complete when none are reported', () => {
    const email = build([item()])

    expect(email.html).toMatch(/>0<\/td>[\s\S]*?>Completas</)
  })

  it('does not paint an amber chip red', () => {
    const email = build([
      item({ completion: { level: 'partial', reason: 'done_without_document' } }),
    ])

    // El único borde rojo del correo es la muestra del resumen.
    expect(email.html.match(/border: 1px solid #C0392B/g)).toHaveLength(1)
  })
})
