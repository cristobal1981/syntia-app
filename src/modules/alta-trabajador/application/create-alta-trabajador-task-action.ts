'use server'

import { updateTag } from 'next/cache'

import { getOdooModelForRecordKind } from '@/src/modules/portal/infrastructure/portal-record-access'
import { isOdooApiConfigured } from '@/src/modules/portal/infrastructure/odoo-json-client'
import { createAttachmentsForRecord } from '@/src/modules/portal/infrastructure/odoo-attachments-repository'
import { validateChatterUploadFiles } from '@/src/modules/portal/lib/chatter-attachment-validation'
import { getSession } from '@/src/modules/auth/application/get-session'
import { isClientOrWorkerRole } from '@/src/modules/auth/domain/types'
import { getAllowedSectionsForWorker } from '@/src/modules/colaboradores/application/get-allowed-sections-for-worker'
import {
  formatProcedureRecordDescriptionHtml,
  formatProcedureTicketSubject,
} from '@/src/modules/tramites/domain/format-procedure-ticket'
import type { TrabajadorAltaPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'
import {
  normalizeProcedureTicketPayload,
  validateProcedureTicketPayload,
  type ProcedureFieldErrorKey,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'
import { resolveClientOdooPartnerId } from '@/src/modules/tramites/application/resolve-client-odoo-partner-id'
import { tramitesSnapshotCacheTag } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import { createPartnerTask } from '@/src/modules/tramites/infrastructure/odoo-create-task-repository'

export type CreateAltaTrabajadorTaskResult =
  | {
      ok: true
      recordId: number
      name: string
    }
  | {
      ok: false
      error: 'forbidden' | 'not_linked' | 'odoo_unavailable' | 'validation' | 'create_failed'
      fieldErrors?: Record<string, ProcedureFieldErrorKey>
    }

/**
 * A diferencia de `createProcedureTicketAction` (baja-trabajador/carta-vacaciones),
 * esta acción NO postea el resumen como mensaje de chatter: duplicaba la
 * descripción de la task (uso interno del gestor) como un mensaje más en el
 * chat de Syntia, visible para el titular sin aportar nada nuevo.
 */
export async function createAltaTrabajadorTaskAction(
  payload: TrabajadorAltaPayload
): Promise<CreateAltaTrabajadorTaskResult> {
  const session = await getSession()
  if (!session || !isClientOrWorkerRole(session.user.role)) {
    return { ok: false, error: 'forbidden' }
  }

  /** Ver `create-ticket-action.ts`: mismo motivo, mismo guard de sección. */
  if (session.user.role === 'worker') {
    const allowed = await getAllowedSectionsForWorker(session.user)
    if (!allowed.has('/tramites')) {
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

  if (
    normalized.identityDocument &&
    !validateChatterUploadFiles([normalized.identityDocument]).ok
  ) {
    return {
      ok: false,
      error: 'validation',
      fieldErrors: { identityDocument: 'attachmentRequired' },
    }
  }

  const subject = formatProcedureTicketSubject(normalized)
  const description = formatProcedureRecordDescriptionHtml(normalized)

  try {
    const recordId = await createPartnerTask({
      partnerId,
      name: subject,
      description,
    })

    if (normalized.identityDocument) {
      try {
        await createAttachmentsForRecord({
          resModel: getOdooModelForRecordKind('task'),
          resId: recordId,
          files: [normalized.identityDocument],
        })
      } catch {
        // Best-effort: la tarea ya se creó correctamente; el gestor puede pedir el
        // documento por chat si el adjunto no llega a subirse.
      }
    }

    updateTag(tramitesSnapshotCacheTag(partnerId))

    return { ok: true, recordId, name: subject }
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'ODOO_CLIENT_PROJECT_NOT_FOUND') {
        return { ok: false, error: 'not_linked' }
      }
      if (error.message === 'ODOO_TASK_CREATE_FAILED') {
        return { ok: false, error: 'create_failed' }
      }
    }
    return { ok: false, error: 'odoo_unavailable' }
  }
}
