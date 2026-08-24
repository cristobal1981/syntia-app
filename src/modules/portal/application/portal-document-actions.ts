'use server'

import JSZip from 'jszip'

import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import type {
  PortalAttachmentDownloadResult,
  PortalAttachmentsZipResult,
  PortalRecordAttachmentsResult,
  PortalRecordKind,
} from '@/src/modules/portal/domain/portal-record-types'
import {
  fetchAttachmentBinary,
  listAttachmentsForRecord,
} from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import {
  getOdooModelForRecordKind,
  verifyClientRecordAccess,
} from '@/src/modules/portal/infrastructure/portal-record-access'
import { isOdooApiConfigured, resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'

async function resolveClientPartnerId(): Promise<
  | { ok: true; partnerId: number }
  | { ok: false; error: 'forbidden' | 'not_linked' | 'odoo_unavailable' }
> {
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

  return { ok: true, partnerId }
}

export async function getRecordAttachmentsAction(input: {
  kind: PortalRecordKind
  recordId: number
}): Promise<PortalRecordAttachmentsResult> {
  const access = await resolveClientPartnerId()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = Number(input.recordId)
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return { ok: false, error: 'not_found' }
  }

  try {
    const allowed = await verifyClientRecordAccess(
      input.kind,
      recordId,
      access.partnerId
    )
    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    const attachments = await listAttachmentsForRecord(
      getOdooModelForRecordKind(input.kind),
      recordId
    )

    return { ok: true, attachments }
  } catch (error) {
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}

export async function downloadAttachmentAction(input: {
  kind: PortalRecordKind
  recordId: number
  attachmentId: number
}): Promise<PortalAttachmentDownloadResult> {
  const access = await resolveClientPartnerId()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = Number(input.recordId)
  const attachmentId = Number(input.attachmentId)
  if (
    !Number.isInteger(recordId) ||
    recordId <= 0 ||
    !Number.isInteger(attachmentId) ||
    attachmentId <= 0
  ) {
    return { ok: false, error: 'not_found' }
  }

  try {
    const allowed = await verifyClientRecordAccess(
      input.kind,
      recordId,
      access.partnerId
    )
    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    const binary = await fetchAttachmentBinary(attachmentId)
    const expectedModel = getOdooModelForRecordKind(input.kind)

    if (binary.resModel !== expectedModel || binary.resId !== recordId) {
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

function sanitizeZipBaseName(name: string): string {
  const cleaned = name
    .trim()
    .replace(/[^\w\s-áéíóúñÁÉÍÓÚÑ]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 80)
  return cleaned || 'documentos'
}

export async function downloadAllAttachmentsZipAction(input: {
  kind: PortalRecordKind
  recordId: number
  recordName: string
}): Promise<PortalAttachmentsZipResult> {
  const access = await resolveClientPartnerId()
  if (!access.ok) {
    return { ok: false, error: access.error }
  }

  const recordId = Number(input.recordId)
  if (!Number.isInteger(recordId) || recordId <= 0) {
    return { ok: false, error: 'not_found' }
  }

  try {
    const allowed = await verifyClientRecordAccess(
      input.kind,
      recordId,
      access.partnerId
    )
    if (!allowed) {
      return { ok: false, error: 'not_found' }
    }

    const attachments = await listAttachmentsForRecord(
      getOdooModelForRecordKind(input.kind),
      recordId
    )

    if (!attachments.length) {
      return { ok: false, error: 'no_attachments' }
    }

    const zip = new JSZip()

    for (const attachment of attachments) {
      const binary = await fetchAttachmentBinary(attachment.id)
      const expectedModel = getOdooModelForRecordKind(input.kind)

      if (binary.resModel !== expectedModel || binary.resId !== recordId) {
        return { ok: false, error: 'not_found' }
      }

      zip.file(binary.filename, Buffer.from(binary.dataBase64, 'base64'))
    }

    const zipBase64 = await zip.generateAsync({ type: 'base64' })

    return {
      ok: true,
      filename: `${sanitizeZipBaseName(input.recordName)}.zip`,
      mimetype: 'application/zip',
      dataBase64: zipBase64,
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'ODOO_ATTACHMENT_NOT_FOUND') {
      return { ok: false, error: 'not_found' }
    }
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
