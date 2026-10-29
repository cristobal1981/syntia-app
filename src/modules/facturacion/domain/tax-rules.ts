import type { Issuer } from '@/src/modules/facturacion/domain/issuer'
import {
  isEntityTaxId,
  territoryFromAddress,
  type ClientKind,
  type Territory,
} from '@/src/modules/facturacion/domain/tax-profile'
import { DEFAULT_TAX_RATE } from '@/src/modules/facturacion/domain/tax-rates'
import type { TaxRegime } from '@/src/modules/facturacion/domain/types'

/** Retención general de IRPF de un profesional, y la reducida de los tres primeros años. */
export const PROFESSIONAL_WITHHOLDING = 15
export const NEW_PROFESSIONAL_WITHHOLDING = 7

/**
 * Perfil fiscal del emisor deducido de sus datos. «Profesional» y «nuevo profesional» son valores
 * fijos por defecto hasta que la asesoría los pueda configurar (no los edita el cliente).
 */
export type IssuerTaxProfile = {
  territory: Territory
  isNaturalPerson: boolean
  professional: boolean
  newProfessional: boolean
}

export function issuerTaxProfile(issuer: Pick<Issuer, 'taxId' | 'postalCode' | 'province'>): IssuerTaxProfile {
  const isNaturalPerson = !isEntityTaxId(issuer.taxId)
  return {
    territory: territoryFromAddress(issuer),
    isNaturalPerson,
    professional: isNaturalPerson,
    newProfessional: false,
  }
}

export type TaxTreatment = 'sujeta' | 'no_sujeta' | 'exenta'

export type TaxResolution = {
  regime: TaxRegime
  taxRate: number
  withholdingRate: number
  treatment: TaxTreatment
  /** Leyenda que debe llevar la factura cuando no hay impuesto; vacía si es una operación sujeta. */
  note: string
}

export type TaxClient = { territory: Territory; kind: ClientKind }

/**
 * Impuesto y retención de una factura ordinaria, decididos por las reglas y no por quien factura:
 * - mismo territorio: IGIC general en Canarias, IVA general en la península;
 * - Canarias ↔ península: no sujeta (localización del hecho imponible);
 * - cliente de la UE o de fuera: exenta;
 * - retención solo de un profesional persona física a una empresa o autónomo residente en España.
 */
export function resolveTax(issuer: IssuerTaxProfile, client: TaxClient): TaxResolution {
  const regime: TaxRegime = issuer.territory === 'canarias' ? 'igic' : 'iva'
  const taxName = regime === 'igic' ? 'IGIC' : 'IVA'
  const clientInSpain = client.territory === 'canarias' || client.territory === 'peninsula'

  let treatment: TaxTreatment = 'sujeta'
  let note = ''
  if (!clientInSpain) {
    treatment = 'exenta'
    note = `Operación exenta de ${taxName}: el destinatario está establecido fuera de España.`
  } else if (client.territory !== issuer.territory) {
    treatment = 'no_sujeta'
    note = `Operación no sujeta a ${taxName} por las reglas de localización del hecho imponible.`
  }

  const withholds =
    clientInSpain && issuer.isNaturalPerson && issuer.professional && (client.kind === 'empresa' || client.kind === 'autonomo')

  return {
    regime,
    taxRate: treatment === 'sujeta' ? DEFAULT_TAX_RATE[regime] : 0,
    withholdingRate: withholds ? (issuer.newProfessional ? NEW_PROFESSIONAL_WITHHOLDING : PROFESSIONAL_WITHHOLDING) : 0,
    treatment,
    note,
  }
}
