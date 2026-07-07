'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import type {
  ImpuestoSociedadesConfig,
  ImpuestoSociedadesConfigInput,
} from '@/src/modules/automatizaciones/domain/impuesto-sociedades-config'
import { validateImpuestoSociedadesConfigInput } from '@/src/modules/automatizaciones/domain/impuesto-sociedades-config'
import {
  deleteImpuestoSociedadesConfig,
  insertImpuestoSociedadesConfig,
  listImpuestoSociedadesConfigs,
  updateImpuestoSociedadesConfig,
} from '@/src/modules/automatizaciones/infrastructure/impuesto-sociedades-config-repository.supabase'
import { isSupabaseServiceRoleConfigured } from '@/src/modules/directory/infrastructure/supabase-admin'

type ActionResult<T> =
  | { ok: true; data: T }
  | { ok: false; message: string }

function forbidden<T>(): ActionResult<T> {
  return { ok: false, message: 'No tienes permiso para esta acción.' }
}

async function getAdminSession() {
  const session = await getSession()
  if (!session || session.user.role !== 'admin') {
    return null
  }
  return session
}

function mapDbError(error: unknown): string {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    error.code === '23505'
  ) {
    return 'Ya existe una configuración para ese ejercicio y tipo de empresa.'
  }
  return 'No pudimos guardar los cambios. Inténtalo de nuevo.'
}

export async function listImpuestoSociedadesConfigsAction(): Promise<
  ActionResult<{ configured: boolean; configs: ImpuestoSociedadesConfig[] }>
> {
  const session = await getAdminSession()
  if (!session) return forbidden()

  if (!isSupabaseServiceRoleConfigured()) {
    return {
      ok: true,
      data: { configured: false, configs: [] },
    }
  }

  try {
    const configs = await listImpuestoSociedadesConfigs()
    return { ok: true, data: { configured: true, configs } }
  } catch {
    return { ok: false, message: 'No pudimos cargar la configuración.' }
  }
}

export async function createImpuestoSociedadesConfigAction(
  input: ImpuestoSociedadesConfigInput
): Promise<ActionResult<ImpuestoSociedadesConfig>> {
  const session = await getAdminSession()
  if (!session) return forbidden()

  if (!isSupabaseServiceRoleConfigured()) {
    return { ok: false, message: 'Supabase no está configurado.' }
  }

  const validated = validateImpuestoSociedadesConfigInput(input)
  if (!validated.ok) {
    return { ok: false, message: validated.message }
  }

  try {
    const config = await insertImpuestoSociedadesConfig(validated.data)
    return { ok: true, data: config }
  } catch (error) {
    return { ok: false, message: mapDbError(error) }
  }
}

export async function updateImpuestoSociedadesConfigAction(
  id: string,
  input: ImpuestoSociedadesConfigInput
): Promise<ActionResult<ImpuestoSociedadesConfig>> {
  const session = await getAdminSession()
  if (!session) return forbidden()

  if (!isSupabaseServiceRoleConfigured()) {
    return { ok: false, message: 'Supabase no está configurado.' }
  }

  const validated = validateImpuestoSociedadesConfigInput(input)
  if (!validated.ok) {
    return { ok: false, message: validated.message }
  }

  try {
    const config = await updateImpuestoSociedadesConfig(id, validated.data)
    return { ok: true, data: config }
  } catch (error) {
    return { ok: false, message: mapDbError(error) }
  }
}

export async function deleteImpuestoSociedadesConfigAction(
  id: string
): Promise<ActionResult<true>> {
  const session = await getAdminSession()
  if (!session) return forbidden()

  if (!isSupabaseServiceRoleConfigured()) {
    return { ok: false, message: 'Supabase no está configurado.' }
  }

  try {
    await deleteImpuestoSociedadesConfig(id)
    return { ok: true, data: true }
  } catch {
    return { ok: false, message: 'No pudimos eliminar el registro.' }
  }
}
