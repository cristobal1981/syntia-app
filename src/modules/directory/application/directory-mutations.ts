'use server'

import { getSession } from '@/src/modules/auth/application/get-session'
import {
  buildDirectoryScope,
  requireDirectorySession,
} from '@/src/modules/directory/application/directory-queries'
import {
  validateOdooPartnerId,
  validatePersonEmail,
  validatePersonNameParts,
} from '@/src/modules/directory/application/validate-directory'
import type {
  PersonStatus,
  UpdateClientInput,
  UpdateGestorInput,
} from '@/src/modules/directory/domain/types'
import { getDirectoryRepository } from '@/src/modules/directory/infrastructure/get-directory-repository'
import { mapDirectoryEmailError } from '@/src/modules/directory/application/map-directory-email-error'

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

export type ResendClientAccessResult =
  | { ok: true }
  | {
      ok: false
      error: 'unauthorized' | 'forbidden' | 'not_found' | 'unknown'
      message?: string
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
  }
}

function parseCreateClientForm(formData: FormData) {
  return {
    firstName: String(formData.get('firstName') ?? '').trim(),
    firstSurname: String(formData.get('firstSurname') ?? '').trim(),
    secondSurname:
      String(formData.get('secondSurname') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    companyName: String(formData.get('companyName') ?? '').trim() || undefined,
    odooPartnerId:
      String(formData.get('odooPartnerId') ?? '').trim() || undefined,
    advisorId: String(formData.get('advisorId') ?? '').trim() || undefined,
  }
}

function parseClientForm(formData: FormData): UpdateClientInput {
  return {
    id: String(formData.get('id') ?? ''),
    firstName: String(formData.get('firstName') ?? '').trim(),
    firstSurname: String(formData.get('firstSurname') ?? '').trim(),
    secondSurname:
      String(formData.get('secondSurname') ?? '').trim() || undefined,
    email: String(formData.get('email') ?? '').trim(),
    phone: String(formData.get('phone') ?? '').trim() || undefined,
    companyName: String(formData.get('companyName') ?? '').trim() || undefined,
    odooPartnerId:
      String(formData.get('odooPartnerId') ?? '').trim() || undefined,
    advisorId: String(formData.get('advisorId') ?? '').trim() || undefined,
    status: String(formData.get('status') ?? 'active') as PersonStatus,
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

    const fieldErrors = validatePersonNameParts(input)
    const emailError = validatePersonEmail(input.email)
    const odooError = validateOdooPartnerId(input.odooPartnerId ?? '')
    if (emailError) fieldErrors.email = emailError
    if (odooError) fieldErrors.odooPartnerId = odooError
    if (Object.keys(fieldErrors).length) {
      return { ok: false, error: 'validation', fieldErrors }
    }

    const result = await getDirectoryRepository().createClient(input)
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

    const fieldErrors = validatePersonNameParts(input)
    const emailError = validatePersonEmail(input.email)
    const odooError = validateOdooPartnerId(input.odooPartnerId ?? '')
    if (emailError) fieldErrors.email = emailError
    if (odooError) fieldErrors.odooPartnerId = odooError
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
): Promise<ResendClientAccessResult> {
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

export async function canEditClient(clientId: string): Promise<boolean> {
  const session = await getSession()
  if (!session || session.user.role === 'client') return false
  if (session.user.role === 'admin') return true

  const scope = await buildDirectoryScope()
  const client = await getDirectoryRepository().getClient(clientId)
  return client?.advisorId === scope.userId
}
