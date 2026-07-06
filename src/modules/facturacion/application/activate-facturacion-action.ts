'use server'

import { revalidateTag } from 'next/cache'

import {
  buildDirectoryScope,
  requireDirectorySession,
} from '@/src/modules/directory/application/directory-queries'
import { getDirectoryRepository } from '@/src/modules/directory/infrastructure/get-directory-repository'
import {
  getClientIntegrationByUserId,
  upsertClientIntegration,
} from '@/src/modules/directory/infrastructure/client-integrations.supabase'
import { createSupabaseAdminClient } from '@/src/modules/directory/infrastructure/supabase-admin'
import type { FacturacionResult } from '@/src/modules/facturacion/domain/types'
import { provisionClientCompany } from '@/src/modules/facturacion/infrastructure/odoo-company-provisioning'
import { clientOdooCompanyCacheTag } from '@/src/modules/portal/infrastructure/cached-client-odoo-access'
import {
  isOdooApiConfigured,
  resolveOdooErrorCode,
} from '@/src/modules/portal/infrastructure/odoo-json-client'

/**
 * Activa la facturación VERI*FACTU de un cliente: provisiona (o reutiliza) su
 * res.company en Odoo por NIF y la vincula en client_integrations. Solo
 * advisor/admin; el advisor solo sobre clientes asignados.
 */
export async function activateFacturacionForClientAction(
  clientId: string
): Promise<FacturacionResult<{ companyId: number; created: boolean }>> {
  try {
    const session = await requireDirectorySession()
    if (session.user.role === 'client') {
      return { ok: false, error: 'forbidden' }
    }

    if (!isOdooApiConfigured()) {
      return { ok: false, error: 'odoo_unavailable' }
    }

    const scope = await buildDirectoryScope()
    const repository = getDirectoryRepository()
    const client = await repository.getClient(clientId)
    if (!client) {
      return { ok: false, error: 'not_found' }
    }
    if (scope.role === 'advisor' && client.advisorId !== scope.userId) {
      return { ok: false, error: 'forbidden' }
    }

    const supabase = createSupabaseAdminClient()
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('vat, address_line1, city, postal_code')
      .eq('user_id', clientId)
      .maybeSingle()

    if (profileError) {
      return { ok: false, error: 'odoo_unavailable', message: profileError.message }
    }

    const vat = profile?.vat?.trim()
    if (!vat) {
      return {
        ok: false,
        error: 'validation',
        message: 'El cliente no tiene NIF en su perfil: es obligatorio para el SIF.',
      }
    }

    const provisioned = await provisionClientCompany({
      name: client.name,
      vat,
      street: profile?.address_line1 ?? undefined,
      city: profile?.city ?? undefined,
      zip: profile?.postal_code ?? undefined,
    })

    const integration = await getClientIntegrationByUserId(clientId)
    await upsertClientIntegration(clientId, {
      odoo_partner_id: integration?.odoo_partner_id ?? null,
      drive_folder_id: integration?.drive_folder_id ?? null,
      odoo_company_id: provisioned.companyId,
    })

    revalidateTag(clientOdooCompanyCacheTag(clientId), 'max')

    return { ok: true, data: provisioned }
  } catch (error) {
    if (error instanceof Error && error.message === 'unauthorized') {
      return { ok: false, error: 'unauthorized' }
    }
    if (error instanceof Error && error.message === 'forbidden') {
      return { ok: false, error: 'forbidden' }
    }
    return { ok: false, error: resolveOdooErrorCode(error) }
  }
}
