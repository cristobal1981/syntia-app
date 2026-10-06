import { describe, expect, it } from 'vitest'

import { parseClientPayload } from '@/app/api/odoo/clientes/route'

describe('parseClientPayload', () => {
  it('acepta una persona con nombre completo partido en nombre + apellidos', () => {
    const result = parseClientPayload({
      email: 'Cliente@Example.com',
      name: 'Juan Pérez García',
    })

    // `companyName` hereda `rawName` cuando no viene `company_name` — ya
    // pasaba antes de introducir zod, no es parte de este cambio (el campo
    // simplemente se ignora para `clientKind: 'person'` en el resto del flujo).
    expect(result).toEqual({
      ok: true,
      input: {
        clientKind: 'person',
        email: 'cliente@example.com',
        firstName: 'Juan',
        firstSurname: 'Pérez García',
        secondSurname: undefined,
        companyName: 'Juan Pérez García',
        phone: undefined,
        odooPartnerId: undefined,
        driveFolderId: undefined,
        advisorId: undefined,
      },
    })
  })

  it('first_name/last_name explícitos tienen prioridad sobre el split de name', () => {
    const result = parseClientPayload({
      email: 'cliente@example.com',
      name: 'Nombre Completo Ignorado',
      first_name: 'Ana',
      last_name: 'Gómez',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.input.firstName).toBe('Ana')
      expect(result.input.firstSurname).toBe('Gómez')
    }
  })

  it('is_company=true usa company_name y no exige nombre/apellidos', () => {
    const result = parseClientPayload({
      email: 'empresa@example.com',
      is_company: true,
      company_name: 'Acme SL',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.input.clientKind).toBe('company')
      expect(result.input.companyName).toBe('Acme SL')
      expect(result.input.firstName).toBe('')
    }
  })

  it('acepta partner_id en formato many2one de Odoo [id, "Nombre"]', () => {
    const result = parseClientPayload({
      email: 'cliente@example.com',
      name: 'Juan Pérez',
      partner_id: [55, 'Juan Pérez'],
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.input.odooPartnerId).toBe('55')
    }
  })

  it('rechaza el body si no es un objeto JSON', () => {
    expect(parseClientPayload('no soy un objeto').ok).toBe(false)
  })

  it('rechaza un email con formato inválido (antes solo comprobaba que no estuviera vacío)', () => {
    const result = parseClientPayload({ email: 'no-es-un-email', name: 'Juan Pérez' })

    expect(result.ok).toBe(false)
  })

  it('persona sin nombre ni first_name es rechazada', () => {
    const result = parseClientPayload({ email: 'cliente@example.com' })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/firstName/)
    }
  })

  it('empresa sin company_name ni name es rechazada', () => {
    const result = parseClientPayload({ email: 'empresa@example.com', is_company: true })

    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.message).toMatch(/companyName/)
    }
  })

  it('rechaza un teléfono con formato inválido (antes NO se validaba en absoluto)', () => {
    const result = parseClientPayload({
      email: 'cliente@example.com',
      name: 'Juan Pérez',
      phone: 'no-es-un-telefono',
    })

    expect(result.ok).toBe(false)
  })

  it('acepta un teléfono con formato válido', () => {
    const result = parseClientPayload({
      email: 'cliente@example.com',
      name: 'Juan Pérez',
      phone: '+34 600 123 456',
    })

    expect(result.ok).toBe(true)
  })

  it('rechaza un advisor_id que no es un UUID válido (antes se aceptaba cualquier string)', () => {
    const result = parseClientPayload({
      email: 'cliente@example.com',
      name: 'Juan Pérez',
      advisor_id: 'no-es-un-uuid',
    })

    expect(result.ok).toBe(false)
  })

  it('acepta un advisor_id con formato UUID válido', () => {
    const result = parseClientPayload({
      email: 'cliente@example.com',
      name: 'Juan Pérez',
      advisor_id: '22b8a71b-7369-4270-ab70-c75df5da8307',
    })

    expect(result.ok).toBe(true)
  })

  it('rechaza un nombre por encima de 100 caracteres (antes no había límite)', () => {
    const result = parseClientPayload({
      email: 'cliente@example.com',
      first_name: 'a'.repeat(101),
      last_name: 'Pérez',
    })

    expect(result.ok).toBe(false)
  })
})
