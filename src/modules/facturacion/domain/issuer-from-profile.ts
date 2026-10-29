import type { Issuer } from '@/src/modules/facturacion/domain/issuer'
import type { ClientProfile } from '@/src/modules/profile/domain/types'

/** El emisor de las facturas es el propio cliente tal como figura en su perfil de Odoo. */
export function issuerFromProfile(profile: ClientProfile): Issuer {
  const { address } = profile
  return {
    name: profile.name === '—' ? '' : profile.name.trim(),
    taxId: profile.vat.trim().toUpperCase(),
    address: [address.line1, address.line2]
      .map((part) => part.trim())
      .filter(Boolean)
      .join(', '),
    postalCode: address.postalCode.trim(),
    city: address.city.trim(),
    province: address.province.trim(),
    email: profile.email.trim(),
    phone: profile.phone.trim(),
  }
}

export function isSameIssuer(a: Issuer, b: Issuer): boolean {
  return (Object.keys(a) as Array<keyof Issuer>).every((key) => a[key] === b[key])
}
