import type { PortalAttachment } from '@/src/modules/portal/domain/portal-record-types'
import {
  isOdooApiConfigured,
  odooCall,
  odooSearchRead,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

type OdooAttachmentRow = {
  id: number
  name: string
  mimetype?: string | false | null
  file_size?: number | false | null
  create_date?: string | false | null
  res_model?: string | false | null
  res_id?: number | false | null
  datas?: string | false | null
}

function mapAttachment(row: OdooAttachmentRow): PortalAttachment {
  return {
    id: row.id,
    name: row.name,
    mimetype: typeof row.mimetype === 'string' ? row.mimetype : undefined,
    fileSize: typeof row.file_size === 'number' ? row.file_size : undefined,
    createDate:
      typeof row.create_date === 'string' ? row.create_date : undefined,
  }
}

export async function resolveAttachmentNamesByIds(
  attachmentIds: number[]
): Promise<Map<number, string>> {
  const meta = await resolveAttachmentMetaByIds(attachmentIds)
  const names = new Map<number, string>()
  for (const [id, attachment] of meta) {
    names.set(id, attachment.name)
  }
  return names
}

export async function resolveAttachmentMetaByIds(
  attachmentIds: number[]
): Promise<Map<number, PortalAttachment>> {
  const meta = new Map<number, PortalAttachment>()
  if (!attachmentIds.length) return meta

  const rows = await odooSearchRead<OdooAttachmentRow>('ir.attachment', {
    domain: [['id', 'in', attachmentIds]],
    fields: ['name', 'mimetype', 'file_size'],
    limit: attachmentIds.length,
  })

  for (const row of rows) {
    if (row.id && row.name) {
      meta.set(row.id, mapAttachment(row))
    }
  }

  return meta
}

export async function createAttachmentsForRecord(input: {
  resModel: string
  resId: number
  files: Array<{ name: string; mimetype: string; dataBase64: string }>
}): Promise<number[]> {
  if (!input.files.length) return []

  const created = await odooCall<number | number[]>('ir.attachment', 'create', {
    vals_list: input.files.map((file) => ({
      name: file.name,
      datas: file.dataBase64,
      mimetype: file.mimetype,
      res_model: input.resModel,
      res_id: input.resId,
    })),
  })

  if (typeof created === 'number' && created > 0) {
    return [created]
  }

  if (Array.isArray(created)) {
    return created.filter((id): id is number => typeof id === 'number' && id > 0)
  }

  return []
}

export async function listAttachmentsForRecord(
  resModel: string,
  resId: number
): Promise<PortalAttachment[]> {
  const rows = await odooSearchRead<OdooAttachmentRow>('ir.attachment', {
    domain: [
      ['res_model', '=', resModel],
      ['res_id', '=', resId],
    ],
    fields: ['name', 'mimetype', 'file_size', 'create_date'],
    order: 'create_date desc, id desc',
    limit: 50,
  })

  return rows.map(mapAttachment)
}

export async function countAttachmentsByRecordIds(
  resModel: string,
  resIds: number[]
): Promise<Map<number, number>> {
  const counts = new Map<number, number>()
  if (!resIds.length) return counts

  const rows = await odooSearchRead<{ res_id?: number | false | null }>(
    'ir.attachment',
    {
      domain: [
        ['res_model', '=', resModel],
        ['res_id', 'in', resIds],
      ],
      fields: ['res_id'],
      limit: 500,
    }
  )

  for (const row of rows) {
    if (typeof row.res_id !== 'number') continue
    counts.set(row.res_id, (counts.get(row.res_id) ?? 0) + 1)
  }

  return counts
}

export async function fetchAttachmentBinary(attachmentId: number): Promise<{
  filename: string
  mimetype: string
  dataBase64: string
  resModel: string
  resId: number
}> {
  if (!isOdooApiConfigured()) {
    throw new Error('ODOO_NOT_CONFIGURED')
  }

  const rows = await odooSearchRead<OdooAttachmentRow>('ir.attachment', {
    domain: [['id', '=', attachmentId]],
    fields: ['name', 'mimetype', 'datas', 'res_model', 'res_id'],
    limit: 1,
  })

  const row = rows[0]
  if (!row || typeof row.datas !== 'string' || !row.datas) {
    throw new Error('ODOO_ATTACHMENT_NOT_FOUND')
  }

  const resModel = typeof row.res_model === 'string' ? row.res_model : ''
  const resId = typeof row.res_id === 'number' ? row.res_id : 0

  if (!resModel || !resId) {
    throw new Error('ODOO_ATTACHMENT_NOT_FOUND')
  }

  return {
    filename: row.name,
    mimetype:
      typeof row.mimetype === 'string' ? row.mimetype : 'application/octet-stream',
    dataBase64: row.datas,
    resModel,
    resId,
  }
}
