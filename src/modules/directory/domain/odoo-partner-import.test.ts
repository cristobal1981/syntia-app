import { describe, expect, it } from 'vitest'

import {
  buildImportDraftFromOdooPartner,
  detectDefaultClientKind,
  detectDefaultOdooNameSplitMode,
  mapOdooPartnerRowToImportOption,
  parseGoogleDriveParentFolderId,
  resolveOdooPartnerEmails,
  resolvePortalEmailFromOdoo,
  resolvePortalEmailFromOdooPartner,
  splitOdooLabelToNameFields,
  type OdooPartnerImportOption,
  type OdooPartnerRow,
} from '@/src/modules/directory/domain/odoo-partner-import'

function partnerOption(
  overrides: Partial<OdooPartnerImportOption> = {}
): OdooPartnerImportOption {
  return {
    id: 1,
    label: 'Ana García',
    odooPartnerId: '1',
    ...overrides,
  }
}

describe('parseGoogleDriveParentFolderId', () => {
  it('extracts the id from a /folders/<id> URL', () => {
    expect(
      parseGoogleDriveParentFolderId(
        'https://drive.google.com/drive/folders/abc123-XYZ'
      )
    ).toBe('abc123-XYZ')
  })

  it('extracts the id from a ?id=<id> query param when there is no /folders/ path', () => {
    expect(
      parseGoogleDriveParentFolderId(
        'https://drive.google.com/open?id=xyz789'
      )
    ).toBe('xyz789')
  })

  it('prefers the /folders/ path over a trailing ?id= param when both are present', () => {
    expect(
      parseGoogleDriveParentFolderId(
        'https://drive.google.com/drive/folders/path-id?id=query-id'
      )
    ).toBe('path-id')
  })

  it('returns undefined for an unrecognized URL shape or empty input', () => {
    expect(parseGoogleDriveParentFolderId('')).toBeUndefined()
    expect(parseGoogleDriveParentFolderId('not-a-url')).toBeUndefined()
  })
})

describe('resolveOdooPartnerEmails (legacy `email` field compat)', () => {
  it('uses corporateEmail when present, ignoring any legacy `email`', () => {
    const partner = {
      ...partnerOption({ corporateEmail: 'corp@example.com' }),
      email: 'legacy@example.com',
    } as OdooPartnerImportOption & { email?: string }

    expect(resolveOdooPartnerEmails(partner).corporateEmail).toBe(
      'corp@example.com'
    )
  })

  it('falls back to the legacy `email` field ONLY when corporateEmail is missing', () => {
    const partner = {
      ...partnerOption(),
      email: 'legacy@example.com',
    } as OdooPartnerImportOption & { email?: string }

    expect(resolveOdooPartnerEmails(partner).corporateEmail).toBe(
      'legacy@example.com'
    )
  })

  it('contactEmail has NO legacy fallback — passes through as-is', () => {
    expect(
      resolveOdooPartnerEmails(partnerOption({ contactEmail: undefined }))
        .contactEmail
    ).toBeUndefined()
  })
})

describe('resolvePortalEmailFromOdoo (contactEmail WINS over corporateEmail)', () => {
  it('prefers contactEmail when both are present', () => {
    expect(
      resolvePortalEmailFromOdoo('contact@example.com', 'corp@example.com')
    ).toBe('contact@example.com')
  })

  it('falls back to corporateEmail when there is no contactEmail', () => {
    expect(resolvePortalEmailFromOdoo(undefined, 'corp@example.com')).toBe(
      'corp@example.com'
    )
  })

  it('returns an empty string when neither is present', () => {
    expect(resolvePortalEmailFromOdoo(undefined, undefined)).toBe('')
  })
})

describe('resolvePortalEmailFromOdooPartner', () => {
  it('combines resolveOdooPartnerEmails + resolvePortalEmailFromOdoo end-to-end', () => {
    const partner = partnerOption({ contactEmail: 'nominas@example.com' })
    expect(resolvePortalEmailFromOdooPartner(partner)).toBe(
      'nominas@example.com'
    )
  })
})

describe('splitOdooLabelToNameFields', () => {
  describe('mode="given-first"', () => {
    it('handles a single token (used as both first name and surname)', () => {
      expect(splitOdooLabelToNameFields('Ana', 'given-first')).toEqual({
        firstName: 'Ana',
        firstSurname: 'Ana',
      })
    })

    it('handles two tokens: first + surname', () => {
      expect(
        splitOdooLabelToNameFields('Ana García', 'given-first')
      ).toEqual({ firstName: 'Ana', firstSurname: 'García' })
    })

    it('handles three tokens: first + surname + second surname', () => {
      expect(
        splitOdooLabelToNameFields('Ana García Ruiz', 'given-first')
      ).toEqual({
        firstName: 'Ana',
        firstSurname: 'García',
        secondSurname: 'Ruiz',
      })
    })

    it('handles 4+ tokens: everything but the last two collapses into firstName', () => {
      expect(
        splitOdooLabelToNameFields('Ana María García Ruiz', 'given-first')
      ).toEqual({
        firstName: 'Ana María',
        firstSurname: 'García',
        secondSurname: 'Ruiz',
      })
    })

    it('falls back to "Sin nombre" for a blank label', () => {
      expect(splitOdooLabelToNameFields('   ', 'given-first')).toEqual({
        firstName: 'Sin nombre',
        firstSurname: 'Sin nombre',
      })
    })
  })

  describe('mode="surname-first" (order is REVERSED relative to given-first)', () => {
    it('handles two tokens: surname + first', () => {
      expect(
        splitOdooLabelToNameFields('García Ana', 'surname-first')
      ).toEqual({ firstName: 'Ana', firstSurname: 'García' })
    })

    it('handles three tokens: surname + secondSurname + first', () => {
      expect(
        splitOdooLabelToNameFields('García Ruiz Ana', 'surname-first')
      ).toEqual({
        firstName: 'Ana',
        firstSurname: 'García',
        secondSurname: 'Ruiz',
      })
    })

    it('handles 4+ tokens: everything but the first two collapses into firstName', () => {
      expect(
        splitOdooLabelToNameFields('García Ruiz Ana María', 'surname-first')
      ).toEqual({
        firstName: 'Ana María',
        firstSurname: 'García',
        secondSurname: 'Ruiz',
      })
    })
  })

  describe('mode="comma" ("Apellidos, Nombre")', () => {
    it('splits surname(s) before the comma from the given name after it', () => {
      expect(
        splitOdooLabelToNameFields('García Ruiz, Ana', 'comma')
      ).toEqual({
        firstName: 'Ana',
        firstSurname: 'García',
        secondSurname: 'Ruiz',
      })
    })

    it('falls back to given-first splitting when there is NO comma', () => {
      expect(splitOdooLabelToNameFields('Ana García', 'comma')).toEqual(
        splitOdooLabelToNameFields('Ana García', 'given-first')
      )
    })

    it('falls back to given-first splitting when the part after the comma is empty', () => {
      expect(splitOdooLabelToNameFields('Ana García,', 'comma')).toEqual(
        splitOdooLabelToNameFields('Ana García,', 'given-first')
      )
    })

    it('uses the given name for both fields when there is no surname before the comma', () => {
      expect(splitOdooLabelToNameFields(', Ana', 'comma')).toEqual({
        firstName: 'Ana',
        firstSurname: 'Ana',
      })
    })
  })
})

describe('detectDefaultClientKind', () => {
  it('maps odooIsCompany truthy/falsy to company/person', () => {
    expect(detectDefaultClientKind(true)).toBe('company')
    expect(detectDefaultClientKind(false)).toBe('person')
    expect(detectDefaultClientKind(undefined)).toBe('person')
  })
})

describe('detectDefaultOdooNameSplitMode', () => {
  it('picks "comma" only when the label contains a comma', () => {
    expect(detectDefaultOdooNameSplitMode('García, Ana')).toBe('comma')
    expect(detectDefaultOdooNameSplitMode('Ana García')).toBe('given-first')
  })
})

describe('mapOdooPartnerRowToImportOption', () => {
  function partnerRow(overrides: Partial<OdooPartnerRow> = {}): OdooPartnerRow {
    return {
      id: 10,
      name: 'Ana García',
      email: 'corp@example.com',
      phone: '600000000',
      is_company: false,
      ...overrides,
    }
  }

  it('reads the contact email and drive URL from the given dynamic field names', () => {
    const row = partnerRow({
      x_studio_email_contacto: 'contacto@example.com',
      x_studio_drive: 'https://drive.google.com/drive/folders/xyz',
    })

    const option = mapOdooPartnerRowToImportOption(
      row,
      'x_studio_drive',
      'x_studio_email_contacto'
    )

    expect(option.contactEmail).toBe('contacto@example.com')
    expect(option.corporateEmail).toBe('corp@example.com')
  })

  it('sets driveFolderParseFailed=true only when a folder id WAS parsed from the URL but no publicDriveFolderId was resolved', () => {
    const row = partnerRow({
      x_studio_drive: 'https://drive.google.com/drive/folders/xyz',
    })

    const option = mapOdooPartnerRowToImportOption(
      row,
      'x_studio_drive',
      'x_studio_email_contacto'
      // no publicDriveFolderId passed
    )

    expect(option.driveFolderParseFailed).toBe(true)
    expect(option.driveFolderId).toBeUndefined()
  })

  it('sets driveFolderParseFailed=false when a publicDriveFolderId IS resolved', () => {
    const row = partnerRow({
      x_studio_drive: 'https://drive.google.com/drive/folders/xyz',
    })

    const option = mapOdooPartnerRowToImportOption(
      row,
      'x_studio_drive',
      'x_studio_email_contacto',
      'resolved-folder-id'
    )

    expect(option.driveFolderParseFailed).toBe(false)
    expect(option.driveFolderId).toBe('resolved-folder-id')
  })

  it('sets driveFolderParseFailed=false when there was no drive URL to parse in the first place', () => {
    const row = partnerRow({ x_studio_drive: undefined })

    const option = mapOdooPartnerRowToImportOption(
      row,
      'x_studio_drive',
      'x_studio_email_contacto'
    )

    expect(option.driveFolderParseFailed).toBe(false)
  })

  it('falls back to "Sin nombre" for a blank/false name', () => {
    const row = partnerRow({ name: false as unknown as string })

    expect(
      mapOdooPartnerRowToImportOption(row, 'drive', 'contact').label
    ).toBe('Sin nombre')
  })
})

describe('buildImportDraftFromOdooPartner (branches on clientKind)', () => {
  it('for clientKind="company": uses the partner label as companyName, blanks the person name fields', () => {
    const draft = buildImportDraftFromOdooPartner(
      partnerOption({ label: 'Acme SL' }),
      'company'
    )

    expect(draft).toMatchObject({
      clientKind: 'company',
      companyName: 'Acme SL',
      firstName: '',
      firstSurname: '',
    })
  })

  it('for clientKind="person": splits the label into name parts, leaves companyName undefined', () => {
    const draft = buildImportDraftFromOdooPartner(
      partnerOption({ label: 'Ana García' }),
      'person'
    )

    expect(draft).toMatchObject({
      clientKind: 'person',
      firstName: 'Ana',
      firstSurname: 'García',
    })
    expect((draft as { companyName?: string }).companyName).toBeUndefined()
  })

  it('resolves the portal email with contactEmail precedence over corporateEmail', () => {
    const draft = buildImportDraftFromOdooPartner(
      partnerOption({
        contactEmail: 'contact@example.com',
        corporateEmail: 'corp@example.com',
      }),
      'person'
    )

    expect(draft.email).toBe('contact@example.com')
  })
})
