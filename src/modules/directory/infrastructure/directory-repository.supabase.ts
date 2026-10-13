import { z } from 'zod'

import { mapClientProfileFields } from '@/src/modules/directory/domain/client-kind'
import {
  isClientDbRole,
  isGestorDbRole,
  mapDirectorySourceToClient,
  mapDirectorySourceToGestor,
  mapNamePartsToProfileFields,
  mapPersonStatusToDb,
  parseOdooPartnerId,
} from '@/src/modules/directory/domain/map-directory-row'
import type { ClientRecord, GestorRecord } from '@/src/modules/directory/domain/types'
import type { DirectoryRepository } from '@/src/modules/directory/infrastructure/directory-repository'
import { sendClientAccessEmailForClient } from '@/src/modules/directory/infrastructure/client-access-link'
import { upsertClientIntegration } from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import { propagateOwnerIntegrationToWorkers } from '@/src/modules/colaboradores/infrastructure/worker-grants.supabase'
import {
  buildAdvisorNameMap,
  buildDirectorySources,
  fetchClientIdsForAdvisor,
  fetchDirectorySearchIndex,
  fetchUserIdsByRole,
  paginateSearchIndex,
  resolveAdvisorDisplayName,
} from '@/src/modules/directory/infrastructure/directory-query-helpers.supabase'
import {
  buildRandomStrongPassword,
  createAuthUserForClient,
  isDuplicateEmailError,
  rollbackCreatedPortalUser,
  upsertProfile,
} from '@/src/modules/directory/infrastructure/portal-account-provisioning.supabase'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

/** Forma del `jsonb` del RPC `count_clients_by_advisor` — frontera real (SQL). */
const clientCountsByAdvisorSchema = z.record(z.string(), z.number())

export const supabaseDirectoryRepository: DirectoryRepository = {
  async listGestores() {
    // Filtra por role en SQL en vez de traer toda `users`/`profiles`/
    // `client_integrations` y descartar no-gestores en memoria — a
    // isGestorDbRole() en mapDirectorySourceToGestor() se mantiene como
    // cinturón de seguridad por si el role real no encaja (p.ej. row
    // borrado entre esta query y buildDirectorySources).
    const ids = await fetchUserIdsByRole(['advisor', 'admin'])
    if (!ids.length) return []

    const sources = await buildDirectorySources(ids)
    const gestores: GestorRecord[] = []

    for (const source of sources) {
      const mapped = mapDirectorySourceToGestor(source)
      if (mapped) gestores.push(mapped)
    }

    return gestores.sort((a, b) => a.name.localeCompare(b.name, 'es'))
  },

  async listClients(scope) {
    // Para advisor, resolver primero los ids con advisor_id = scope.userId
    // en SQL (reduce el dataset antes del join) en vez de traer todos los
    // clientes. El `advisorId !== scope.userId` de abajo se mantiene igual
    // como cinturón de seguridad — scoping por asesor es seguridad-sensible
    // (visibilidad entre clientes de distintos asesores) y no debe depender
    // solo del filtro SQL.
    const ids =
      scope.role === 'advisor'
        ? await fetchClientIdsForAdvisor(scope.userId)
        : await fetchUserIdsByRole(['client'])
    if (!ids.length) return []

    const sources = await buildDirectorySources(ids)
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

  async listClientsPage(scope, params) {
    const ids =
      scope.role === 'advisor'
        ? await fetchClientIdsForAdvisor(scope.userId)
        : await fetchUserIdsByRole(['client'])
    if (!ids.length) return { items: [], totalCount: 0 }

    const index = await fetchDirectorySearchIndex(ids)
    const { pageIds, totalCount } = paginateSearchIndex(index, params)
    if (!pageIds.length) return { items: [], totalCount }

    // Enriquece (3 tablas, todas las columnas) solo la página actual —
    // nunca el scope completo, a diferencia de `listClients` arriba.
    const sources = await buildDirectorySources(pageIds)
    const advisorNames = await buildAdvisorNameMap(sources)
    const clients: ClientRecord[] = []

    for (const source of sources) {
      if (!isClientDbRole(source.user.role)) continue

      if (scope.role === 'advisor') {
        const advisorId = source.profile?.advisor_id
        if (!advisorId || advisorId !== scope.userId) continue
      }

      const advisorName = source.profile?.advisor_id
        ? advisorNames.get(source.profile.advisor_id)
        : undefined
      const mapped = mapDirectorySourceToClient(source, advisorName)
      if (mapped) clients.push(mapped)
    }

    // `sources` preserva el orden de `pageIds` (ya alfabético, resuelto
    // sobre el índice ligero) — no hace falta reordenar otra vez.
    return { items: clients, totalCount }
  },

  async listGestoresPage(params) {
    const ids = await fetchUserIdsByRole(['advisor', 'admin'])
    if (!ids.length) return { items: [], totalCount: 0 }

    const index = await fetchDirectorySearchIndex(ids)
    const { pageIds, totalCount } = paginateSearchIndex(index, params)
    if (!pageIds.length) return { items: [], totalCount }

    const sources = await buildDirectorySources(pageIds)
    const gestores: GestorRecord[] = []

    for (const source of sources) {
      const mapped = mapDirectorySourceToGestor(source)
      if (mapped) gestores.push(mapped)
    }

    return { items: gestores, totalCount }
  },

  async countClientsByAdvisor() {
    const supabase = createSupabaseAdminClient()
    const { data, error } = await supabase.rpc('count_clients_by_advisor')
    if (error) {
      throw new Error(error.message)
    }
    return clientCountsByAdvisorSchema.parse(data)
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
          odoo_user_id: parseOdooPartnerId(input.odooUserId),
        })
        .select('id')
        .single()

      if (userError || !userRow) {
        if (userError && isDuplicateEmailError(userError)) {
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
        if (userError && isDuplicateEmailError(userError)) {
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
        odoo_user_id: parseOdooPartnerId(input.odooUserId),
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

    const integrationFields = {
      odoo_partner_id: parseOdooPartnerId(input.odooPartnerId),
      drive_folder_id: input.driveFolderId?.trim() || null,
    }
    await upsertClientIntegration(input.id, integrationFields)
    await propagateOwnerIntegrationToWorkers(input.id, integrationFields)

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
      .select('id, email, auth_user_id, role, status')
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

    if (userRow.status === 'archived') {
      throw new Error('ACCOUNT_ARCHIVED')
    }

    if (userRow.status === 'active') {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        String(userRow.auth_user_id),
        { password: buildRandomStrongPassword() }
      )
      if (passwordError) {
        throw new Error('PASSWORD_RESET_FAILED')
      }
    }

    await sendClientAccessEmailForClient(String(userRow.email))
  },

  async resendGestorAccessEmail(gestorId) {
    const supabase = createSupabaseAdminClient()
    const { data: userRow, error: fetchError } = await supabase
      .from('users')
      .select('id, email, auth_user_id, role, status')
      .eq('id', gestorId)
      .maybeSingle()

    if (fetchError) {
      throw new Error(fetchError.message)
    }

    if (!userRow || !isGestorDbRole(userRow.role)) {
      throw new Error('NOT_FOUND')
    }

    if (!userRow.auth_user_id) {
      throw new Error('NO_AUTH_ACCOUNT')
    }

    if (userRow.status === 'archived') {
      throw new Error('ACCOUNT_ARCHIVED')
    }

    if (userRow.status === 'active') {
      const { error: passwordError } = await supabase.auth.admin.updateUserById(
        String(userRow.auth_user_id),
        { password: buildRandomStrongPassword() }
      )
      if (passwordError) {
        throw new Error('PASSWORD_RESET_FAILED')
      }
    }

    await sendClientAccessEmailForClient(String(userRow.email))
  },

  async listAdvisorOptions() {
    const gestores = await this.listGestores()
    return gestores.map((gestor) => ({
      id: gestor.id,
      name: gestor.name,
      email: gestor.email,
    }))
  },

  async bulkAssignAdvisor(clientIds, advisorId) {
    const supabase = createSupabaseAdminClient()
    const { error } = await supabase
      .from('profiles')
      .update({ advisor_id: advisorId, updated_at: new Date().toISOString() })
      .in('user_id', clientIds)

    if (error) {
      throw new Error(error.message)
    }
  },
}
