import { normalizeTaxId } from '@/src/modules/facturacion/domain/tax-id'

/**
 * Dónde está establecido el cliente a efectos del impuesto indirecto. Ceuta y Melilla (IPSI) no
 * entran en el mock: se tratan como «fuera de la UE», que es lo más cercano (no llevan IVA ni IGIC).
 */
export type Territory = 'canarias' | 'peninsula' | 'ue' | 'fuera_ue'

export const TERRITORIES: readonly Territory[] = ['canarias', 'peninsula', 'ue', 'fuera_ue']

/** Para la retención de IRPF solo importa si el cliente actúa como empresa o profesional. */
export type ClientKind = 'particular' | 'autonomo' | 'empresa'

export const CLIENT_KINDS: readonly ClientKind[] = ['particular', 'autonomo', 'empresa']

const CANARIAS_PROVINCES = ['las palmas', 'santa cruz de tenerife', 'canarias']
const CEUTA_MELILLA_PREFIXES = ['51', '52']

/** Territorio sugerido por el código postal y la provincia; sin datos, península. */
export function territoryFromAddress(address: { postalCode: string; province: string }): Territory {
  const postalCode = address.postalCode.trim()
  if (/^(35|38)\d{3}$/.test(postalCode)) return 'canarias'
  if (CEUTA_MELILLA_PREFIXES.some((prefix) => postalCode.startsWith(prefix)) && /^\d{5}$/.test(postalCode)) return 'fuera_ue'
  const province = address.province.trim().toLowerCase()
  if (CANARIAS_PROVINCES.includes(province)) return 'canarias'
  return 'peninsula'
}

/** Letras de NIF de entidad (CIF): sociedades, asociaciones, administraciones… */
const ENTITY_LETTERS = new Set('ABCDEFGHJNPQRSUVW')

/** `true` si el NIF es de una entidad; un DNI, NIE o K/L/M es de persona física. */
export function isEntityTaxId(taxId: string): boolean {
  const first = normalizeTaxId(taxId).charAt(0)
  return ENTITY_LETTERS.has(first)
}

/** Tipo de cliente sugerido por su NIF: una entidad es empresa; una persona física, particular hasta que se diga lo contrario. */
export function clientKindFromTaxId(taxId: string): ClientKind {
  return isEntityTaxId(taxId) ? 'empresa' : 'particular'
}
