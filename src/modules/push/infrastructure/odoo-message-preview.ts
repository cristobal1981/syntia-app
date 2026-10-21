import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { htmlToPushPreview } from '@/src/modules/push/domain/push-text'

/**
 * Extracto del mensaje del chatter con ese id. Solo se llama con ids que ya
 * salieron del cálculo de avisos del cliente (mensajes visibles para él), y
 * una vez por aviso que de verdad se va a enviar.
 */
export async function fetchMessagePreview(messageId: number): Promise<string | null> {
  const rows = await odooSearchRead<{ id: number; body?: string | false | null }>(
    'mail.message',
    { domain: [['id', '=', messageId]], fields: ['body'], limit: 1 }
  )
  return htmlToPushPreview(rows[0]?.body)
}
