'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import {
  getOdooSignItemDoneStates,
  getOdooSignRequestItemModel,
  getOdooSignRequestModel,
} from '@/src/modules/firmas/infrastructure/firmas-env'
import type { PortalAttachmentDownloadResult } from '@/src/modules/portal/domain/portal-record-types'
import { fetchAttachmentBinary } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import {
  isOdooApiConfigured,
  odooSearchRead,
  resolveOdooErrorCode,
} from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

async function verifySignatureBelongsToPartner(
  requestId: number,
  partnerId: number
): Promise<boolean> {
  const rows = await odooSearchRead<{ id: number }>(
    getOdooSignRequestItemModel(),
    {
      domain: [
        ['sign_request_id', '=', requestId],
        ['partner_id', '=', partnerId],
        ['state', 'in', getOdooSignItemDoneStates()],
      ],
      fields: ['id'],
      limit: 1,
    }
  )
  return rows.length > 0
}

export async function downloadSignedDocumentAction(input: {
  requestId: number
  attachmentId: number
}): Promise<PortalAttachmentDownloadResult> {
  const session = await getSession()
  if (!session || !isClientOrWorkerRole(session.user.role)) {
    return { ok: false, error: 'forbidden' }
  }

  const partnerId = await resolveClientOdooPartnerId(session.user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const requestId = Number(input.requestId)
  const attachmentId = Number(input.attachmentId)
  if (
    !Number.isInteger(requestId) ||
    requestId <= 0 ||
    !Number.isInteger(attachmentId) ||
    attachmentId <= 0
  ) {
    return { ok: false, error: 'not_found' }
  }

  try {
    const allowed = await verifySignatureBelongsToPartner(requestId, partnerId)
    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    const binary = await fetchAttachmentBinary(attachmentId)
    if (
      binary.resModel !== getOdooSignRequestModel() ||
      binary.resId !== requestId
    ) {
      return { ok: false, error: 'not_found' }
    }

    return {
      ok: true,
      filename: binary.filename,
      mimetype: binary.mimetype,
      dataBase64: binary.dataBase64,
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'ODOO_ATTACHMENT_NOT_FOUND') {
      return { ok: false, error: 'not_found' }
    }
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
