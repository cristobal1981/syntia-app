import { describe, expect, it } from 'vitest'

import { parseLeadPayload } from '@/app/api/odoo/solicitudes/route'

describe('parseLeadPayload', () => {
  it('acepta un payload mínimo válido (email + partner_id numérico)', () => {
    const result = parseLeadPayload({ email: 'lead@example.com', partner_id: 42 })

    expect(result).toEqual({
      ok: true,
      lead: { email: 'lead@example.com', label: 'lead@example.com', odooPartnerId: 42 },
    })
  })

  it('usa name/contact_name/partner_name como label cuando viene, y email_from como fallback de email', () => {
    const result = parseLeadPayload({
      email_from: 'Lead@Example.com',
      name: 'Juan Pérez',
      partner_id: 7,
    })

    expect(result).toEqual({
      ok: true,
      lead: { email: 'lead@example.com', label: 'Juan Pérez', odooPartnerId: 7 },
    })
  })

  it('acepta partner_id en formato many2one de Odoo [id, "Nombre"]', () => {
    const result = parseLeadPayload({ email: 'lead@example.com', partner_id: [99, 'Cliente SL'] })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.lead.odooPartnerId).toBe(99)
    }
  })

  it('rechaza el body si no es un objeto JSON', () => {
    const result = parseLeadPayload('no soy un objeto')

    expect(result.ok).toBe(false)
  })

  it('rechaza cuando falta el email', () => {
    const result = parseLeadPayload({ partner_id: 1 })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/email/)
    }
  })

  it('rechaza un email con formato inválido (antes solo comprobaba que no estuviera vacío)', () => {
    const result = parseLeadPayload({ email: 'no-es-un-email', partner_id: 1 })

    expect(result.ok).toBe(false)
  })

  it('rechaza cuando falta partner_id', () => {
    const result = parseLeadPayload({ email: 'lead@example.com' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/odooPartnerId/)
    }
  })

  it('rechaza partner_id=0 o negativo (parsePartnerId los descarta, igual que un many2one `false`)', () => {
    const result = parseLeadPayload({ email: 'lead@example.com', partner_id: 0 })

    expect(result.ok).toBe(false)
  })

  it('rechaza un label por encima de 200 caracteres', () => {
    const result = parseLeadPayload({
      email: 'lead@example.com',
      partner_id: 1,
      name: 'a'.repeat(201),
    })

    expect(result.ok).toBe(false)
  })
})
