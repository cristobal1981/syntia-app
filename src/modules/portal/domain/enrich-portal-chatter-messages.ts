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

    const parent = byId.get(message.parentId)
    const parentPreview = parent
      ? buildPreviewFromMessage(parent)
      : {
          authorName: portalChatter.previousMessage,
          snippet: portalChatter.previousMessage,
        }

    return { ...message, parentPreview }
  })
}
