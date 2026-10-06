import type { EmailBlock } from '@/src/modules/email/domain/blocks'
import { renderBrandedEmail } from '@/src/modules/email/application/render-branded-email'

type ObligacionReminderEmailParams = {
  modelLabel: string
  deadlineLabel: string
  daysLeft: number
  portalUrl: string
  realRecipientEmail: string
  isOverrideRecipient: boolean
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

export function buildObligacionReminderEmail({
  modelLabel,
  deadlineLabel,
  daysLeft,
  portalUrl,
  realRecipientEmail,
  isOverrideRecipient,
}: ObligacionReminderEmailParams) {
  const daysLabel = daysLeft === 0 ? 'hoy' : daysLeft === 1 ? 'en 1 día' : `en ${daysLeft} días`
  const subject = `${modelLabel} vence ${daysLabel}`

  const body = `El plazo de <strong>${escapeHtml(modelLabel)}</strong> vence el <strong>${escapeHtml(deadlineLabel)}</strong>. Si ya está presentado o en trámite con tu asesoría, puedes ignorar este aviso.`

  const bloques: EmailBlock[] = []

  if (isOverrideRecipient) {
    bloques.push({
      tipo: 'caja',
      tema: 'advertencia',
      textoLibre: `Correo de prueba: aviso generado para <strong>${escapeHtml(realRecipientEmail)}</strong>.`,
    })
  }

  bloques.push({ tipo: 'parrafo', html: body })
  bloques.push({ tipo: 'cta', href: portalUrl, label: 'Ver en el portal' })

  const html = renderBrandedEmail({
    tipo: 'cliente',
    saludo: 'Hola,',
    despedida: 'Un cordial saludo,',
    bloques,
  })

  const text = [
    'Hola,',
    isOverrideRecipient ? `Correo de prueba: aviso generado para ${realRecipientEmail}.` : '',
    `El plazo de ${modelLabel} vence el ${deadlineLabel}.`,
    'Si ya está presentado o en trámite con tu asesoría, puedes ignorar este aviso.',
    portalUrl,
    '',
    'Un cordial saludo,',
    'Syntia',
  ]
    .filter(Boolean)
    .join('\n')

  return { subject, html, text }
}
