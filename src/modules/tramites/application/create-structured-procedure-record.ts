import { updateTag } from 'next/cache'

import { getOdooModelForRecordKind } from '@/src/modules/portal/infrastructure/portal-record-access'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { postRecordComment } from '@/src/modules/portal/infrastructure/odoo-messages-repository'
import { createAttachmentsForRecord } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import { validateChatterUploadFiles } from '@/src/modules/portal/lib/chatter-attachment-validation'
import type { PortalChatterUploadFile } from '@/src/modules/portal/domain/portal-chatter-types'
import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import { getWorkerWriteSections } from '@/src/modules/colaboradores/application/get-worker-write-sections'
import {
  formatProcedureRecordDescriptionHtml,
  formatProcedureTicketChatterMessage,
  formatProcedureTicketSubject,
} from '@/src/modules/tramites/domain/format-procedure-ticket'
import type { ProcedureTicketPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'
import {
  normalizeProcedureTicketPayload,
  validateProcedureTicketPayload,
  type ProcedureFieldErrorKey,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'
import { tramitesSnapshotCacheTag } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { createPartnerTask } from '@/src/modules/tramites/infrastructure/odoo-create-task-repository'
import { createPartnerTicket } from '@/src/modules/tramites/infrastructure/odoo-create-ticket-repository'

export type ProcedureRecordKind = 'task' | 'ticket'

export type CreateStructuredProcedureResult =
  | {
      ok: true
      recordId: number
      name: string
    }
  | {
      ok: false
      error:
        | 'forbidden'
        | 'not_linked'
        | 'odoo_unavailable'
        | 'validation'
        | 'create_failed'
      fieldErrors?: Record<string, ProcedureFieldErrorKey>
    }

export type CreateStructuredProcedureInput<T extends ProcedureTicketPayload> = {
  payload: T
  /** 'task' crea un `project.task` (hoy solo alta-trabajador); 'ticket' crea el ticket genérico de helpdesk. */
  recordKind: ProcedureRecordKind
  /** Si postea el resumen como mensaje de chatter (visible para el titular). Ver `create-alta-trabajador-task-action.ts` para el motivo de por qué alta-trabajador lo omite. */
  postChatterMessage: boolean
  /** Adjunto opcional a subir sobre el record ya creado (best-effort). */
  identityAttachment?: PortalChatterUploadFile | null
}

/**
 * Mecánica compartida por toda "solicitud estructurada" (alta/baja-trabajador,
 * carta-vacaciones, y cualquier tipo nuevo que se añada): guard de sesión/sección,
 * validación, creación del task/ticket en Odoo, chatter y adjunto opcionales, y
 * el mismo mapeo de errores de Odoo a un resultado tipado. Cada tipo de
 * procedimiento la envuelve en su propia server action (`createProcedureTicketAction`,
 * `createAltaTrabajadorTaskAction`) solo para fijar su propio tipo de payload y,
 * si aplica, un alias de campo deprecado en el resultado.
 */
export async function createStructuredProcedureRecord<T extends ProcedureTicketPayload>(
  input: CreateStructuredProcedureInput<T>
): Promise<CreateStructuredProcedureResult> {
  const { payload, recordKind, postChatterMessage, identityAttachment } = input

  const session = await getSession()
  if (!session || !isClientOrWorkerRole(session.user.role)) {
    return { ok: false, error: 'forbidden' }
  }

  /** Ver `create-ticket-action.ts`: mismo motivo, mismo guard de escritura. */
  if (session.user.role === 'worker') {
    const writeSections = await getWorkerWriteSections(session.user)
    if (!writeSections.has('/tramites')) {
      return { ok: false, error: 'forbidden' }
    }
  }

  const partnerId = await resolveClientOdooPartnerId(session.user)
  if (!partnerId) {
    return { ok: false, error: 'not_linked' }
  }

  if (!isOdooApiConfigured()) {
    return { ok: false, error: 'odoo_unavailable' }
  }

  const normalized = normalizeProcedureTicketPayload(payload)
  const fieldErrors = validateProcedureTicketPayload(normalized)

  if (Object.keys(fieldErrors).length > 0) {
    return { ok: false, error: 'validation', fieldErrors }
  }

  if (identityAttachment && !validateChatterUploadFiles([identityAttachment]).ok) {
    return {
      ok: false,
      error: 'validation',
      fieldErrors: { identityDocument: 'attachmentRequired' },
    }
  }

  const subject = formatProcedureTicketSubject(normalized)
  const description = formatProcedureRecordDescriptionHtml(normalized)

  try {
    const recordId =
      recordKind === 'task'
        ? await createPartnerTask({ partnerId, name: subject, description })
        : await createPartnerTicket({ partnerId, subject, description })

    if (postChatterMessage) {
      const requestedAt = new Date().toISOString()
      await postRecordComment({
        resModel: getOdooModelForRecordKind(recordKind),
        recordId,
        clientPartnerId: partnerId,
        htmlBody: formatProcedureTicketChatterMessage({ payload: normalized, requestedAt }),
      })
    }

    if (identityAttachment) {
      try {
        await createAttachmentsForRecord({
          resModel: getOdooModelForRecordKind(recordKind),
          resId: recordId,
          files: [identityAttachment],
        })
      } catch {
        // Best-effort: el record ya se creó correctamente; el gestor puede pedir el
        // documento por chat si el adjunto no llega a subirse.
      }
    }

    updateTag(tramitesSnapshotCacheTag(partnerId))

    return { ok: true, recordId, name: subject }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ODOO_TICKET_TEAM_NOT_CONFIGURED') {
        return { ok: false, error: 'odoo_unavailable' }
      }
      if (error.message === 'ODOO_CLIENT_PROJECT_NOT_FOUND') {
        return { ok: false, error: 'not_linked' }
      }
      if (
        error.message === 'ODOO_TICKET_CREATE_FAILED' ||
        error.message === 'ODOO_TASK_CREATE_FAILED'
      ) {
        return { ok: false, error: 'create_failed' }
      }
    }
    return { ok: false, error: 'odoo_unavailable' }
  }
}
