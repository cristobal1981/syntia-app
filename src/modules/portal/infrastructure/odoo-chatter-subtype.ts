import {
  getDefaultChatterCommentSubtypeId,
} from '@/src/modules/portal/infrastructure/portal-chatter-env'
import { odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

let cachedCommentSubtypeId: number | null = null

export async function resolveChatterCommentSubtypeId(): Promise<number> {
  if (cachedCommentSubtypeId !== null) {
    return cachedCommentSubtypeId
  }

  const fromEnv = getDefaultChatterCommentSubtypeId()
  if (process.env.ODOO_CHATTER_COMMENT_SUBTYPE_ID?.trim()) {
    cachedCommentSubtypeId = fromEnv
    return fromEnv
  }

  const rows = await odooSearchRead<{ id: number; name?: string | false }>(
    'mail.message.subtype',
    {
      domain: [['internal', '=', false], ['default', '=', true]],
      fields: ['id', 'name'],
      limit: 1,
      order: 'id asc',
    }
  )

  cachedCommentSubtypeId = rows[0]?.id ?? fromEnv
  return cachedCommentSubtypeId
}
