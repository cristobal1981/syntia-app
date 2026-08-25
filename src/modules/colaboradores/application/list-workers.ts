import type { PortalUser } from '@/src/modules/auth/domain/types'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import {
  PROFILE_SELECT,
  USER_SELECT,
  buildDisplayName,
  mapStatusToPersonStatus,
  type ProfileRow,
  type UserRow,
} from '@/src/modules/directory/domain/map-directory-row'
import { resolveDirectoryActorId } from '@/src/modules/directory/application/resolve-actor-id'
import { listWorkerGrantsForOwner } from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import type { WorkerRecord } from '@/src/modules/colaboradores/domain/types'

export async function listWorkersForOwner(
  owner: PortalUser
): Promise<WorkerRecord[]> {
  const ownerUserId = await resolveDirectoryActorId(owner)
  const grants = await listWorkerGrantsForOwner(ownerUserId)
  if (!grants.length) return []

  const workerIds = grants.map((grant) => grant.worker_user_id)
  const supabase = createSupabaseAdminClient()

  const [{ data: users, error: usersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from('users').select(USER_SELECT).in('id', workerIds),
      supabase.from('profiles').select(PROFILE_SELECT).in('user_id', workerIds),
    ])

  if (usersError) throw new Error(usersError.message)
  if (profilesError) throw new Error(profilesError.message)

  const userMap = new Map((users as UserRow[]).map((row) => [row.id, row]))
  const profileMap = new Map(
    ((profiles ?? []) as unknown as ProfileRow[]).map((row) => [row.user_id, row])
  )

  return grants
    .map((grant): WorkerRecord | null => {
      const user = userMap.get(grant.worker_user_id)
      if (!user) return null
      const profile = profileMap.get(grant.worker_user_id)

      const name = profile
        ? buildDisplayName(profile.first_name, profile.first_surname, profile.second_surname)
        : user.email ?? 'Sin nombre'

      // El estado del worker aquí es solo "¿ya aceptó la invitación?" — no es
      // un control de acceso (ese vive en `grant.is_enabled`), así que
      // `archived` (que sí es un control de acceso, ver resolve-portal-user.ts)
      // no tiene representación propia en esta lista todavía.
      const personStatus = mapStatusToPersonStatus(user.status)

      return {
        id: user.id,
        name,
        firstName: profile?.first_name ?? name,
        firstSurname: profile?.first_surname ?? '',
        secondSurname: profile?.second_surname || undefined,
        email: user.email ?? '',
        status: personStatus === 'active' ? 'active' : 'invited',
        isEnabled: grant.is_enabled,
        allowedSections: grant.allowed_sections as WorkerRecord['allowedSections'],
      }
    })
    .filter((worker): worker is WorkerRecord => worker !== null)
    .sort((a, b) => a.name.localeCompare(b.name, 'es'))
}
