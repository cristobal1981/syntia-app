'use server'

import { resolveFacturacionAccess } from '@/src/modules/facturacion/application/facturacion-access'
import type {
  FacturacionResult,
  Invoice,
  InvoiceDraftInput,
} from '@/src/modules/facturacion/domain/types'
import { validateInvoiceDraft } from '@/src/modules/facturacion/domain/validate-invoice-draft'
import {
  createDraftInvoice,
  createReversal,
  fetchInvoicePdf,
  getInvoice,
  listInvoices,
  postAndSendInvoice,
  requestCancellation,
  retryVerifactuSend,
  FACTURACION_ERROR,
  type ReversalMode,
} from '@/src/modules/facturacion/infrastructure/odoo-account-move-repository'
import { resolveOdooErrorCode } from '@/src/modules/portal/infrastructure/odoo-json-client'

function mapUnknownError(error: unknown): FacturacionResult<never> {
  if (error instanceof Error && error.message === FACTURACION_ERROR.PDF_NOT_FOUND) {
    return {
      ok: false,
      error: 'not_found',
      message: 'El PDF de la factura aún no está disponible.',
    }
  }
  return { ok: false, error: resolveOdooErrorCode(error) }
}

export async function getFacturasAction(input: {
  clientUserId?: string
}): Promise<FacturacionResult<Invoice[]>> {
  const access = await resolveFacturacionAccess(input.clientUserId)
  if (!access.ok) return access

  try {
    const invoices = await listInvoices(access.companyId)
    return { ok: true, data: invoices }
  } catch (error) {
    return mapUnknownError(error)
  }
}

export async function createFacturaDraftAction(input: {
  draft: InvoiceDraftInput
  clientUserId?: string
}): Promise<FacturacionResult<{ moveId: number }>> {
  const access = await resolveFacturacionAccess(input.clientUserId)
  if (!access.ok) return access

  const validation = validateInvoiceDraft(input.draft)
  if (!validation.ok) {
    return { ok: false, error: 'validation', message: validation.message }
  }

  try {
    const moveId = await createDraftInvoice(access.companyId, input.draft)
    return { ok: true, data: { moveId } }
  } catch (error) {
    return mapUnknownError(error)
  }
}

export async function emitFacturaAction(input: {
  moveId: number
  clientUserId?: string
}): Promise<FacturacionResult<{ verifactuQueued: boolean }>> {
  const access = await resolveFacturacionAccess(input.clientUserId)
  if (!access.ok) return access

  try {
    const invoice = await getInvoice(access.companyId, input.moveId)
    if (!invoice) {
      return { ok: false, error: 'not_found' }
    }
    if (invoice.status !== 'draft') {
      return {
        ok: false,
        error: 'validation',
        message: 'Solo se pueden emitir facturas en borrador.',
      }
    }

    const result = await postAndSendInvoice(access.companyId, input.moveId)
    if (!result.verifactuQueued) {
      return {
        ok: false,
        error: 'send_failed',
        message:
          'La factura se ha emitido pero el envío VERI*FACTU no se pudo encolar. Reintenta el envío.',
      }
    }
    return { ok: true, data: result }
  } catch (error) {
    return mapUnknownError(error)
  }
}

export async function retryVerifactuSendAction(input: {
  moveId: number
  clientUserId?: string
}): Promise<FacturacionResult<{ verifactuQueued: boolean }>> {
  const access = await resolveFacturacionAccess(input.clientUserId)
  if (!access.ok) return access

  try {
    const invoice = await getInvoice(access.companyId, input.moveId)
    if (!invoice) {
      return { ok: false, error: 'not_found' }
    }

    const queued = await retryVerifactuSend(access.companyId, input.moveId)
    if (!queued) {
      return { ok: false, error: 'send_failed' }
    }
    return { ok: true, data: { verifactuQueued: true } }
  } catch (error) {
    return mapUnknownError(error)
  }
}

export async function cancelOrRectifyFacturaAction(input: {
  moveId: number
  mode: 'cancel' | ReversalMode
  reason?: string
  clientUserId?: string
}): Promise<FacturacionResult<{ done: true }>> {
  const access = await resolveFacturacionAccess(input.clientUserId)
  if (!access.ok) return access

  try {
    const invoice = await getInvoice(access.companyId, input.moveId)
    if (!invoice) {
      return { ok: false, error: 'not_found' }
    }
    if (invoice.status !== 'posted') {
      return {
        ok: false,
        error: 'validation',
        message: 'Solo se pueden rectificar o anular facturas emitidas.',
      }
    }

    if (input.mode === 'cancel') {
      await requestCancellation(access.companyId, input.moveId)
    } else {
      await createReversal(access.companyId, input.moveId, {
        mode: input.mode,
        reason: input.reason,
      })
    }
    return { ok: true, data: { done: true } }
  } catch (error) {
    return mapUnknownError(error)
  }
}

export async function getFacturaPdfAction(input: {
  moveId: number
  clientUserId?: string
}): Promise<
  FacturacionResult<{ filename: string; mimetype: string; dataBase64: string }>
> {
  const access = await resolveFacturacionAccess(input.clientUserId)
  if (!access.ok) return access

  try {
    const invoice = await getInvoice(access.companyId, input.moveId)
    if (!invoice) {
      return { ok: false, error: 'not_found' }
    }

    const pdf = await fetchInvoicePdf(access.companyId, input.moveId)
    return { ok: true, data: pdf }
  } catch (error) {
    return mapUnknownError(error)
  }
}
