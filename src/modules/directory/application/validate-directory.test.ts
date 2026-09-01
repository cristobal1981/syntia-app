import { describe, expect, it } from 'vitest'

import {
  validateClientForm,
  validateCompanyName,
  validateDriveFolderId,
  validateOdooPartnerId,
  validatePersonEmail,
  validatePersonFirstName,
  validatePersonFirstSurname,
  validatePersonNameParts,
  validatePersonSecondSurname,
} from '@/src/modules/directory/application/validate-directory'

describe('validatePersonFirstName', () => {
  it('requires a non-empty value', () => {
    expect(validatePersonFirstName('')).toBe('El nombre es obligatorio.')
    expect(validatePersonFirstName('   ')).toBe('El nombre es obligatorio.')
  })

  it('requires at least 2 characters (after trim)', () => {
    expect(validatePersonFirstName('A')).toBe(
      'El nombre debe tener al menos 2 caracteres.'
    )
    expect(validatePersonFirstName(' A ')).toBe(
      'El nombre debe tener al menos 2 caracteres.'
    )
  })

  it('accepts a valid name', () => {
    expect(validatePersonFirstName('Ana')).toBeUndefined()
  })
})

describe('validatePersonFirstSurname', () => {
  it('requires a non-empty value of at least 2 characters', () => {
    expect(validatePersonFirstSurname('')).toBe(
      'El primer apellido es obligatorio.'
    )
    expect(validatePersonFirstSurname('A')).toBe(
      'El primer apellido debe tener al menos 2 caracteres.'
    )
    expect(validatePersonFirstSurname('García')).toBeUndefined()
  })
})

describe('validatePersonSecondSurname (OPTIONAL — unlike the other two name fields)', () => {
  it('is valid when empty — does NOT require a value', () => {
    expect(validatePersonSecondSurname('')).toBeUndefined()
    expect(validatePersonSecondSurname('   ')).toBeUndefined()
  })

  it('still enforces the 2-character minimum WHEN a value is given', () => {
    expect(validatePersonSecondSurname('A')).toBe(
      'El segundo apellido debe tener al menos 2 caracteres.'
    )
    expect(validatePersonSecondSurname('Ruiz')).toBeUndefined()
  })
})

describe('validatePersonNameParts', () => {
  it('aggregates only the fields that actually failed', () => {
    const errors = validatePersonNameParts({
      firstName: '',
      firstSurname: 'García',
      secondSurname: '',
    })

    expect(errors).toEqual({ firstName: 'El nombre es obligatorio.' })
  })

  it('returns no errors when every part is valid, including an empty optional secondSurname', () => {
    const errors = validatePersonNameParts({
      firstName: 'Ana',
      firstSurname: 'García',
    })

    expect(errors).toEqual({})
  })
})

describe('validatePersonEmail', () => {
  it('requires a non-empty value', () => {
    expect(validatePersonEmail('')).toBe('El correo es obligatorio.')
  })

  it('rejects a value without an @ or a domain', () => {
    expect(validatePersonEmail('not-an-email')).toBe(
      'Introduce un correo válido.'
    )
    expect(validatePersonEmail('a@b')).toBe('Introduce un correo válido.')
  })

  it('accepts a well-formed email', () => {
    expect(validatePersonEmail('ana@example.com')).toBeUndefined()
  })
})

describe('validateOdooPartnerId (OPTIONAL — empty is valid)', () => {
  it('is valid when empty', () => {
    expect(validateOdooPartnerId('')).toBeUndefined()
  })

  it('rejects a non-numeric value', () => {
    expect(validateOdooPartnerId('abc')).toBe(
      'El ID de Odoo debe ser numérico.'
    )
    expect(validateOdooPartnerId('12a')).toBe(
      'El ID de Odoo debe ser numérico.'
    )
  })

  it('accepts a numeric value', () => {
    expect(validateOdooPartnerId('42')).toBeUndefined()
  })
})

describe('validateDriveFolderId (currently a no-op — never returns an error)', () => {
  it('never returns an error, for any input', () => {
    expect(validateDriveFolderId('')).toBeUndefined()
    expect(validateDriveFolderId('anything-goes')).toBeUndefined()
  })
})

describe('validateCompanyName', () => {
  it('requires a non-empty value of at least 2 characters', () => {
    expect(validateCompanyName('')).toBe('La razón social es obligatoria.')
    expect(validateCompanyName('A')).toBe(
      'La razón social debe tener al menos 2 caracteres.'
    )
    expect(validateCompanyName('Acme SL')).toBeUndefined()
  })
})

describe('validateClientForm (branches on clientKind)', () => {
  it('for clientKind="company": validates companyName and does NOT require firstName/firstSurname', () => {
    const errors = validateClientForm({
      clientKind: 'company',
      firstName: '',
      firstSurname: '',
      companyName: '',
      email: 'x@example.com',
    })

    expect(errors).toEqual({ companyName: 'La razón social es obligatoria.' })
  })

  it('for clientKind="person": validates firstName/firstSurname and does NOT require companyName', () => {
    const errors = validateClientForm({
      clientKind: 'person',
      firstName: '',
      firstSurname: 'García',
      companyName: '',
      email: 'x@example.com',
    })

    expect(errors).toEqual({ firstName: 'El nombre es obligatorio.' })
  })

  it('always validates email, odooPartnerId and driveFolderId REGARDLESS of clientKind', () => {
    const errors = validateClientForm({
      clientKind: 'company',
      firstName: '',
      firstSurname: '',
      companyName: 'Acme SL',
      email: 'not-an-email',
      odooPartnerId: 'abc',
    })

    expect(errors).toEqual({
      email: 'Introduce un correo válido.',
      odooPartnerId: 'El ID de Odoo debe ser numérico.',
    })
  })

  it('returns no errors for a fully valid company form', () => {
    const errors = validateClientForm({
      clientKind: 'company',
      firstName: '',
      firstSurname: '',
      companyName: 'Acme SL',
      email: 'x@example.com',
    })

    expect(errors).toEqual({})
  })

  it('returns no errors for a fully valid person form', () => {
    const errors = validateClientForm({
      clientKind: 'person',
      firstName: 'Ana',
      firstSurname: 'García',
      email: 'x@example.com',
    })

    expect(errors).toEqual({})
  })
})
