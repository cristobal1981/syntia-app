import { isValidSpanishTaxId } from '@/src/modules/facturacion/domain/tax-id'

/** Datos del obligado a expedir facturas: aparecen en todas las que emite (art. 6.1 del Reglamento). */
export type Issuer = {
  name: string
  taxId: string
  address: string
  postalCode: string
  city: string
  province: string
  email: string
  phone: string
}

export type IssuerErrorKey = 'nameRequired' | 'taxIdInvalid' | 'addressRequired' | 'postalCodeInvalid' | 'cityRequired' | 'emailInvalid'

/** Emisor ficticio de la demo. */
export const DEMO_ISSUER: Issuer = {
  name: 'Estudio Gráfico Tías (demo)',
  taxId: '12345678Z',
  address: 'Calle Ejemplo, 1',
  postalCode: '35572',
  city: 'Tías',
  province: 'Las Palmas',
  email: 'hola@estudio-demo.example',
  phone: '',
}

export const EMPTY_ISSUER: Issuer = {
  name: '',
  taxId: '',
  address: '',
  postalCode: '',
  city: '',
  province: '',
  email: '',
  phone: '',
}

export function validateIssuer(issuer: Issuer): Partial<Record<keyof Issuer, IssuerErrorKey>> {
  const errors: Partial<Record<keyof Issuer, IssuerErrorKey>> = {}
  if (!issuer.name.trim()) errors.name = 'nameRequired'
  if (!isValidSpanishTaxId(issuer.taxId)) errors.taxId = 'taxIdInvalid'
  if (!issuer.address.trim()) errors.address = 'addressRequired'
  if (!/^\d{5}$/.test(issuer.postalCode.trim())) errors.postalCode = 'postalCodeInvalid'
  if (!issuer.city.trim()) errors.city = 'cityRequired'
  if (issuer.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(issuer.email.trim())) errors.email = 'emailInvalid'
  return errors
}

export function isIssuerComplete(issuer: Issuer): boolean {
  return Object.keys(validateIssuer(issuer)).length === 0
}

/** Domicilio en una línea, para el pie de la factura. */
export function formatIssuerAddress(issuer: Pick<Issuer, 'address' | 'postalCode' | 'city' | 'province'>): string {
  return [issuer.address, [issuer.postalCode, issuer.city].filter(Boolean).join(' '), issuer.province]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(', ')
}
