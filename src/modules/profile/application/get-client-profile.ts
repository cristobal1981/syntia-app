import type { PortalUser } from '@/src/modules/auth/domain/types'
import type { ClientProfile } from '@/src/modules/profile/domain/types'

const MOCK_PROFILE_EXTRAS: Pick<ClientProfile, 'phone' | 'address' | 'taxId' | 'iban'> = {
  phone: '+34 612 345 678',
  address: {
    line1: 'Calle Gran Vía, 28',
    line2: '3º B',
    postalCode: '28013',
    city: 'Madrid',
    province: 'Madrid',
    country: 'España',
  },
  taxId: '12345678Z',
  iban: 'ES9121000418450200051332',
}

export function getClientProfile(user: PortalUser): ClientProfile {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    phone: MOCK_PROFILE_EXTRAS.phone,
    address: { ...MOCK_PROFILE_EXTRAS.address },
    taxId: MOCK_PROFILE_EXTRAS.taxId,
    iban: MOCK_PROFILE_EXTRAS.iban,
  }
}
