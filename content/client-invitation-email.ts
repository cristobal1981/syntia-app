import type { EmailBlock } from '@/src/modules/email/domain/blocks'
import { renderBrandedEmail } from '@/src/modules/email/application/render-branded-email'
import { escapeHtml } from '@/src/modules/email/domain/escape-html'

/** Dónde pide darse de alta quien recibe la invitación. */
export const INVITATION_CONTACT_EMAIL = 'contacto@tenaasesores.es'

type ClientInvitationEmailParams = {
  /** Enlace a la web de Syntia. */
  siteUrl: string
  /** Correo real de la persona invitada (se ve en el aviso de prueba). */
  inviteeEmail: string
  isOverrideRecipient: boolean
}

/**
 * Correo a una persona que un cliente invita a conocer Syntia. No nombra a
 * quien invita («alguien») y no crea ninguna cuenta: quien lo recibe, si le
 * interesa, escribe a `INVITATION_CONTACT_EMAIL` para darse de alta.
 */
export function buildClientInvitationEmail({
  siteUrl,
  inviteeEmail,
  isOverrideRecipient,
}: ClientInvitationEmailParams) {
  const subject = 'Alguien te ha invitado a conocer Syntia'

  const bloques: EmailBlock[] = []

  if (isOverrideRecipient) {
    bloques.push({
      tipo: 'caja',
      tema: 'advertencia',
      textoLibre: `Correo de prueba: invitación generada para <strong>${escapeHtml(inviteeEmail)}</strong>.`,
    })
  }

  bloques.push({
    tipo: 'parrafo',
    html: 'Alguien que ya usa Syntia, el portal de tenaasesores, te ha invitado a conocerlo. Syntia es nuestra plataforma digital de asesoría: desde ella se siguen trámites, obligaciones fiscales, firmas y documentos de forma clara y cercana.',
  })
  bloques.push({
    tipo: 'parrafo',
    html: `Si te interesa darte de alta con nosotros y empezar con Syntia, escribe a <a href="mailto:${INVITATION_CONTACT_EMAIL}" style="color:#01635C;font-weight:600;">${INVITATION_CONTACT_EMAIL}</a> diciendo que quieres darte de alta y empezar con Syntia, y nos pondremos en contacto contigo.`,
  })
  bloques.push({ tipo: 'cta', href: siteUrl, label: 'Conocer Syntia' })
  bloques.push({
    tipo: 'parrafo',
    html: '<span style="color:#5B6E6C;font-size:14px;">Si no esperabas este correo, puedes ignorarlo: no se ha creado ninguna cuenta ni hace falta que hagas nada.</span>',
  })

  const html = renderBrandedEmail({
    tipo: 'cliente',
    saludo: 'Hola,',
    despedida: 'Un cordial saludo,',
    bloques,
  })

  const text = [
    'Hola,',
    isOverrideRecipient ? `Correo de prueba: invitación generada para ${inviteeEmail}.` : '',
    'Alguien que ya usa Syntia, el portal de tenaasesores, te ha invitado a conocerlo. Syntia es nuestra plataforma digital de asesoría: desde ella se siguen trámites, obligaciones fiscales, firmas y documentos.',
    `Si te interesa darte de alta con nosotros y empezar con Syntia, escribe a ${INVITATION_CONTACT_EMAIL} diciendo que quieres darte de alta y empezar con Syntia, y nos pondremos en contacto contigo.`,
    `Conocer Syntia: ${siteUrl}`,
    'Si no esperabas este correo, puedes ignorarlo: no se ha creado ninguna cuenta ni hace falta que hagas nada.',
    '',
    'Un cordial saludo,',
    'Syntia',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
