import { isProfileCompanyKind } from '@/src/modules/directory/domain/client-kind'
import {
  PROFILE_SELECT,
  USER_SELECT,
  buildDisplayName,
  type DirectoryPersonSource,
  type ProfileRow,
  type UserRow,
} from '@/src/modules/directory/domain/map-directory-row'
import type { DirectoryPageParams } from '@/src/modules/directory/domain/types'
import { fetchClientIntegrationMap } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

async function fetchUserMap(ids?: string[]) {
  const supabase = createSupabaseAdminClient()
  let query = supabase.from('users').select(USER_SELECT)

  if (ids?.length) {
    query = query.in('id', ids)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return new Map((data as UserRow[]).map((row) => [row.id, row]))
}

async function fetchProfileMap(ids?: string[]) {
  const supabase = createSupabaseAdminClient()
  let query = supabase.from('profiles').select(PROFILE_SELECT)

  if (ids?.length) {
    query = query.in('user_id', ids)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  return new Map(
    ((data ?? []) as unknown as ProfileRow[]).map((row) => [row.user_id, row])
  )
}

export async function fetchUserIdsByRole(roles: string[]): Promise<string[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.from('users').select('id').in('role', roles)
  if (error) {
    throw new Error(error.message)
  }

  return (data as { id: string }[]).map((row) => row.id)
}

export async function fetchClientIdsForAdvisor(advisorId: string): Promise<string[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('profiles')
    .select('user_id')
    .eq('advisor_id', advisorId)
  if (error) {
    throw new Error(error.message)
  }

  return (data as { user_id: string }[]).map((row) => row.user_id)
}

type DirectorySearchEntry = {
  id: string
  sortName: string
  searchText: string
}

/**
 * Perfil "parcial" (solo los 4 campos de nombre que afectan a
 * `resolveClientDisplayName`/`isProfileCompanyKind`) ensanchado con el resto
 * de columnas de `ProfileRow` en `null` — así se reutiliza la MISMA lógica
 * de resolución de nombre que usa el enriquecimiento completo (orden
 * alfabético y "¿es empresa?" coherentes entre el índice ligero y el
 * registro final), en vez de duplicarla.
 */
function toSortableProfile(row: {
  first_name: string
  first_surname: string
  second_surname: string
  company_name: string | null
}): ProfileRow {
  return {
    user_id: '',
    ...row,
    phone: null,
    advisor_id: null,
    vat: null,
    iban: null,
    address_line1: null,
    address_line2: null,
    postal_code: null,
    city: null,
    province: null,
    country: null,
  }
}

const LIGHT_PROFILE_SELECT = 'user_id, first_name, first_surname, second_surname, company_name'

/**
 * Proyección barata (pocas columnas de texto) para decidir QUÉ página
 * mostrar sin enriquecer (`buildDirectorySources`, 3 tablas con todas sus
 * columnas) el dataset completo del scope — solo la página final pasa por
 * el enriquecimiento completo. Sustituye a "traer todo y filtrar en
 * memoria" por "traer poco y filtrar en memoria, enriquecer solo la
 * página".
 */
export async function fetchDirectorySearchIndex(ids: string[]): Promise<DirectorySearchEntry[]> {
  const supabase = createSupabaseAdminClient()
  const [{ data: users, error: usersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from('users').select('id, email').in('id', ids),
      supabase.from('profiles').select(LIGHT_PROFILE_SELECT).in('user_id', ids),
    ])

  if (usersError) throw new Error(usersError.message)
  if (profilesError) throw new Error(profilesError.message)

  type LightProfileRow = {
    user_id: string
    first_name: string
    first_surname: string
    second_surname: string
    company_name: string | null
  }
  const profileMap = new Map(
    ((profiles ?? []) as LightProfileRow[]).map((row) => [row.user_id, row])
  )

  return ((users ?? []) as { id: string; email: string | null }[]).map((user) => {
    const profile = profileMap.get(user.id)
    const sortName = profile
      ? resolveDirectorySortName(toSortableProfile(profile))
      : user.email ?? 'Sin nombre'
    const searchText = [sortName, user.email, profile?.company_name]
      .filter(Boolean)
      .join(' ')
      .toLowerCase()
    return { id: user.id, sortName, searchText }
  })
}

function resolveDirectorySortName(profile: ProfileRow): string {
  if (isProfileCompanyKind(profile)) {
    return profile.company_name?.trim() || 'Sin nombre'
  }
  return buildDisplayName(profile.first_name, profile.first_surname, profile.second_surname)
}

export function paginateSearchIndex(
  index: DirectorySearchEntry[],
  { page, pageSize, search }: DirectoryPageParams
): { pageIds: string[]; totalCount: number } {
  const normalized = search?.trim().toLowerCase()
  const matched = normalized
    ? index.filter((entry) => entry.searchText.includes(normalized))
    : index
  matched.sort((a, b) => a.sortName.localeCompare(b.sortName, 'es'))

  const start = Math.max(0, (page - 1) * pageSize)
  return {
    pageIds: matched.slice(start, start + pageSize).map((entry) => entry.id),
    totalCount: matched.length,
  }
}

export async function buildDirectorySources(ids?: string[]) {
  const [userMap, profileMap, integrationMap] = await Promise.all([
    fetchUserMap(ids),
    fetchProfileMap(ids),
    fetchClientIntegrationMap(ids),
  ])

  const allIds = ids?.length ? ids : [...userMap.keys()]

  return allIds
    .map((id): DirectoryPersonSource | null => {
      const user = userMap.get(id)
      if (!user) return null

      const profile = profileMap.get(id)
      const integration = integrationMap.get(id)

      return {
        user,
        ...(profile ? { profile } : {}),
        ...(integration ? { integration } : {}),
      }
    })
    .filter((entry): entry is DirectoryPersonSource => entry !== null)
}

export async function buildAdvisorNameMap(
  sources: DirectoryPersonSource[]
): Promise<Map<string, string>> {
  const advisorIds = [
    ...new Set(
      sources
        .map((source) => source.profile?.advisor_id)
        .filter((id): id is string => Boolean(id))
    ),
  ]

  if (!advisorIds.length) {
    return new Map()
  }

  const advisorSources = await buildDirectorySources(advisorIds)
  return new Map(
    advisorSources.map((source) => [
      source.user.id,
      resolveAdvisorDisplayName(source),
    ])
  )
}

export function resolveAdvisorDisplayName(source: DirectoryPersonSource): string {
  if (source.profile) {
    return buildDisplayName(
      source.profile.first_name,
      source.profile.first_surname,
      source.profile.second_surname
    )
  }
  return source.user.email ?? ''
}
