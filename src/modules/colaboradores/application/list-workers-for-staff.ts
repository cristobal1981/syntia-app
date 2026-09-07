import { buildDirectoryScope } from '@/src/modules/directory/application/directory-queries'
import { getDirectoryRepository } from '@/src/modules/directory/infrastructure/get-directory-repository'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import {
  PROFILE_SELECT,
  USER_SELECT,
  buildDisplayName,
  mapStatusToPersonStatus,
  resolveClientDisplayName,
  type ProfileRow,
  type UserRow,
} from '@/src/modules/directory/domain/map-directory-row'
import {
  listAllWorkerGrants,
  listWorkerGrantsForOwners,
  type WorkerGrantRow,
} from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import type { AdminWorkerRecord } from '@/src/modules/colaboradores/domain/types'

/**
 * Colaboradores para la vista de supervisión de "equipo": un admin ve los de
 * todos los titulares, un asesor solo los de los clientes de su propia
 * cartera (reutiliza `listClients(scope)`, que ya aplica ese mismo filtro
 * para la lista de clientes — sin llamadas nuevas a Odoo, ver
 * [[feedback_odoo_request_cost]]).
 */
export async function listWorkersForStaff(): Promise<AdminWorkerRecord[]> {
  const scope = await buildDirectoryScope()
  if (scope.role !== 'admin' && scope.role !== 'advisor') {
    throw new Error('forbidden')
  }

  const grants: WorkerGrantRow[] =
    scope.role === 'admin'
      ? await listAllWorkerGrants()
      : await listWorkerGrantsForOwners(
          (await getDirectoryRepository().listClients(scope)).map(
            (client) => client.id
          )
        )
  if (!grants.length) return []

  const allIds = Array.from(
    new Set(grants.flatMap((grant) => [grant.worker_user_id, grant.owner_user_id]))
  )
  const supabase = createSupabaseAdminClient()

  const [{ data: users, error: usersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from('users').select(USER_SELECT).in('id', allIds),
      supabase.from('profiles').select(PROFILE_SELECT).in('user_id', allIds),
    ])

  if (usersError) throw new Error(usersError.message)
  if (profilesError) throw new Error(profilesError.message)

  const userMap = new Map((users as UserRow[]).map((row) => [row.id, row]))
  const profileMap = new Map(
    ((profiles ?? []) as unknown as ProfileRow[]).map((row) => [row.user_id, row])
  )

  return grants
    .map((grant): AdminWorkerRecord | null => {
      const workerUser = userMap.get(grant.worker_user_id)
      const ownerUser = userMap.get(grant.owner_user_id)
      if (!workerUser || !ownerUser) return null

      const workerProfile = profileMap.get(grant.worker_user_id)
      const ownerProfile = profileMap.get(grant.owner_user_id)

      const name = workerProfile
        ? buildDisplayName(
            workerProfile.first_name,
            workerProfile.first_surname,
            workerProfile.second_surname
          )
        : (workerUser.email ?? 'Sin nombre')

      const ownerName = ownerProfile
        ? resolveClientDisplayName(ownerProfile)
        : (ownerUser.email ?? 'Sin nombre')

      const personStatus = mapStatusToPersonStatus(workerUser.status)

      return {
        id: workerUser.id,
        name,
        firstName: workerProfile?.first_name ?? name,
        firstSurname: workerProfile?.first_surname ?? '',
        secondSurname: workerProfile?.second_surname || undefined,
        email: workerUser.email ?? '',
        status: personStatus === 'active' ? 'active' : 'invited',
        isEnabled: grant.is_enabled,
        allowedSections: grant.allowed_sections,
        ownerId: ownerUser.id,
        ownerName,
        ownerEmail: ownerUser.email ?? '',
      }
    })
    .filter((worker): worker is AdminWorkerRecord => worker !== null)
    .sort(
      (a, b) =>
        a.ownerName.localeCompare(b.ownerName, 'es') ||
        a.name.localeCompare(b.name, 'es')
    )
}
