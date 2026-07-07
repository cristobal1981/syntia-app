'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import type {
  AdvisorVisibility,
  AutomationInputField,
  PortalAutomation,
  PortalAutomationListItem,
  PortalAutomationRun,
} from '@/src/modules/automatizaciones/domain/types'
import {
  adminCanSeeAutomation,
  advisorCanSeeAutomation,
  validateAutomationInputFieldsDefinition,
  validateAutomationInputValues,
} from '@/src/modules/automatizaciones/domain/types'
import { isAutomatizacionesConfigured } from '@/src/modules/automatizaciones/infrastructure/automation-env'
import {
  deletePortalAutomation,
  fetchUserAutomationOrderMap,
  getNextAutomationSortOrder,
  getPortalAutomationById,
  insertPortalAutomation,
  insertPortalAutomationRun,
  listPortalAutomationRuns,
  listPortalAutomationsFromDb,
  listPortalAutomationsWithLastRun,
  replaceUserAutomationOrder,
  updateAutomationGlobalOrder,
  updatePortalAutomationAccess,
  updatePortalAutomationDefinition,
} from '@/src/modules/automatizaciones/infrastructure/automation-repository.supabase'
import { triggerAutomationWebhook } from '@/src/modules/portal/infrastructure/n8n-webhook-client'
import { isAutomationIconId } from '@/src/modules/automatizaciones/domain/automation-icons'

export type CreateAutomationInput = {
  slug: string
  title: string
  description: string
  webhookPath: string
  icon: string
  isActive: boolean
  adminOnly: boolean
  advisorVisibility: AdvisorVisibility
  inputFields: AutomationInputField[]
}

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

function normalizeSlug(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
}

function validateCreateAutomationInput(
  input: CreateAutomationInput
): { ok: true; data: CreateAutomationInput } | { ok: false; message: string } {
  const slug = normalizeSlug(input.slug)
  if (!slug || !SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      message: 'El identificador debe usar letras minúsculas, números y guiones.',
    }
  }

  const title = input.title.trim()
  if (!title) {
    return { ok: false, message: 'El título es obligatorio.' }
  }

  const webhookPath = input.webhookPath.trim()
  if (!webhookPath.startsWith('/') || webhookPath.includes('://')) {
    return {
      ok: false,
      message: 'La ruta del webhook debe ser relativa (ej. /webhook/mi-flujo).',
    }
  }

  if (!isAutomationIconId(input.icon)) {
    return { ok: false, message: 'Icono no válido.' }
  }

  const fieldsResult = validateAutomationInputFieldsDefinition(input.inputFields)
  if (!fieldsResult.ok) {
    return { ok: false, message: fieldsResult.message }
  }

  return {
    ok: true,
    data: {
      slug,
      title,
      description: input.description.trim(),
      webhookPath,
      icon: input.icon,
      isActive: input.isActive,
      adminOnly: input.adminOnly,
      advisorVisibility: input.advisorVisibility,
      inputFields: fieldsResult.fields,
    },
  }
}

export type AutomatizacionesResult<T> =
  | { ok: true; data: T }
  | {
      ok: false
      error:
        | 'unauthorized'
        | 'forbidden'
        | 'not_found'
        | 'not_configured'
        | 'invalid_input'
        | 'unknown'
      message?: string
    }

async function requireStaffSession() {
  const session = await getSession()
  if (!session) {
    throw new Error('unauthorized')
  }
  if (session.user.role === 'client') {
    throw new Error('forbidden')
  }
  const actorId = await resolveDirectoryActorId(session.user)
  return { session, actorId }
}

function filterAutomationsForUser(
  items: PortalAutomationListItem[],
  role: 'admin' | 'advisor',
  actorId: string
): PortalAutomationListItem[] {
  return items.filter((automation) => {
    if (role === 'admin') {
      return adminCanSeeAutomation(automation)
    }
    return advisorCanSeeAutomation(automation, actorId)
  })
}

export async function listAutomatizacionesAction(): Promise<
  AutomatizacionesResult<{
    configured: boolean
    automations: PortalAutomationListItem[]
    isAdmin: boolean
  }>
> {
  try {
    const { session, actorId } = await requireStaffSession()
    const configured = isAutomatizacionesConfigured()
    const all = await listPortalAutomationsWithLastRun()
    const isAdmin = session.user.role === 'admin'
    let automations = isAdmin
      ? all
      : filterAutomationsForUser(all, 'advisor', actorId)

    // Orden personal del asesor pisa el global; automatizaciones sin posición
    // personal van al final conservando el orden global.
    if (!isAdmin) {
      const orderMap = await fetchUserAutomationOrderMap(actorId)
      if (orderMap.size) {
        const globalIndex = new Map(
          automations.map((automation, index) => [automation.id, index])
        )
        automations = [...automations].sort((a, b) => {
          const rankA =
            orderMap.get(a.id) ?? 1_000_000 + (globalIndex.get(a.id) ?? 0)
          const rankB =
            orderMap.get(b.id) ?? 1_000_000 + (globalIndex.get(b.id) ?? 0)
          return rankA - rankB
        })
      }
    }

    return {
      ok: true,
      data: {
        configured,
        automations,
        isAdmin,
      },
    }
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

export async function triggerAutomationAction(
  automationId: string,
  inputValues?: Record<string, string>
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
      inputValues ?? {}
    )
    if (!inputsResult.ok) {
      // No se registra run: no hubo intento de webhook.
      return { ok: false, error: 'invalid_input', message: inputsResult.message }
    }

    const result = await triggerAutomationWebhook(
      automation.webhookPath,
      inputsResult.inputs
    )

    const status = result.ok ? 'sent' : 'failed'
    await insertPortalAutomationRun({
      automationId: automation.id,
      triggeredBy: actorId,
      status,
      httpStatus: result.ok ? result.httpStatus : result.httpStatus,
      errorMessage: result.ok ? undefined : result.errorMessage,
    })

    if (!result.ok) {
      return {
        ok: false,
        error: 'unknown',
        message: result.errorMessage,
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
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function listAutomationRunsAction(): Promise<
  AutomatizacionesResult<PortalAutomationRun[]>
> {
  try {
    const { session, actorId } = await requireStaffSession()
    const runs = await listPortalAutomationRuns({
      limit: 30,
      triggeredBy: session.user.role === 'admin' ? undefined : actorId,
    })
    return { ok: true, data: runs }
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

export async function updateAutomationAccessAction(input: {
  automationId: string
  isActive: boolean
  adminOnly: boolean
  advisorVisibility: AdvisorVisibility
  grantedAdvisorIds: string[]
}): Promise<AutomatizacionesResult<{ saved: true }>> {
  try {
    const { session } = await requireStaffSession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const automation = await getPortalAutomationById(input.automationId)
    if (!automation) {
      return { ok: false, error: 'not_found' }
    }

    await updatePortalAutomationAccess({
      automationId: input.automationId,
      isActive: input.isActive,
      adminOnly: input.adminOnly,
      advisorVisibility: input.advisorVisibility,
      grantedAdvisorIds:
        input.advisorVisibility === 'selected' ? input.grantedAdvisorIds : [],
    })

    return { ok: true, data: { saved: true } }
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

export async function listAutomationsForAccessAdminAction(): Promise<
  AutomatizacionesResult<PortalAutomationListItem[]>
> {
  try {
    const { session } = await requireStaffSession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }
    const automations = await listPortalAutomationsWithLastRun()
    return { ok: true, data: automations }
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

export async function updateAutomationAction(
  automationId: string,
  input: CreateAutomationInput
): Promise<AutomatizacionesResult<{ saved: true }>> {
  try {
    const { session } = await requireStaffSession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const automation = await getPortalAutomationById(automationId)
    if (!automation) {
      return { ok: false, error: 'not_found' }
    }

    const validated = validateCreateAutomationInput(input)
    if (!validated.ok) {
      return { ok: false, error: 'invalid_input', message: validated.message }
    }

    const data = validated.data
    try {
      await updatePortalAutomationDefinition({
        automationId,
        slug: data.slug,
        title: data.title,
        description: data.description || null,
        webhookPath: data.webhookPath,
        icon: data.icon,
        isActive: data.isActive,
        adminOnly: data.adminOnly,
        advisorVisibility: data.advisorVisibility,
        inputFields: data.inputFields,
      })
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: string }).code)
          : ''
      if (code === '23505') {
        return {
          ok: false,
          error: 'invalid_input',
          message: 'Ya existe una automatización con ese identificador.',
        }
      }
      throw error
    }

    return { ok: true, data: { saved: true } }
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

export async function deleteAutomationAction(
  automationId: string
): Promise<AutomatizacionesResult<{ deleted: true }>> {
  try {
    const { session } = await requireStaffSession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const automation = await getPortalAutomationById(automationId)
    if (!automation) {
      return { ok: false, error: 'not_found' }
    }

    await deletePortalAutomation(automationId)
    return { ok: true, data: { deleted: true } }
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

export async function createAutomationAction(
  input: CreateAutomationInput
): Promise<AutomatizacionesResult<{ automation: PortalAutomationListItem }>> {
  try {
    const { session } = await requireStaffSession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const validated = validateCreateAutomationInput(input)
    if (!validated.ok) {
      return { ok: false, error: 'unknown', message: validated.message }
    }

    const data = validated.data
    let automation: PortalAutomation
    try {
      const sortOrder = await getNextAutomationSortOrder()
      automation = await insertPortalAutomation({
        slug: data.slug,
        title: data.title,
        description: data.description || null,
        webhookPath: data.webhookPath,
        icon: data.icon,
        sortOrder,
        isActive: data.isActive,
        adminOnly: data.adminOnly,
        advisorVisibility: data.advisorVisibility,
        inputFields: data.inputFields,
      })
    } catch (error) {
      const code =
        error && typeof error === 'object' && 'code' in error
          ? String((error as { code: string }).code)
          : ''
      if (code === '23505') {
        return {
          ok: false,
          error: 'unknown',
          message: 'Ya existe una automatización con ese identificador.',
        }
      }
      throw error
    }

    return {
      ok: true,
      data: {
        automation: {
          ...automation,
          lastRun: null,
        },
      },
    }
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
