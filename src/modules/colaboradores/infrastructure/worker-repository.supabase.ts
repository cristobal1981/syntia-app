import { mapNamePartsToProfileFields } from '@/src/modules/directory/domain/map-directory-row'
import {
  createAuthUserForClient,
  isDuplicateEmailError,
  rollbackCreatedPortalUser,
  upsertProfile,
} from '@/src/modules/directory/infrastructure/directory-repository.supabase'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import {
  getClientIntegrationByUserId,
  upsertClientIntegration,
  deleteClientIntegration,
} from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import {
  deleteWorkerGrant,
  upsertWorkerGrant,
} from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import type { CreateWorkerInput } from '@/src/modules/colaboradores/domain/types'
import { cloneChatterReadStateForUser } from '@/src/modules/portal/infrastructure/chatter-read-state.supabase'
import { cloneWatchStateForUser } from '@/src/modules/portal/infrastructure/portal-record-watch-state.supabase'
import { cloneTramitesListSeenStateForUser } from '@/src/modules/tramites/infrastructure/tramites-list-seen-state.supabase'

export type CreateWorkerResult = {
  workerUserId: string
  inviteSent: boolean
}

export async function createWorkerAccount(
  ownerUserId: string,
  ownerCompanyName: string | undefined,
  input: CreateWorkerInput
): Promise<CreateWorkerResult> {
  const supabase = createSupabaseAdminClient()
  const email = input.email.trim().toLowerCase()

  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingUser) {
    throw new Error('DUPLICATE_EMAIL')
  }

  const ownerIntegration = await getClientIntegrationByUserId(ownerUserId)

  const { authUserId, inviteSent } = await createAuthUserForClient(email)
  let workerUserId: string | undefined

  try {
    const { data: userRow, error: userError } = await supabase
      .from('users')
      .insert({
        auth_user_id: authUserId,
        email,
        role: 'worker',
        status: 'invited',
        is_active: false,
      })
      .select('id')
      .single()

    if (userError || !userRow) {
      if (userError && isDuplicateEmailError(userError.message)) {
        throw new Error('DUPLICATE_EMAIL')
      }
      throw new Error(userError?.message ?? 'No se pudo crear la cuenta.')
    }

    workerUserId = userRow.id
    const newWorkerUserId: string = userRow.id

    const profileFields = mapNamePartsToProfileFields({
      firstName: input.firstName,
      firstSurname: input.firstSurname,
      secondSurname: input.secondSurname,
    })

    await upsertProfile(newWorkerUserId, {
      ...profileFields,
      company_name: ownerCompanyName ?? null,
    })

    await upsertClientIntegration(newWorkerUserId, {
      odoo_partner_id: ownerIntegration?.odoo_partner_id ?? null,
      drive_folder_id: ownerIntegration?.drive_folder_id ?? null,
    })

    await upsertWorkerGrant({
      workerUserId: newWorkerUserId,
      ownerUserId,
      allowedSections: input.allowedSections,
      isEnabled: true,
    })

    /**
     * El colaborador ve los mismos trámites/obligaciones/firmas que el
     * titular — hereda también su baseline de "leído", si no cada alta
     * dispararía el bootstrap de "sin leer" (ver findUnreadChatterCandidatesForRecords)
     * sobre todo el historial de la empresa como si fuera un cliente nuevo.
     */
    await Promise.all([
      cloneChatterReadStateForUser(ownerUserId, newWorkerUserId),
      cloneWatchStateForUser(ownerUserId, newWorkerUserId),
      cloneTramitesListSeenStateForUser(ownerUserId, newWorkerUserId),
    ])

    return { workerUserId: newWorkerUserId, inviteSent }
  } catch (error) {
    if (workerUserId) {
      await deleteWorkerGrant(workerUserId)
      await deleteClientIntegration(workerUserId)
    }
    await rollbackCreatedPortalUser(authUserId, workerUserId)
    throw error
  }
}

export async function deleteWorkerAccount(workerUserId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { data: userRow, error: fetchError } = await supabase
    .from('users')
    .select('id, auth_user_id, role')
    .eq('id', workerUserId)
    .maybeSingle()

  if (fetchError) {
    throw new Error(fetchError.message)
  }

  if (!userRow || userRow.role !== 'worker') {
    throw new Error('NOT_FOUND')
  }

  await deleteWorkerGrant(workerUserId)
  await deleteClientIntegration(workerUserId)

  const { error: deleteError } = await supabase
    .from('users')
    .delete()
    .eq('id', workerUserId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  const authUserId = userRow.auth_user_id as string | null
  if (authUserId) {
    const { error: authError } = await supabase.auth.admin.deleteUser(authUserId)
    if (authError) {
      throw new Error('DELETE_AUTH_FAILED')
    }
  }
}
