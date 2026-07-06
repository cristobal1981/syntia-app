import { odooCall, odooSearchRead } from '@/src/modules/portal/infrastructure/odoo-json-client'

export type ProvisionCompanyInput = {
  name: string
  vat: string
  street?: string
  city?: string
  zip?: string
}

function parseCreatedId(created: number | number[]): number | null {
  if (typeof created === 'number' && created > 0) return created
  if (Array.isArray(created) && typeof created[0] === 'number' && created[0] > 0) {
    return created[0]
  }
  return null
}

function getServiceUserId(): number | null {
  const raw = process.env.ODOO_SERVICE_USER_ID?.trim()
  const parsed = raw ? Number.parseInt(raw, 10) : NaN
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/**
 * Provisiona la res.company del cliente autónomo (1 company por NIF = 1 SIF con
 * cadena de huellas propia). Idempotente: si ya existe una company con ese NIF,
 * la reutiliza.
 *
 * Pasos NO automatizados aquí (runbook C1): plan contable español/IGIC y subida
 * del certificado a `l10n_es_edi_verifactu_certificate_ids`.
 */
export async function provisionClientCompany(
  input: ProvisionCompanyInput
): Promise<{ companyId: number; created: boolean }> {
  const vat = input.vat.trim()

  const existing = await odooSearchRead<{ id: number }>('res.company', {
    domain: [['vat', '=', vat]],
    fields: ['id'],
    limit: 1,
  })

  let companyId: number | null = existing[0]?.id ?? null
  let created = false

  if (!companyId) {
    const result = await odooCall<number | number[]>('res.company', 'create', {
      vals_list: [
        {
          name: input.name.trim(),
          vat,
          ...(input.street ? { street: input.street } : {}),
          ...(input.city ? { city: input.city } : {}),
          ...(input.zip ? { zip: input.zip } : {}),
        },
      ],
    })
    companyId = parseCreatedId(result)
    created = true
  }

  if (!companyId) {
    throw new Error('FACTURACION_COMPANY_PROVISION_FAILED')
  }

  // Activación Verifactu: tolerante a instancias sin el módulo instalado.
  try {
    await odooCall('res.company', 'write', {
      ids: [companyId],
      vals: {
        l10n_es_edi_verifactu_required: true,
        l10n_es_edi_verifactu_test_environment:
          process.env.NODE_ENV !== 'production' ||
          process.env.ODOO_VERIFACTU_TEST_ENV?.trim().toLowerCase() !== 'false',
      },
    })
  } catch (error) {
    console.warn(
      `[facturacion] no se pudo activar Verifactu en company ${companyId}:`,
      error instanceof Error ? error.message : error
    )
  }

  // El service account necesita acceso a la company para operar vía API (C3).
  const serviceUserId = getServiceUserId()
  if (serviceUserId) {
    try {
      await odooCall('res.users', 'write', {
        ids: [serviceUserId],
        vals: { company_ids: [[4, companyId]] },
      })
    } catch (error) {
      console.warn(
        `[facturacion] no se pudo añadir company ${companyId} al service account:`,
        error instanceof Error ? error.message : error
      )
    }
  }

  return { companyId, created }
}
