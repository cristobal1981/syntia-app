import { describe, expect, it } from 'vitest'

import {
  buildClientInvitationEmail,
  INVITATION_CONTACT_EMAIL,
} from '@/content/client-invitation-email'

const build = (overrides: Partial<Parameters<typeof buildClientInvitationEmail>[0]> = {}) =>
  buildClientInvitationEmail({
    siteUrl: 'https://app.syntia.es',
    inviteeEmail: 'ana@ejemplo.com',
    isOverrideRecipient: false,
    ...overrides,
  })

describe('buildClientInvitationEmail', () => {
  it('dice que alguien le ha invitado y a quién escribir para darse de alta', () => {
    const email = build()

    expect(email.subject).toBe('Alguien te ha invitado a conocer Syntia')
    expect(email.html).toContain('te ha invitado a conocerlo')
    expect(email.html).toContain(`mailto:${INVITATION_CONTACT_EMAIL}`)
    expect(email.text).toContain(`escribe a ${INVITATION_CONTACT_EMAIL}`)
    expect(INVITATION_CONTACT_EMAIL).toBe('contacto@tenaasesores.es')
  })

  it('enlaza a la web de Syntia', () => {
    const email = build({ siteUrl: 'https://app.syntia.es' })

    expect(email.html).toContain('href="https://app.syntia.es"')
    expect(email.text).toContain('https://app.syntia.es')
  })

  it('aclara que no se ha creado ninguna cuenta', () => {
    expect(build().text).toContain('no se ha creado ninguna cuenta')
  })

  it('no nombra a quien invita', () => {
    const email = build()

    expect(email.html).toContain('Alguien que ya usa Syntia')
    expect(email.text).not.toMatch(/\bte ha invitado [A-ZÁÉÍÓÚ][a-záéíóú]+/)
  })

  it('en un envío de prueba avisa del destinatario real', () => {
    const email = build({ isOverrideRecipient: true })

    expect(email.html).toContain('Correo de prueba')
    expect(email.html).toContain('ana@ejemplo.com')
    expect(email.text).toContain('Correo de prueba: invitación generada para ana@ejemplo.com')
  })

  it('en producción no muestra el aviso de prueba', () => {
    expect(build().html).not.toContain('Correo de prueba')
  })

  it('escapa el correo mostrado en el aviso de prueba', () => {
    const email = build({ isOverrideRecipient: true, inviteeEmail: '<script>x</script>@a.es' })

    expect(email.html).not.toContain('<script>x</script>')
  })
})
