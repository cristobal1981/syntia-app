'use server'

import type {
  AdvisorVisibility,
  AutomationInputField,
  PortalAutomation,
  PortalAutomationListItem,
} from '@/src/modules/automatizaciones/domain/types'
import { validateAutomationInputFieldsDefinition } from '@/src/modules/automatizaciones/domain/types'
import { isAutomationIconId } from '@/src/modules/automatizaciones/domain/automation-icons'
import {
  type AutomatizacionesResult,
  requireStaffSession,
} from '@/src/modules/automatizaciones/application/automatizaciones-actions-shared'
import {
  deletePortalAutomation,
  getNextAutomationSortOrder,
  getPortalAutomationById,
  insertPortalAutomation,
  updatePortalAutomationAccess,
  updatePortalAutomationDefinition,
} from '@/src/modules/automatizaciones/infrastructure/automation-repository.supabase'

export type CreateAutomationInput = {
  slug: string
  title: string
  description: string
  webhookPath: string
  icon: string
  isActive: boolean
  visibility: AdvisorVisibility
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
      visibility: input.visibility,
      inputFields: fieldsResult.fields,
    },
  }
}

export async function updateAutomationAccessAction(input: {
  automationId: string
  isActive: boolean
  visibility: AdvisorVisibility
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
      visibility: input.visibility,
      grantedAdvisorIds:
        input.visibility === 'selected' ? input.grantedAdvisorIds : [],
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
        visibility: data.visibility,
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
        visibility: data.visibility,
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
