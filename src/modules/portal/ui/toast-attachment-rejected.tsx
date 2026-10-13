'use client'

import { toast } from 'sonner'

import { Sappo } from '@/components/errors/sappo'
import { portalChatter } from '@/content/portal-chatter'
import type { ChatterAttachmentValidationError } from '@/src/modules/portal/lib/chatter-attachment-validation'

/** Aviso de adjuntos rechazados: título, explicación y Sappo en gesto «oops». */
export function toastAttachmentRejected(code: ChatterAttachmentValidationError) {
  const copy = portalChatter.attachmentNotices[code]

  toast.warning(copy.title, {
    id: 'attachment-rejected',
    description: copy.description,
    icon: <Sappo mood="oops" className="block h-auto w-9" />,
    duration: 9000,
  })
}
