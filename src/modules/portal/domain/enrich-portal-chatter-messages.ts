import { portalChatter } from '@/content/portal-chatter'
import { normalizeChatterDisplaySnippet } from '@/src/modules/portal/domain/normalize-chatter-display-body'
import type {
  PortalChatterMessage,
  PortalChatterParentPreview,
} from '@/src/modules/portal/domain/portal-chatter-types'

function buildPreviewFromMessage(message: PortalChatterMessage): PortalChatterParentPreview {
  return {
    authorName: message.isFromClient ? portalChatter.youLabel : message.authorName,
    snippet: normalizeChatterDisplaySnippet(message.bodyHtml),
  }
}

export function enrichPortalChatterMessages(
  messages: PortalChatterMessage[]
): PortalChatterMessage[] {
  const byId = new Map(messages.map((message) => [message.id, message]))

  return messages.map((message) => {
    if (!message.parentId || message.parentPreview) {
      return message
    }

    // Odoo's own chatter has no "reply to this message" UI — it auto-chains
    // parent_id to the previous message on the thread purely for email
    // threading (References/In-Reply-To), regardless of what the advisor
    // actually intended. Only the portal's own composer lets a user pick a
    // specific parent (see handleReply/ChatterReplyBanner in
    // record-chatter-panel.tsx), and that always posts as the client. So
    // only trust parent_id as a genuine "replying to" signal on
    // client-authored messages; showing it for advisor messages would quote
    // a message the advisor never chose to reply to.
    if (!message.isFromClient) {
      return message
    }

    const parent = byId.get(message.parentId)
    if (!parent) {
      // Odoo can chain a message's parent_id to an internal/log entry that
      // never reaches the client (filtered out by filterOdooMailMessageRows,
      // e.g. record-creation log). That parent will never resolve here, so
      // don't fabricate a placeholder that implies a reply that doesn't
      // exist from the client's point of view. Leave parentId in place so a
      // later merge (e.g. loading older messages) can still resolve it.
      return message
    }

    return { ...message, parentPreview: buildPreviewFromMessage(parent) }
  })
}
