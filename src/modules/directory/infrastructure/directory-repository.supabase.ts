import { mapClientProfileFields } from '@/src/modules/directory/domain/client-kind'
import {
  PROFILE_SELECT,
  USER_SELECT,
  buildDisplayName,
  isClientDbRole,
  isGestorDbRole,
  mapDirectorySourceToClient,
  mapDirectorySourceToGestor,
  mapNamePartsToProfileFields,
  mapPersonStatusToDb,
  parseOdooPartnerId,
  type DirectoryPersonSource,
  type ProfileRow,
  type UserRow,
} from '@/src/modules/directory/domain/map-directory-row'
import type {
  ClientRecord,
  DirectoryListScope,
  GestorRecord,
  UpdateClientInput,
  UpdateGestorInput,
} from '@/src/modules/directory/domain/types'
import type { DirectoryRepository } from '@/src/modules/directory/infrastructure/directory-repository'
import {
  deliverClientAccessEmail,
  getPortalAccessRedirectUrl,
  sendClientAccessEmailForClient,
} from '@/src/modules/directory/infrastructure/client-access-link'
import {
  deleteClientIntegration,
  fetchClientIntegrationMap,
  upsertClientIntegration,
} from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import {
  shouldSkipClientInviteEmail,
  shouldUseResendClientInvite,
} from '@/src/modules/directory/infrastructure/directory-env'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import { isResendConfigured } from '@/src/modules/email/infrastructure/resend-env'

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

async function buildDirectorySources(ids?: string[]) {
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

async function buildAdvisorNameMap(
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

function resolveAdvisorDisplayName(source: DirectoryPersonSource): string {
  if (source.profile) {
    return buildDisplayName(
      source.profile.first_name,
      source.profile.first_surname,
      source.profile.second_surname
    )
  }
  return source.user.email ?? ''
}

async function upsertProfile(userId: string, fields: Partial<ProfileRow>) {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('profiles').upsert(
    {
      user_id: userId,
      ...fields,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  )

  if (error) {
    throw new Error(error.message)
  }
}

async function rollbackCreatedPortalUser(
  authUserId: string,
  portalUserId?: string
) {
  const supabase = createSupabaseAdminClient()

  if (portalUserId) {
    await deleteClientIntegration(portalUserId)
    await supabase.from('users').delete().eq('id', portalUserId)
  }

  await supabase.auth.admin.deleteUser(authUserId)
}

function isDuplicateEmailError(message: string): boolean {
  const normalized = message.toLowerCase()
  return (
    normalized.includes('already registered') ||
    normalized.includes('already exists') ||
    normalized.includes('duplicate') ||
    normalized.includes('unique')
  )
}

function isEmailRateLimitError(message: string): boolean {
  return message.toLowerCase().includes('rate limit')
}

type AuthUserCreation = {
  authUserId: string
  inviteSent: boolean
}

async function createAuthUserWithoutInvite(
  email: string
): Promise<AuthUserCreation> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true,
  })

  if (error || !data.user) {
    if (error && isDuplicateEmailError(error.message)) {
      throw new Error('DUPLICATE_EMAIL')
    }
    throw new Error(error?.message ?? 'No se pudo crear el usuario de auth.')
  }

  return { authUserId: data.user.id, inviteSent: false }
}

async function createAuthUserWithResendInvite(
  email: string
): Promise<AuthUserCreation> {
  const supabase = createSupabaseAdminClient()

  const { data, error } = await supabase.auth.admin.generateLink({
    type: 'invite',
    email,
    options: { redirectTo: getPortalAccessRedirectUrl() },
  })

  if (error || !data.user) {
    if (error && isDuplicateEmailError(error.message)) {
      throw new Error('DUPLICATE_EMAIL')
    }
    throw new Error(error?.message ?? 'No se pudo generar la invitación.')
  }

  await deliverClientAccessEmail(email, 'invite')

  return { authUserId: data.user.id, inviteSent: true }
}

async function createAuthUserForClient(email: string): Promise<AuthUserCreation> {
  if (shouldSkipClientInviteEmail()) {
    return createAuthUserWithoutInvite(email)
  }

  if (shouldUseResendClientInvite()) {
    if (!isResendConfigured()) {
      throw new Error('RESEND_NOT_CONFIGURED')
    }
    return createAuthUserWithResendInvite(email)
  }

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase.auth.admin.inviteUserByEmail(email, {
    redirectTo: getPortalAccessRedirectUrl(),
  })

  if (!error && data.user) {
    return { authUserId: data.user.id, inviteSent: true }
  }

  if (error?.message && isEmailRateLimitError(error.message)) {
    if (process.env.NODE_ENV === 'development') {
      return createAuthUserWithoutInvite(email)
    }
    throw new Error('EMAIL_RATE_LIMIT')
  }

  if (error && isDuplicateEmailError(error.message)) {
    throw new Error('DUPLICATE_EMAIL')
  }

  throw new Error(error?.message ?? 'No se pudo invitar al usuario.')
}

export const supabaseDirectoryRepository: DirectoryRepository = {
  async listGestores() {
    const sources = await buildDirectorySources()
    const gestores: GestorRecord[] = []

    for (const source of sources) {
      const mapped = mapDirectorySourceToGestor(source)
      if (mapped) gestores.push(mapped)
    }

    return gestores.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },

  async listClients(scope) {
    const sources = await buildDirectorySources()
    const advisorNames = await buildAdvisorNameMap(sources)
    const clients: ClientRecord[] = []

    for (const source of sources) {
      if (!isClientDbRole(source.user.role)) {
        continue
      }

      if (scope.role === 'advisor') {
        const advisorId = source.profile?.advisor_id
        if (!advisorId || advisorId !== scope.userId) {
          continue
        }
      }

      const advisorName = source.profile?.advisor_id
        ? advisorNames.get(source.profile.advisor_id)
        : undefined
      const mapped = mapDirectorySourceToClient(source, advisorName)
      if (mapped) clients.push(mapped)
    }

    return clients.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },

  async getGestor(id) {
    const sources = await buildDirectorySources([id])
    const source = sources[0]
    if (!source) return null
    return mapDirectorySourceToGestor(source)
  },

  async getClient(id) {
    const sources = await buildDirectorySources([id])
    const source = sources[0]
    if (!source) return null

    let advisorName: string | undefined
    if (source.profile?.advisor_id) {
      const advisorSources = await buildDirectorySources([
        source.profile.advisor_id,
      ])
      advisorName = advisorSources[0]
        ? resolveAdvisorDisplayName(advisorSources[0])
        : undefined
    }

    return mapDirectorySourceToClient(source, advisorName)
  },

  async createGestor(input) {
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

    const { authUserId, inviteSent } = await createAuthUserForClient(email)
    let portalUserId: string | undefined

    try {
      const profileFields = mapNamePartsToProfileFields({
        firstName: input.firstName,
        firstSurname: input.firstSurname,
        secondSurname: input.secondSurname,
      })

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email,
          role: input.role,
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

      portalUserId = userRow.id
      const newUserId = userRow.id

      await upsertProfile(newUserId, {
        ...profileFields,
        phone: input.phone ?? null,
        company_name: input.companyName ?? null,
      })

      const created = await this.getGestor(newUserId)
      if (!created) {
        throw new Error('Gestor no encontrado tras crear')
      }
      return { gestor: created, inviteSent }
    } catch (error) {
      await rollbackCreatedPortalUser(authUserId, portalUserId)
      throw error
    }
  },

  async createClient(input) {
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

    const { authUserId, inviteSent } = await createAuthUserForClient(email)
    let portalUserId: string | undefined

    try {
      const profileFields = mapClientProfileFields({
        clientKind: input.clientKind,
        firstName: input.firstName,
        firstSurname: input.firstSurname,
        secondSurname: input.secondSurname,
        companyName: input.companyName,
      })

      const { data: userRow, error: userError } = await supabase
        .from('users')
        .insert({
          auth_user_id: authUserId,
          email,
          role: 'client',
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

      portalUserId = userRow.id
      const newUserId = userRow.id

      await upsertProfile(newUserId, {
        ...profileFields,
        phone: input.phone ?? null,
        advisor_id: input.advisorId ?? null,
      })

      await upsertClientIntegration(newUserId, {
        odoo_partner_id: parseOdooPartnerId(input.odooPartnerId),
        drive_folder_id: input.driveFolderId?.trim() || null,
      })

      const created = await this.getClient(newUserId)
      if (!created) {
        throw new Error('Cliente no encontrado tras crear')
      }
      return { client: created, inviteSent }
    } catch (error) {
      await rollbackCreatedPortalUser(authUserId, portalUserId)
      throw error
    }
  },

  async updateGestor(input) {
    const supabase = createSupabaseAdminClient()
    const status = mapPersonStatusToDb(input.status)

    const profileFields = mapNamePartsToProfileFields({
      firstName: input.firstName,
      firstSurname: input.firstSurname,
      secondSurname: input.secondSurname,
    })

    const { error: userError } = await supabase
      .from('users')
      .update({
        email: input.email,
        role: input.role,
        status,
        is_active: input.status === 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)

    if (userError) throw new Error(userError.message)

    await upsertProfile(input.id, {
      ...profileFields,
      phone: input.phone ?? null,
      company_name: input.companyName ?? null,
    })

    const updated = await this.getGestor(input.id)
    if (!updated) throw new Error('Gestor no encontrado tras actualizar')
    return updated
  },

  async updateClient(input) {
    const supabase = createSupabaseAdminClient()
    const status = mapPersonStatusToDb(input.status)
    const profileFields = mapClientProfileFields({
      clientKind: input.clientKind,
      firstName: input.firstName,
      firstSurname: input.firstSurname,
      secondSurname: input.secondSurname,
      companyName: input.companyName,
    })

    const { error: userError } = await supabase
      .from('users')
      .update({
        email: input.email,
        status,
        is_active: input.status === 'active',
        updated_at: new Date().toISOString(),
      })
      .eq('id', input.id)

    if (userError) throw new Error(userError.message)

    await upsertProfile(input.id, {
      ...profileFields,
      phone: input.phone ?? null,
      advisor_id: input.advisorId ?? null,
    })

    await upsertClientIntegration(input.id, {
      odoo_partner_id: parseOdooPartnerId(input.odooPartnerId),
      drive_folder_id: input.driveFolderId?.trim() || null,
    })

    const updated = await this.getClient(input.id)
    if (!updated) throw new Error('Cliente no encontrado tras actualizar')
    return updated
  },

  async deleteGestor(id) {
    const supabase = createSupabaseAdminClient()
    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('id, auth_user_id, role')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (!userRow || !isGestorDbRole(userRow.role)) {
      throw new Error('NOT_FOUND')
    }

    const authUserId = userRow.auth_user_id as string | null

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    if (authUserId) {
      const { error: authError } = await supabase.auth.admin.deleteUser(authUserId)
      if (authError) {
        throw new Error('DELETE_AUTH_FAILED')
      }
    }
  },

  async deleteClient(id) {
    const supabase = createSupabaseAdminClient()
    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('id, auth_user_id, role')
      .eq('id', id)
      .maybeSingle()

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (!userRow || userRow.role !== 'client') {
      throw new Error('NOT_FOUND')
    }

    const authUserId = userRow.auth_user_id as string | null

    const { error: deleteError } = await supabase
      .from('users')
      .delete()
      .eq('id', id)

    if (deleteError) {
      throw new Error(deleteError.message)
    }

    if (authUserId) {
      const { error: authError } = await supabase.auth.admin.deleteUser(authUserId)
      if (authError) {
        throw new Error('DELETE_AUTH_FAILED')
      }
    }
  },

  async resendClientAccessEmail(clientId) {
    const supabase = createSupabaseAdminClient()
    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('id, email, auth_user_id, role')
      .eq('id', clientId)
      .maybeSingle()

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (!userRow || userRow.role !== 'client') {
      throw new Error('NOT_FOUND')
    }

    if (!userRow.auth_user_id) {
      throw new Error('NO_AUTH_ACCOUNT')
    }

    await sendClientAccessEmailForClient(String(userRow.email))
  },

  async listAdvisorOptions() {
    const gestores = await this.listGestores()
    return gestores
      .filter((gestor) => gestor.role === 'advisor')
      .map((gestor) => ({ id: gestor.id, name: gestor.name }))
  },
}
