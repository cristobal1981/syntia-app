'use server'

import type {
  PortalAutomationListItem,
  PortalAutomationRun,
} from '@/src/modules/automatizaciones/domain/types'
import {
  adminCanSeeAutomation,
  advisorCanSeeAutomation,
} from '@/src/modules/automatizaciones/domain/types'
import { listOdooCompaniesForAutomation } from '@/src/modules/automatizaciones/application/list-odoo-companies-for-automation'
import type { OdooCompanyOption } from '@/src/modules/automatizaciones/domain/odoo-company-option'
import {
  type AutomatizacionesResult,
  requireStaffSession,
} from '@/src/modules/automatizaciones/application/automatizaciones-actions-shared'
import { isAutomatizacionesConfigured } from '@/src/modules/automatizaciones/infrastructure/automation-env'
import {
  fetchUserAutomationOrderMap,
  listPortalAutomationRuns,
  listPortalAutomationsWithLastRun,
} from '@/src/modules/automatizaciones/infrastructure/automation-repository.supabase'

function filterAutomationsForUser(
  items: PortalAutomationListItem[],
  role: 'admin' | 'advisor',
  actorId: string
): PortalAutomationListItem[] {
  return items.filter((automation) => {
    if (role === 'admin') {
      return adminCanSeeAutomation(automation)
    }
    return advisorCanSeeAutomation(automation, actorId)
  })
}

export async function listAutomatizacionesAction(): Promise<
  AutomatizacionesResult<{
    configured: boolean
    automations: PortalAutomationListItem[]
    isAdmin: boolean
  }>
> {
  try {
    const { session, actorId } = await requireStaffSession()
    const configured = isAutomatizacionesConfigured()
    const all = await listPortalAutomationsWithLastRun()
    const isAdmin = session.user.role === 'admin'
    let automations = isAdmin
      ? all
      : filterAutomationsForUser(all, 'advisor', actorId)

    // Orden personal del asesor pisa el global; automatizaciones sin posición
    // personal van al final conservando el orden global.
    if (!isAdmin) {
      const orderMap = await fetchUserAutomationOrderMap(actorId)
      if (orderMap.size) {
        const globalIndex = new Map(
          automations.map((automation, index) => [automation.id, index])
        )
        automations = [...automations].sort((a, b) => {
          const rankA =
            orderMap.get(a.id) ?? 1_000_000 + (globalIndex.get(a.id) ?? 0)
          const rankB =
            orderMap.get(b.id) ?? 1_000_000 + (globalIndex.get(b.id) ?? 0)
          return rankA - rankB
        })
      }
    }

    return {
      ok: true,
      data: {
        configured,
        automations,
        isAdmin,
      },
    }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function listAutomationRunsAction(): Promise<
  AutomatizacionesResult<PortalAutomationRun[]>
> {
  try {
    const { session, actorId } = await requireStaffSession()
    const runs = await listPortalAutomationRuns({
      limit: 30,
      triggeredBy: session.user.role === 'admin' ? undefined : actorId,
    })
    return { ok: true, data: runs }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function listAutomationsForAccessAdminAction(): Promise<
  AutomatizacionesResult<PortalAutomationListItem[]>
> {
  try {
    const { session } = await requireStaffSession()
    if (session.user.role !== 'admin') {
      return { ok: false, error: 'forbidden' }
    }
    const automations = await listPortalAutomationsWithLastRun()
    return { ok: true, data: automations }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}

export async function listOdooCompaniesForAutomationAction(): Promise<
  AutomatizacionesResult<{ companies: OdooCompanyOption[] }>
> {
  try {
    await requireStaffSession()

    const result = await listOdooCompaniesForAutomation()
    if (!result.ok) {
      return {
        ok: false,
        error: 'not_configured',
        message:
          result.error === 'odoo_unavailable'
            ? 'Odoo no está configurado en el portal.'
            : 'No se pudo cargar el catálogo de empresas de Odoo.',
      }
    }

    return { ok: true, data: { companies: result.companies } }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return {
      ok: false,
      error: 'unknown',
      message: error instanceof Error ? error.message : undefined,
    }
  }
}
