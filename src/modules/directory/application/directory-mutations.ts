'use server'

import { updateTag } from 'next/cache'

import { getSession } from '@/src/modules/auth/application/get-session'
import {
  buildDirectoryScope,
  requireDirectorySession,
} from '@/src/modules/directory/application/directory-queries'
import {
  validateClientForm,
  validatePersonEmail,
  validatePersonNameParts,
} from '@/src/modules/directory/application/validate-directory'
import { parseClientKind } from '@/src/modules/directory/domain/client-kind'
import type {
  CreateClientInput,
  PersonStatus,
  UpdateClientInput,
  UpdateGestorInput,
} from '@/src/modules/directory/domain/types'
import { getDirectoryRepository } from '@/src/modules/directory/infrastructure/get-directory-repository'
import { mapDirectoryEmailError } from '@/src/modules/directory/application/map-directory-email-error'
import { listOdooPartnersForImport } from '@/src/modules/directory/application/list-odoo-partners-for-import'
import { listOdooGestoresForImport } from '@/src/modules/directory/application/list-odoo-gestores-for-import'
import type { OdooPartnerImportOption } from '@/src/modules/directory/domain/odoo-partner-import'
import type { OdooUserImportOption } from '@/src/modules/directory/domain/odoo-user-import'
import { ODOO_PARTNER_CATALOG_CACHE_TAG } from '@/src/modules/directory/infrastructure/odoo-partner-env'
import { ODOO_GESTOR_CATALOG_CACHE_TAG } from '@/src/modules/directory/infrastructure/odoo-gestor-catalog'

export type DirectoryUpdateResult =
  | { ok: true; inviteSent?: boolean }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'validation' | 'unknown'
      fieldErrors?: Record<string, string>
      message?: string
    }

export type DirectoryDeleteResult =
  | { ok: true }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'unknown'
      message?: string
    }

export type ResendAccessResult =
  | { ok: true }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'unknown'
      message?: string
    }

export type ListOdooPartnersForImportActionResult =
  | { ok: true; partners: OdooPartnerImportOption[] }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'odoo_unavailable' | 'odoo_request_failed'
    }

export type ListOdooGestoresForImportActionResult =
  | { ok: true; users: OdooUserImportOption[] }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'odoo_unavailable' | 'odoo_request_failed'
    }

function parseGestorForm(formData: FormData): UpdateGestorInput {
  return {
    id: String(formData.get('id') ?? ''),
    firstName: String(formData.get('firstName') ?? '').trim(),
    firstSurname: String(formData.get('firstSurname') ?? '').trim(),
    secondSurname:
      String(formData.get('secondSurname') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim(),
    role: String(formData.get('role') ?? 'advisor') as 'advisor' | 'admin',
    companyName: String(formData.get('companyName') ?? '').trim() || undefined,
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    status: String(formData.get('status') ?? 'active') as PersonStatus,
    odooUserId: String(formData.get('odooUserId') ?? '').trim() || undefined,
  }
}

function parseCreateGestorForm(formData: FormData) {
  return {
    firstName: String(formData.get('firstName') ?? '').trim(),
    firstSurname: String(formData.get('firstSurname') ?? '').trim(),
    secondSurname:
      String(formData.get('secondSurname') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    companyName: String(formData.get('companyName') ?? '').trim() || undefined,
    role: String(formData.get('role') ?? 'advisor') as 'advisor' | 'admin',
    odooUserId: String(formData.get('odooUserId') ?? '').trim() || undefined,
  }
}

function parseCreateClientForm(formData: FormData) {
  return {
    clientKind: parseClientKind(String(formData.get('clientKind') ?? '')),
    firstName: String(formData.get('firstName') ?? '').trim(),
    firstSurname: String(formData.get('firstSurname') ?? '').trim(),
    secondSurname:
      String(formData.get('secondSurname') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    companyName: String(formData.get('companyName') ?? '').trim() || undefined,
    odooPartnerId:
      String(formData.get('odooPartnerId') ?? '').trim() || undefined,
    driveFolderId:
      String(formData.get('driveFolderId') ?? '').trim() || undefined,
    advisorId: String(formData.get('advisorId') ?? '').trim() || undefined,
  }
}

function parseClientForm(formData: FormData): UpdateClientInput {
  return {
    id: String(formData.get('id') ?? ''),
    clientKind: parseClientKind(String(formData.get('clientKind') ?? '')),
    firstName: String(formData.get('firstName') ?? '').trim(),
    firstSurname: String(formData.get('firstSurname') ?? '').trim(),
    secondSurname:
      String(formData.get('secondSurname') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    companyName: String(formData.get('companyName') ?? '').trim() || undefined,
    odooPartnerId:
      String(formData.get('odooPartnerId') ?? '').trim() || undefined,
    driveFolderId:
      String(formData.get('driveFolderId') ?? '').trim() || undefined,
    advisorId: String(formData.get('advisorId') ?? '').trim() || undefined,
    status: String(formData.get('status') ?? 'active') as PersonStatus,
  }
}

export async function createGestorAction(
  _prev: DirectoryUpdateResult | null,
  formData: FormData
): Promise<DirectoryUpdateResult> {
  try {
    const session = await requireDirectorySession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const input = parseCreateGestorForm(formData)
    const fieldErrors = validatePersonNameParts(input)
    const emailError = validatePersonEmail(input.email)
    if (emailError) fieldErrors.email = emailError
    if (Object.keys(fieldErrors).length) {
      return { ok: false, error: 'validation', fieldErrors }
    }

    const result = await getDirectoryRepository().createGestor(input)
    updateTag(ODOO_GESTOR_CATALOG_CACHE_TAG)
    return { ok: true, inviteSent: result.inviteSent }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'DUPLICATE_EMAIL') {
      return {
        ok: false,
        error: 'validation',
        fieldErrors: { email: 'Ya existe un usuario con ese correo.' },
      }
    }
    const emailError = mapDirectoryEmailError(error)
    if (!emailError.ok) {
      return {
        ok: false,
        error: emailError.error === 'not_found' ? 'unknown' : emailError.error,
        message: emailError.message,
      }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

/**
 * Núcleo de la creación de un cliente, sin sesión de asesor — lo usa tanto la
 * action de la UI (`createClientAction`) como el webhook público de Odoo
 * (`app/api/odoo/clientes/route.ts`) para dar de alta el acceso al portal
 * (y disparar el email de invitación/restablecimiento de contraseña) desde
 * fuera de la aplicación.
 */
export async function createClientCore(
  input: CreateClientInput
): Promise<DirectoryUpdateResult> {
  try {
    const fieldErrors = validateClientForm(input)
    if (Object.keys(fieldErrors).length) {
      return { ok: false, error: 'validation', fieldErrors }
    }

    const result = await getDirectoryRepository().createClient(input)
    updateTag(ODOO_PARTNER_CATALOG_CACHE_TAG)
    return { ok: true, inviteSent: result.inviteSent }
  } catch (error) {
    if (error instanceof Error && error.message === 'DUPLICATE_EMAIL') {
      return {
        ok: false,
        error: 'validation',
        fieldErrors: { email: 'Ya existe un usuario con ese correo.' },
      }
    }
    const emailError = mapDirectoryEmailError(error)
    if (!emailError.ok) {
      return {
        ok: false,
        error: emailError.error === 'not_found' ? 'unknown' : emailError.error,
        message: emailError.message,
      }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function createClientAction(
  _prev: DirectoryUpdateResult | null,
  formData: FormData
): Promise<DirectoryUpdateResult> {
  try {
    const session = await requireDirectorySession()
    const scope = await buildDirectoryScope()
    if (scope.role === 'client') {
      return { ok: false, error: 'forbidden' }
    }

    const input = parseCreateClientForm(formData)

    if (scope.role === 'advisor') {
      input.advisorId = scope.userId
    }

    return await createClientCore(input)
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function updateGestorAction(
  _prev: DirectoryUpdateResult | null,
  formData: FormData
): Promise<DirectoryUpdateResult> {
  try {
    const session = await requireDirectorySession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const input = parseGestorForm(formData)
    const fieldErrors = validatePersonNameParts(input)
    const emailError = validatePersonEmail(input.email)
    if (emailError) fieldErrors.email = emailError
    if (Object.keys(fieldErrors).length) {
      return { ok: false, error: 'validation', fieldErrors }
    }

    await getDirectoryRepository().updateGestor(input)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function updateClientAction(
  _prev: DirectoryUpdateResult | null,
  formData: FormData
): Promise<DirectoryUpdateResult> {
  try {
    const session = await requireDirectorySession()
    const scope = await buildDirectoryScope()
    if (scope.role === 'client') {
      return { ok: false, error: 'forbidden' }
    }

    const input = parseClientForm(formData)
    const repository = getDirectoryRepository()
    const existing = await repository.getClient(input.id)

    if (!existing) {
      return { ok: false, error: 'unknown', message: 'Cliente no encontrado.' }
    }

    if (scope.role === 'advisor') {
      if (existing.advisorId !== scope.userId) {
        return { ok: false, error: 'forbidden' }
      }
      input.advisorId = existing.advisorId
    }

    const fieldErrors = validateClientForm(input)
    if (Object.keys(fieldErrors).length) {
      return { ok: false, error: 'validation', fieldErrors }
    }

    await repository.updateClient(input)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function deleteGestorAction(
  gestorId: string
): Promise<DirectoryDeleteResult> {
  try {
    const session = await requireDirectorySession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const scope = await buildDirectoryScope()
    if (scope.userId === gestorId) {
      return {
        ok: false,
        error: 'forbidden',
        message: 'No puedes eliminar tu propia cuenta.',
      }
    }

    const repository = getDirectoryRepository()
    const existing = await repository.getGestor(gestorId)

    if (!existing) {
      return { ok: false, error: 'not_found' }
    }

    await repository.deleteGestor(gestorId)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return { ok: false, error: 'not_found' }
    }
    if (error instanceof Error && error.message === 'DELETE_AUTH_FAILED') {
      return {
        ok: false,
        error: 'unknown',
        message:
          'Se eliminó el asesor del portal, pero no pudimos borrar su cuenta de acceso. Contacta con soporte.',
      }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function deleteClientAction(
  clientId: string
): Promise<DirectoryDeleteResult> {
  try {
    await requireDirectorySession()
    const scope = await buildDirectoryScope()
    if (scope.role === 'client') {
      return { ok: false, error: 'forbidden' }
    }

    const repository = getDirectoryRepository()
    const existing = await repository.getClient(clientId)

    if (!existing) {
      return { ok: false, error: 'not_found' }
    }

    if (scope.role === 'advisor' && existing.advisorId !== scope.userId) {
      return { ok: false, error: 'forbidden' }
    }

    await repository.deleteClient(clientId)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'NOT_FOUND') {
      return { ok: false, error: 'not_found' }
    }
    if (error instanceof Error && error.message === 'DELETE_AUTH_FAILED') {
      return {
        ok: false,
        error: 'unknown',
        message:
          'Se eliminó el cliente del portal, pero no pudimos borrar su cuenta de acceso. Contacta con soporte.',
      }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function resendClientAccessEmailAction(
  clientId: string
): Promise<ResendAccessResult> {
  try {
    await requireDirectorySession()
    const scope = await buildDirectoryScope()
    if (scope.role === 'client') {
      return { ok: false, error: 'forbidden' }
    }

    const repository = getDirectoryRepository()
    const existing = await repository.getClient(clientId)

    if (!existing) {
      return { ok: false, error: 'not_found' }
    }

    if (scope.role === 'advisor' && existing.advisorId !== scope.userId) {
      return { ok: false, error: 'forbidden' }
    }

    await repository.resendClientAccessEmail(clientId)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    return mapDirectoryEmailError(error)
  }
}

export async function resendGestorAccessEmailAction(
  gestorId: string
): Promise<ResendAccessResult> {
  try {
    const session = await requireDirectorySession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const scope = await buildDirectoryScope()
    if (scope.userId === gestorId) {
      return {
        ok: false,
        error: 'forbidden',
        message: 'No puedes restablecer tu propia contraseña desde aquí. Usa «olvidé mi contraseña».',
      }
    }

    const repository = getDirectoryRepository()
    const existing = await repository.getGestor(gestorId)

    if (!existing) {
      return { ok: false, error: 'not_found' }
    }

    await repository.resendGestorAccessEmail(gestorId)
    return { ok: true }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    return mapDirectoryEmailError(error)
  }
}

export async function listOdooPartnersForImportAction(options?: {
  includeLinked?: boolean
}): Promise<ListOdooPartnersForImportActionResult> {
  try {
    const session = await requireDirectorySession()
    if (session.user.role === 'client') {
      return { ok: false, error: 'forbidden' }
    }

    const result = await listOdooPartnersForImport(options)
    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    return { ok: true, partners: result.partners }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    throw error
  }
}

export async function listOdooGestoresForImportAction(): Promise<ListOdooGestoresForImportActionResult> {
  try {
    const session = await requireDirectorySession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }

    const result = await listOdooGestoresForImport()
    if (!result.ok) {
      return { ok: false, error: result.error }
    }

    return { ok: true, users: result.users }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    throw error
  }
}

export async function canEditClient(clientId: string): Promise<boolean> {
  const session = await getSession()
  if (!session || session.user.role === 'client') return false
  if (session.user.role === 'admin') return true

  const scope = await buildDirectoryScope()
  const client = await getDirectoryRepository().getClient(clientId)
  return client?.advisorId === scope.userId
}
