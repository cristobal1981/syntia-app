import {
  buildDisplayName,
  PROFILE_SELECT,
  USER_SELECT,
  type ProfileRow,
  type UserRow,
} from '@/src/modules/directory/domain/map-directory-row'
import type {
  AdvisorVisibility,
  AutomationInputField,
  AutomationRunStatus,
  PortalAutomation,
  PortalAutomationListItem,
  PortalAutomationRun,
} from '@/src/modules/automatizaciones/domain/types'
import {
  advisorCanSeeAutomation,
  parseAutomationInputFields,
} from '@/src/modules/automatizaciones/domain/types'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'

type AutomationRow = {
  id: string
  slug: string
  title: string
  description: string | null
  webhook_path: string
  icon: string
  sort_order: number
  is_active: boolean
  admin_only: boolean
  advisor_visibility: AdvisorVisibility
  input_fields: unknown
}

type GrantRow = {
  automation_id: string
  advisor_id: string
}

type RunRow = {
  id: string
  automation_id: string
  triggered_by: string
  status: AutomationRunStatus
  http_status: number | null
  error_message: string | null
  created_at: string
}

const AUTOMATION_SELECT =
  'id, slug, title, description, webhook_path, icon, sort_order, is_active, admin_only, advisor_visibility, input_fields'

function mapAutomationRow(
  row: AutomationRow,
  grantedAdvisorIds: string[]
): PortalAutomation {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    description: row.description,
    webhookPath: row.webhook_path,
    icon: row.icon,
    sortOrder: row.sort_order,
    isActive: row.is_active,
    adminOnly: row.admin_only,
    advisorVisibility: row.advisor_visibility,
    grantedAdvisorIds,
    inputFields: parseAutomationInputFields(row.input_fields),
  }
}

async function fetchGrantMap(
  automationIds: string[]
): Promise<Map<string, string[]>> {
  const map = new Map<string, string[]>()
  if (!automationIds.length) return map

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_automation_advisor_grants')
    .select('automation_id, advisor_id')
    .in('automation_id', automationIds)

  if (error) {
    throw new Error(error.message)
  }

  for (const row of (data ?? []) as GrantRow[]) {
    const current = map.get(row.automation_id) ?? []
    current.push(row.advisor_id)
    map.set(row.automation_id, current)
  }

  return map
}

async function fetchLastRunMap(
  automationIds: string[]
): Promise<
  Map<string, Pick<PortalAutomationRun, 'status' | 'createdAt' | 'httpStatus'>>
> {
  const map = new Map<
    string,
    Pick<PortalAutomationRun, 'status' | 'createdAt' | 'httpStatus'>
  >()
  if (!automationIds.length) return map

  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_automation_runs')
    .select('automation_id, status, http_status, created_at')
    .in('automation_id', automationIds)
    .order('created_at', { ascending: false })
    .limit(Math.max(automationIds.length * 3, 50))

  if (error) {
    throw new Error(error.message)
  }

  for (const row of data ?? []) {
    const automationId = row.automation_id as string
    if (map.has(automationId)) continue
    map.set(automationId, {
      status: row.status as AutomationRunStatus,
      httpStatus:
        typeof row.http_status === 'number' ? row.http_status : null,
      createdAt: row.created_at as string,
    })
  }

  return map
}

export async function listPortalAutomationsFromDb(): Promise<PortalAutomation[]> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_automations')
    .select(AUTOMATION_SELECT)
    .order('sort_order', { ascending: true })
    .order('title', { ascending: true })

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as AutomationRow[]
  const grantMap = await fetchGrantMap(rows.map((row) => row.id))
  return rows.map((row) =>
    mapAutomationRow(row, grantMap.get(row.id) ?? [])
  )
}

export async function listPortalAutomationsWithLastRun(): Promise<
  PortalAutomationListItem[]
> {
  const automations = await listPortalAutomationsFromDb()
  const lastRunMap = await fetchLastRunMap(automations.map((item) => item.id))
  return automations.map((automation) => ({
    ...automation,
    lastRun: lastRunMap.get(automation.id) ?? null,
  }))
}

export async function getPortalAutomationById(
  automationId: string
): Promise<PortalAutomation | null> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_automations')
    .select(AUTOMATION_SELECT)
    .eq('id', automationId)
    .maybeSingle<AutomationRow>()

  if (error) {
    throw new Error(error.message)
  }

  if (!data) return null
  const grantMap = await fetchGrantMap([data.id])
  return mapAutomationRow(data, grantMap.get(data.id) ?? [])
}

export async function updatePortalAutomationAccess(input: {
  automationId: string
  isActive: boolean
  adminOnly: boolean
  advisorVisibility: AdvisorVisibility
  grantedAdvisorIds: string[]
}): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const { error: updateError } = await supabase
    .from('portal_automations')
    .update({
      is_active: input.isActive,
      admin_only: input.adminOnly,
      advisor_visibility: input.advisorVisibility,
      updated_at: now,
    })
    .eq('id', input.automationId)

  if (updateError) {
    throw new Error(updateError.message)
  }

  const { error: deleteError } = await supabase
    .from('portal_automation_advisor_grants')
    .delete()
    .eq('automation_id', input.automationId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (input.advisorVisibility !== 'selected' || !input.grantedAdvisorIds.length) {
    return
  }

  const { error: insertError } = await supabase
    .from('portal_automation_advisor_grants')
    .insert(
      input.grantedAdvisorIds.map((advisorId) => ({
        automation_id: input.automationId,
        advisor_id: advisorId,
      }))
    )

  if (insertError) {
    throw new Error(insertError.message)
  }
}

export async function insertPortalAutomationRun(input: {
  automationId: string
  triggeredBy: string
  status: AutomationRunStatus
  httpStatus?: number
  errorMessage?: string
}): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase.from('portal_automation_runs').insert({
    automation_id: input.automationId,
    triggered_by: input.triggeredBy,
    status: input.status,
    http_status: input.httpStatus ?? null,
    error_message: input.errorMessage ?? null,
  })

  if (error) {
    throw new Error(error.message)
  }
}

export async function listPortalAutomationRuns(input: {
  limit?: number
  triggeredBy?: string
}): Promise<PortalAutomationRun[]> {
  const supabase = createSupabaseAdminClient()
  let query = supabase
    .from('portal_automation_runs')
    .select(
      'id, automation_id, triggered_by, status, http_status, error_message, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(input.limit ?? 30)

  if (input.triggeredBy) {
    query = query.eq('triggered_by', input.triggeredBy)
  }

  const { data, error } = await query
  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as RunRow[]
  if (!rows.length) return []

  const automations = await listPortalAutomationsFromDb()
  const automationById = new Map(automations.map((item) => [item.id, item]))

  const userIds = [...new Set(rows.map((row) => row.triggered_by))]

  const [{ data: users, error: usersError }, { data: profiles, error: profilesError }] =
    await Promise.all([
      supabase.from('users').select(USER_SELECT).in('id', userIds),
      supabase.from('profiles').select(PROFILE_SELECT).in('user_id', userIds),
    ])

  if (usersError) {
    throw new Error(usersError.message)
  }
  if (profilesError) {
    throw new Error(profilesError.message)
  }

  const userById = new Map((users ?? []).map((row) => [row.id, row as UserRow]))
  const profileByUserId = new Map(
    (profiles ?? []).map((row) => [row.user_id, row as ProfileRow])
  )

  function resolveTriggeredByName(userId: string): string | null {
    const profile = profileByUserId.get(userId)
    if (profile) {
      return buildDisplayName(
        profile.first_name,
        profile.first_surname,
        profile.second_surname
      )
    }
    const user = userById.get(userId)
    return user?.email?.trim() || null
  }

  return rows.map((row) => {
    const automation = automationById.get(row.automation_id)
    return {
      id: row.id,
      automationId: row.automation_id,
      automationSlug: automation?.slug ?? row.automation_id,
      automationTitle: automation?.title ?? 'Automatización',
      triggeredBy: row.triggered_by,
      triggeredByName: resolveTriggeredByName(row.triggered_by),
      status: row.status,
      httpStatus: row.http_status,
      errorMessage: row.error_message,
      createdAt: row.created_at,
    }
  })
}

export async function insertPortalAutomation(input: {
  slug: string
  title: string
  description: string | null
  webhookPath: string
  icon: string
  sortOrder: number
  isActive: boolean
  adminOnly: boolean
  advisorVisibility: AdvisorVisibility
  inputFields: AutomationInputField[]
}): Promise<PortalAutomation> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  const { data, error } = await supabase
    .from('portal_automations')
    .insert({
      slug: input.slug,
      title: input.title,
      description: input.description,
      webhook_path: input.webhookPath,
      icon: input.icon,
      sort_order: input.sortOrder,
      is_active: input.isActive,
      admin_only: input.adminOnly,
      advisor_visibility: input.advisorVisibility,
      input_fields: input.inputFields,
      created_at: now,
      updated_at: now,
    })
    .select(AUTOMATION_SELECT)
    .single<AutomationRow>()

  if (error) {
    throw error
  }

  return mapAutomationRow(data, [])
}

/** Actualiza la definición completa (no toca sort_order; limpia grants si la visibilidad deja de ser 'selected'). */
export async function updatePortalAutomationDefinition(input: {
  automationId: string
  slug: string
  title: string
  description: string | null
  webhookPath: string
  icon: string
  isActive: boolean
  adminOnly: boolean
  advisorVisibility: AdvisorVisibility
  inputFields: AutomationInputField[]
}): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { error } = await supabase
    .from('portal_automations')
    .update({
      slug: input.slug,
      title: input.title,
      description: input.description,
      webhook_path: input.webhookPath,
      icon: input.icon,
      is_active: input.isActive,
      admin_only: input.adminOnly,
      advisor_visibility: input.advisorVisibility,
      input_fields: input.inputFields,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.automationId)

  if (error) {
    throw error
  }

  if (input.advisorVisibility !== 'selected') {
    const { error: grantsError } = await supabase
      .from('portal_automation_advisor_grants')
      .delete()
      .eq('automation_id', input.automationId)

    if (grantsError) {
      throw new Error(grantsError.message)
    }
  }
}

/** Borra la automatización; grants, runs y orden personal caen por FK cascade. */
export async function deletePortalAutomation(automationId: string): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const { error } = await supabase
    .from('portal_automations')
    .delete()
    .eq('id', automationId)

  if (error) {
    throw new Error(error.message)
  }
}

/** Siguiente hueco al final del orden global. */
export async function getNextAutomationSortOrder(): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_automations')
    .select('sort_order')
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle<{ sort_order: number }>()

  if (error) {
    throw new Error(error.message)
  }

  return (data?.sort_order ?? -1) + 1
}

/** Reindexa el orden global: sort_order = índice en orderedIds. */
export async function updateAutomationGlobalOrder(
  orderedIds: string[]
): Promise<void> {
  const supabase = createSupabaseAdminClient()
  const now = new Date().toISOString()

  for (let index = 0; index < orderedIds.length; index += 1) {
    const { error } = await supabase
      .from('portal_automations')
      .update({ sort_order: index, updated_at: now })
      .eq('id', orderedIds[index])

    if (error) {
      throw new Error(error.message)
    }
  }
}

/** Sustituye el orden personal completo de un usuario. */
export async function replaceUserAutomationOrder(
  userId: string,
  orderedIds: string[]
): Promise<void> {
  const supabase = createSupabaseAdminClient()

  const { error: deleteError } = await supabase
    .from('portal_automation_user_order')
    .delete()
    .eq('user_id', userId)

  if (deleteError) {
    throw new Error(deleteError.message)
  }

  if (!orderedIds.length) return

  const { error: insertError } = await supabase
    .from('portal_automation_user_order')
    .insert(
      orderedIds.map((automationId, index) => ({
        user_id: userId,
        automation_id: automationId,
        position: index,
      }))
    )

  if (insertError) {
    throw new Error(insertError.message)
  }
}

export async function fetchUserAutomationOrderMap(
  userId: string
): Promise<Map<string, number>> {
  const supabase = createSupabaseAdminClient()
  const { data, error } = await supabase
    .from('portal_automation_user_order')
    .select('automation_id, position')
    .eq('user_id', userId)

  if (error) {
    throw new Error(error.message)
  }

  return new Map(
    (data ?? []).map((row) => [
      row.automation_id as string,
      row.position as number,
    ])
  )
}

export async function countActiveAutomationsForNav(): Promise<number> {
  const supabase = createSupabaseAdminClient()
  const { count, error } = await supabase
    .from('portal_automations')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true)

  if (error) {
    throw new Error(error.message)
  }

  return count ?? 0
}

export async function countVisibleAutomationsForAdvisor(
  advisorId: string
): Promise<number> {
  const automations = await listPortalAutomationsFromDb()
  return automations.filter((automation) =>
    advisorCanSeeAutomation(automation, advisorId)
  ).length
}
