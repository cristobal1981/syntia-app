import { describe, expect, it } from 'vitest'

import { validateAltaTrabajadorStep } from '@/src/modules/alta-trabajador/domain/validate-alta-trabajador-step'
import {
  EMPTY_ALTA_TRABAJADOR_FORM,
  type AltaTrabajadorFormValues,
} from '@/src/modules/alta-trabajador/domain/alta-trabajador-form-types'

function validFormValues(
  overrides: Partial<AltaTrabajadorFormValues> = {}
): AltaTrabajadorFormValues {
  return {
    ...EMPTY_ALTA_TRABAJADOR_FORM,
    firstName: 'Ana',
    lastName: 'García',
    dni: '12345678Z',
    birthDate: '1990-01-01',
    addressStreet: 'Calle Mayor',
    addressNumber: '1',
    addressCity: 'Madrid',
    addressProvince: 'Madrid',
    addressPostalCode: '28001',
    startDate: '2099-01-01',
    workCenter: 'Oficina central',
    position: 'Administrativo',
    jobDuties: 'Atención al cliente',
    sepeOccupationCode: '4400',
    studiesLevel: '32',
    contractType: 'indefinido',
    isTelework: 'no',
    salaryType: 'convenio',
    workSchedule: 'completa',
    workDays: 'lunes',
    workHoursDescription: '9:00 a 17:00',
    requiresWorkAuthorization: 'no',
    ...overrides,
  }
}

describe('validateAltaTrabajadorStep — scoping per step', () => {
  it('only returns errors belonging to the requested step, even with failures on other steps', () => {
    const values = validFormValues({ firstName: '', workCenter: '' })

    const datosPersonales = validateAltaTrabajadorStep('datos-personales', values)
    expect(datosPersonales.firstName).toBe('firstNameRequired')
    expect(datosPersonales).not.toHaveProperty('workCenter')

    const puestoOcupacion = validateAltaTrabajadorStep('puesto-ocupacion', values)
    expect(puestoOcupacion.workCenter).toBe('requiredField')
    expect(puestoOcupacion).not.toHaveProperty('firstName')
  })

  it('returns an empty object for a step with no errors', () => {
    expect(validateAltaTrabajadorStep('datos-personales', validFormValues())).toEqual({})
  })

  it('resumen returns every error across all steps, unscoped', () => {
    const values = validFormValues({ firstName: '', workCenter: '' })
    const resumen = validateAltaTrabajadorStep('resumen', values)
    expect(resumen.firstName).toBe('firstNameRequired')
    expect(resumen.workCenter).toBe('requiredField')
  })
})

describe('validateAltaTrabajadorStep — contrato', () => {
  it('scopes conditional temporal-contract fields to the contrato step, not other steps', () => {
    const values = validFormValues({
      contractType: 'temporal',
      temporaryReason: 'incremento_tareas',
    })

    const contrato = validateAltaTrabajadorStep('contrato', values)
    expect(contrato.temporaryIncreaseCauses).toBe('requiredField')
    expect(contrato.temporaryDurationReason).toBe('requiredField')
    expect(contrato.contractEndDate).toBe('dateRequired')

    const teletrabajo = validateAltaTrabajadorStep('teletrabajo', values)
    expect(teletrabajo).not.toHaveProperty('temporaryIncreaseCauses')
    expect(teletrabajo).not.toHaveProperty('contractEndDate')
  })

  it('clears once every conditional field for the chosen reason is filled', () => {
    const values = validFormValues({
      contractType: 'temporal',
      temporaryReason: 'incremento_tareas',
      temporaryIncreaseCauses: 'Pico de pedidos',
      temporaryDurationReason: 'Dura 3 meses',
      contractEndDate: '2099-06-01',
    })
    expect(validateAltaTrabajadorStep('contrato', values)).toEqual({})
  })
})

describe('validateAltaTrabajadorStep — teletrabajo', () => {
  it('scopes the per-day split fields to the teletrabajo step, not retribucion-horario', () => {
    const values = validFormValues({
      isTelework: 'si',
      teleworkAddressStreet: 'Calle Sol',
      teleworkAddressNumber: '2',
      teleworkAddressCity: 'Madrid',
      teleworkAddressProvince: 'Madrid',
      teleworkAddressPostalCode: '28002',
      teleworkEquipment: 'Portátil y monitor',
      teleworkAmountAgreed: 'El habitual',
      teleworkFullTime: 'no',
    })

    const teletrabajo = validateAltaTrabajadorStep('teletrabajo', values)
    expect(teletrabajo.teleworkDaysRemote).toBe('requiredField')
    expect(teletrabajo.teleworkDaysOnsite).toBe('requiredField')

    const retribucion = validateAltaTrabajadorStep('retribucion-horario', values)
    expect(retribucion).not.toHaveProperty('teleworkDaysRemote')
    expect(retribucion).not.toHaveProperty('teleworkDaysOnsite')
  })

  it('does not require telework fields when isTelework is no', () => {
    expect(validateAltaTrabajadorStep('teletrabajo', validFormValues({ isTelework: 'no' }))).toEqual(
      {}
    )
  })
})

describe('validateAltaTrabajadorStep — documentación', () => {
  it('requires the attachment on the documentacion step when work authorization is needed', () => {
    const values = validFormValues({ requiresWorkAuthorization: 'si' })
    expect(validateAltaTrabajadorStep('documentacion', values).identityDocument).toBe(
      'attachmentRequired'
    )
  })

  it('clears the requirement once an attachment is passed through', () => {
    const values = validFormValues({ requiresWorkAuthorization: 'si' })
    const attachment = { name: 'dni.pdf', mimetype: 'application/pdf', dataBase64: 'AA==' }
    expect(
      validateAltaTrabajadorStep('documentacion', values, attachment).identityDocument
    ).toBeUndefined()
  })
})
