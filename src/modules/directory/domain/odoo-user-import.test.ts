import { describe, expect, it } from 'vitest'

import {
  buildImportDraftFromOdooUser,
  mapOdooUserRowToImportOption,
  type OdooUserRow,
} from '@/src/modules/directory/domain/odoo-user-import'

function userRow(overrides: Partial<OdooUserRow> = {}): OdooUserRow {
  return {
    id: 1,
    name: 'Ana García',
    ...overrides,
  }
}

describe('mapOdooUserRowToImportOption', () => {
  it('uses row.email when present', () => {
    const option = mapOdooUserRowToImportOption(
      userRow({ email: 'ana@example.com', login: 'ana-login@example.com' })
    )

    expect(option.email).toBe('ana@example.com')
  })

  it('falls back to row.login ONLY when row.email is missing/false', () => {
    const option = mapOdooUserRowToImportOption(
      userRow({ email: false, login: 'ana-login@example.com' })
    )

    expect(option.email).toBe('ana-login@example.com')
  })

  it('leaves email undefined when both email and login are missing', () => {
    const option = mapOdooUserRowToImportOption(userRow({ email: undefined, login: undefined }))

    expect(option.email).toBeUndefined()
  })

  it('falls back to "Sin nombre" for a blank/false name', () => {
    const option = mapOdooUserRowToImportOption(
      userRow({ name: false as unknown as string })
    )

    expect(option.label).toBe('Sin nombre')
  })

  it('stringifies the numeric id into odooUserId', () => {
    const option = mapOdooUserRowToImportOption(userRow({ id: 42 }))

    expect(option.odooUserId).toBe('42')
  })
})

describe('buildImportDraftFromOdooUser', () => {
  it('splits the label into name parts using the given split mode', () => {
    const draft = buildImportDraftFromOdooUser(
      {
        id: 1,
        label: 'García Ana',
        odooUserId: '1',
      },
      'surname-first'
    )

    expect(draft).toMatchObject({ firstName: 'Ana', firstSurname: 'García' })
  })

  it('defaults email to an empty string (never undefined) when the user option has none', () => {
    const draft = buildImportDraftFromOdooUser({
      id: 1,
      label: 'Ana García',
      odooUserId: '1',
    })

    expect(draft.email).toBe('')
  })

  it('passes phone and odooUserId through untouched', () => {
    const draft = buildImportDraftFromOdooUser({
      id: 1,
      label: 'Ana García',
      phone: '600000000',
      odooUserId: '7',
    })

    expect(draft.phone).toBe('600000000')
    expect(draft.odooUserId).toBe('7')
  })
})
