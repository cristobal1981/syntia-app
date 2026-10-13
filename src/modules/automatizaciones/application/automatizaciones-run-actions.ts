'use server'

import {
  adminCanSeeAutomation,
  advisorCanSeeAutomation,
  validateAutomationInputValues,
} from '@/src/modules/automatizaciones/domain/types'
import {
  formatAutomationActionError,
  formatAutomationWebhookError,
} from '@/src/modules/automatizaciones/domain/format-automation-errors'
import {
  type AutomatizacionesResult,
  requireStaffSession,
} from '@/src/modules/automatizaciones/application/automatizaciones-actions-shared'
import { isAutomatizacionesConfigured } from '@/src/modules/automatizaciones/infrastructure/automation-env'
import {
  getPortalAutomationById,
  insertPortalAutomationRun,
  listPortalAutomationsFromDb,
  replaceUserAutomationOrder,
  updateAutomationGlobalOrder,
} from '@/src/modules/automatizaciones/infrastructure/automation-repository.supabase'
import { triggerAutomationWebhook } from '@/src/modules/portal/infrastructure/n8n-webhook-client'

export async function triggerAutomationAction(
  automationId: string,
  inputValues?: Record<string, string>,
  companyIdsByField?: Record<string, number[]>
): Promise<AutomatizacionesResult<{ status: 'sent' | 'failed' }>> {
  try {
    const { session, actorId } = await requireStaffSession()

    if (!isAutomatizacionesConfigured()) {
      return { ok: false, error: 'not_configured' }
    }

    const automation = await getPortalAutomationById(automationId)
    if (!automation) {
      return { ok: false, error: 'not_found' }
    }

    const canRun =
      session.user.role === 'admin'
        ? adminCanSeeAutomation(automation)
        : advisorCanSeeAutomation(automation, actorId)

    if (!canRun) {
      return { ok: false, error: 'forbidden' }
    }

    const inputsResult = validateAutomationInputValues(
      automation.inputFields,
      inputValues ?? {},
      companyIdsByField ?? {}
    )
    if (!inputsResult.ok) {
      // No se registra run: no hubo intento de webhook.
      return { ok: false, error: 'invalid_input', message: inputsResult.message }
    }

    const result = await triggerAutomationWebhook(
      automation.webhookPath,
      inputsResult.payload
    )

    const status = result.ok ? 'sent' : 'failed'
    const friendlyError = result.ok
      ? undefined
      : formatAutomationWebhookError(result)

    await insertPortalAutomationRun({
      automationId: automation.id,
      triggeredBy: actorId,
      status,
      httpStatus: result.ok ? result.httpStatus : result.httpStatus,
      errorMessage: friendlyError,
    })

    if (!result.ok) {
      return {
        ok: false,
        error: 'webhook_failed',
        message: friendlyError,
      }
    }

    return { ok: true, data: { status } }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: formatAutomationActionError(
        'unknown',
        error instanceof Error ? error.message : undefined
      ),
    }
  }
}

/**
 * Rellena las posiciones de `globalIds` ocupadas por ids presentes en `subset`
 * con la secuencia de `subset`; el resto (p. ej. inactivas no visibles en el
 * grid) conserva su hueco.
 */
function mergeOrderedSubset(globalIds: string[], subset: string[]): string[] {
  const subsetSet = new Set(subset)
  let cursor = 0
  return globalIds.map((id) =>
    subsetSet.has(id) ? subset[cursor++] : id
  )
}

export async function reorderAutomationsAction(
  orderedIds: string[]
): Promise<AutomatizacionesResult<{ scope: 'global' | 'personal' }>> {
  try {
    const { session, actorId } = await requireStaffSession()

    const ids = orderedIds.filter(
      (id, index) => typeof id === 'string' && id && orderedIds.indexOf(id) === index
    )
    if (!ids.length) {
      return { ok: false, error: 'invalid_input', message: 'Orden vacío.' }
    }

    if (session.user.role === 'admin') {
      const catalog = await listPortalAutomationsFromDb()
      const catalogIds = new Set(catalog.map((automation) => automation.id))
      if (ids.some((id) => !catalogIds.has(id))) {
        return { ok: false, error: 'not_found' }
      }

      const merged = mergeOrderedSubset(
        catalog.map((automation) => automation.id),
        ids
      )
      await updateAutomationGlobalOrder(merged)
      return { ok: true, data: { scope: 'global' } }
    }

    const catalog = await listPortalAutomationsFromDb()
    const byId = new Map(catalog.map((automation) => [automation.id, automation]))
    for (const id of ids) {
      const automation = byId.get(id)
      if (!automation || !advisorCanSeeAutomation(automation, actorId)) {
        return { ok: false, error: 'forbidden' }
      }
    }

    await replaceUserAutomationOrder(actorId, ids)
    return { ok: true, data: { scope: 'personal' } }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}
