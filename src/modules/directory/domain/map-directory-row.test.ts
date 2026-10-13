import { describe, expect, it } from 'vitest'

import {
  buildDisplayName,
  formatOdooPartnerId,
  isClientDbRole,
  isGestorDbRole,
  mapDbRoleToPortal,
  mapDirectorySourceToClient,
  mapDirectorySourceToGestor,
  mapNamePartsToProfileFields,
  mapPersonStatusToDb,
  mapProfileToNameParts,
  mapStatusToPersonStatus,
  parseOdooPartnerId,
  resolveClientDisplayName,
  sanitizeNullable,
  type ClientIntegrationRow,
  type DirectoryPersonSource,
  type ProfileRow,
  type UserRow,
} from '@/src/modules/directory/domain/map-directory-row'

function userRow(overrides: Partial<UserRow> = {}): UserRow {
  return {
    id: 'user-1',
    email: 'user@example.com',
    role: 'client',
    status: 'active',
    is_active: true,
    odoo_user_id: null,
    ...overrides,
  }
}

function profileRow(overrides: Partial<ProfileRow> = {}): ProfileRow {
  return {
    user_id: 'user-1',
    first_name: 'Ana',
    first_surname: 'García',
    second_surname: '',
    phone: null,
    company_name: null,
    advisor_id: null,
    vat: null,
    iban: null,
    address_line1: null,
    address_line2: null,
    postal_code: null,
    city: null,
    province: null,
    country: null,
    ...overrides,
  }
}

function integrationRow(
  overrides: Partial<ClientIntegrationRow> = {}
): ClientIntegrationRow {
  return {
    user_id: 'user-1',
    odoo_partner_id: null,
    odoo_user_id: null,
    drive_folder_id: null,
    ...overrides,
  }
}

describe('mapDbRoleToPortal', () => {
  it('maps the three recognized roles case-insensitively', () => {
    expect(mapDbRoleToPortal('client')).toBe('client')
    expect(mapDbRoleToPortal('ADVISOR')).toBe('advisor')
    expect(mapDbRoleToPortal('Admin')).toBe('admin')
  })

  it('EXCLUDES "worker" — not one of the three directory roles', () => {
    expect(mapDbRoleToPortal('worker')).toBeNull()
  })

  it('returns null for null/undefined/unknown values', () => {
    expect(mapDbRoleToPortal(null)).toBeNull()
    expect(mapDbRoleToPortal(undefined)).toBeNull()
    expect(mapDbRoleToPortal('superadmin')).toBeNull()
  })
})

describe('isGestorDbRole / isClientDbRole', () => {
  it('isGestorDbRole is true ONLY for advisor/admin', () => {
    expect(isGestorDbRole('advisor')).toBe(true)
    expect(isGestorDbRole('admin')).toBe(true)
    expect(isGestorDbRole('client')).toBe(false)
    expect(isGestorDbRole('worker')).toBe(false)
    expect(isGestorDbRole(null)).toBe(false)
  })

  it('isClientDbRole is true ONLY for client', () => {
    expect(isClientDbRole('client')).toBe(true)
    expect(isClientDbRole('advisor')).toBe(false)
    expect(isClientDbRole('admin')).toBe(false)
    expect(isClientDbRole('worker')).toBe(false)
  })
})

describe('mapStatusToPersonStatus', () => {
  it('maps active/archived verbatim (case-insensitive)', () => {
    expect(mapStatusToPersonStatus('active')).toBe('active')
    expect(mapStatusToPersonStatus('ARCHIVED')).toBe('archived')
  })

  it('falls back to "invited" for null, empty, or any unrecognized value', () => {
    expect(mapStatusToPersonStatus(null)).toBe('invited')
    expect(mapStatusToPersonStatus(undefined)).toBe('invited')
    expect(mapStatusToPersonStatus('pending')).toBe('invited')
  })
})

describe('mapPersonStatusToDb', () => {
  it('is the identity mapping', () => {
    expect(mapPersonStatusToDb('active')).toBe('active')
    expect(mapPersonStatusToDb('archived')).toBe('archived')
    expect(mapPersonStatusToDb('invited')).toBe('invited')
  })
})

describe('sanitizeNullable', () => {
  it('treats null/undefined/empty/whitespace-only/"null" string as undefined', () => {
    expect(sanitizeNullable(null)).toBeUndefined()
    expect(sanitizeNullable(undefined)).toBeUndefined()
    expect(sanitizeNullable('')).toBeUndefined()
    expect(sanitizeNullable('   ')).toBeUndefined()
    expect(sanitizeNullable('null')).toBeUndefined()
  })

  it('trims and returns a real value', () => {
    expect(sanitizeNullable('  Ana  ')).toBe('Ana')
  })
})

describe('buildDisplayName', () => {
  it('joins non-empty parts with a space, skipping "null"/empty parts', () => {
    expect(buildDisplayName('Ana', 'García', 'Ruiz')).toBe('Ana García Ruiz')
    expect(buildDisplayName('Ana', 'null', undefined)).toBe('Ana')
  })

  it('falls back to "Sin nombre" when every part is empty', () => {
    expect(buildDisplayName('', '', '')).toBe('Sin nombre')
    expect(buildDisplayName(null, null)).toBe('Sin nombre')
  })
})

describe('resolveClientDisplayName', () => {
  it('uses the company name for a company-kind profile', () => {
    const profile = profileRow({
      first_name: '',
      first_surname: '',
      company_name: 'Acme SL',
    })

    expect(resolveClientDisplayName(profile)).toBe('Acme SL')
  })

  it('falls back to "Sin nombre" for a company profile with a blank company name', () => {
    const profile = profileRow({
      first_name: '',
      first_surname: '',
      company_name: '   ',
    })

    expect(resolveClientDisplayName(profile)).toBe('Sin nombre')
  })

  it('uses the person name parts for a person-kind profile', () => {
    const profile = profileRow({ first_name: 'Ana', first_surname: 'García' })

    expect(resolveClientDisplayName(profile)).toBe('Ana García')
  })
})

describe('mapProfileToNameParts / mapNamePartsToProfileFields (round-trip asymmetry)', () => {
  it('mapProfileToNameParts sanitizes an empty secondSurname to undefined', () => {
    const profile = profileRow({ second_surname: '' })

    expect(mapProfileToNameParts(profile).secondSurname).toBeUndefined()
  })

  it('mapNamePartsToProfileFields defaults a missing secondSurname back to "" (empty string, NOT undefined) — required by the DB column', () => {
    const dbFields = mapNamePartsToProfileFields({
      firstName: 'Ana',
      firstSurname: 'García',
    })

    expect(dbFields.second_surname).toBe('')
  })

  it('mapNamePartsToProfileFields trims all three fields', () => {
    const dbFields = mapNamePartsToProfileFields({
      firstName: ' Ana ',
      firstSurname: ' García ',
      secondSurname: ' Ruiz ',
    })

    expect(dbFields).toEqual({
      first_name: 'Ana',
      first_surname: 'García',
      second_surname: 'Ruiz',
    })
  })
})

describe('formatOdooPartnerId', () => {
  it('returns undefined for null/undefined/zero/negative', () => {
    expect(formatOdooPartnerId(null)).toBeUndefined()
    expect(formatOdooPartnerId(undefined)).toBeUndefined()
    expect(formatOdooPartnerId(0)).toBeUndefined()
    expect(formatOdooPartnerId(-5)).toBeUndefined()
  })

  it('stringifies a positive id', () => {
    expect(formatOdooPartnerId(42)).toBe('42')
  })
})

describe('parseOdooPartnerId', () => {
  it('returns null for empty/undefined/non-numeric/zero/negative', () => {
    expect(parseOdooPartnerId(undefined)).toBeNull()
    expect(parseOdooPartnerId('')).toBeNull()
    expect(parseOdooPartnerId('abc')).toBeNull()
    expect(parseOdooPartnerId('0')).toBeNull()
    expect(parseOdooPartnerId('-3')).toBeNull()
  })

  it('parses a positive numeric string', () => {
    expect(parseOdooPartnerId('42')).toBe(42)
  })
})

describe('mapDirectorySourceToGestor (role-gated: advisor/admin only)', () => {
  it('returns null for a client/worker role — never leaks a client as a gestor', () => {
    expect(
      mapDirectorySourceToGestor({ user: userRow({ role: 'client' }) })
    ).toBeNull()
    expect(
      mapDirectorySourceToGestor({ user: userRow({ role: 'worker' }) })
    ).toBeNull()
  })

  it('maps an advisor, sourcing odooUserId from user.odoo_user_id (NOT client_integrations)', () => {
    const source: DirectoryPersonSource = {
      user: userRow({ role: 'advisor', odoo_user_id: 77 }),
      profile: profileRow(),
    }

    const gestor = mapDirectorySourceToGestor(source)

    expect(gestor).toMatchObject({
      role: 'advisor',
      odooUserId: '77',
    })
  })

  it('maps status from user.status, falling back to is_active', () => {
    const source: DirectoryPersonSource = {
      user: userRow({ role: 'admin', status: null, is_active: true }),
    }

    expect(mapDirectorySourceToGestor(source)?.status).toBe('active')
  })
})

describe('mapDirectorySourceToClient (role-gated: client only)', () => {
  it('returns null for an advisor/admin role — never leaks a gestor as a client', () => {
    expect(
      mapDirectorySourceToClient({ user: userRow({ role: 'advisor' }) })
    ).toBeNull()
    expect(
      mapDirectorySourceToClient({ user: userRow({ role: 'admin' }) })
    ).toBeNull()
  })

  it('maps odooPartnerId from client_integrations.odoo_partner_id (NOT user.odoo_user_id)', () => {
    const source: DirectoryPersonSource = {
      user: userRow({ role: 'client', odoo_user_id: 999 }),
      profile: profileRow(),
      integration: integrationRow({ odoo_partner_id: 55 }),
    }

    const client = mapDirectorySourceToClient(source)

    expect(client?.odooPartnerId).toBe('55')
  })

  it('maps advisorId from profile.advisor_id', () => {
    const source: DirectoryPersonSource = {
      user: userRow({ role: 'client' }),
      profile: profileRow({ advisor_id: 'advisor-1' }),
    }

    expect(mapDirectorySourceToClient(source)?.advisorId).toBe('advisor-1')
  })

  it('passes through the given advisorName untouched', () => {
    const source: DirectoryPersonSource = {
      user: userRow({ role: 'client' }),
      profile: profileRow(),
    }

    expect(mapDirectorySourceToClient(source, 'Asesor Uno')?.advisorName).toBe(
      'Asesor Uno'
    )
  })

  it('falls back to the raw user email as the display name when there is no profile', () => {
    const source: DirectoryPersonSource = {
      user: userRow({ role: 'client', email: 'sinperfil@example.com' }),
    }

    const client = mapDirectorySourceToClient(source)

    expect(client?.name).toBe('sinperfil@example.com')
    expect(client?.firstSurname).toBe('')
  })
})
