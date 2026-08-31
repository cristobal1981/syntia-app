import { describe, expect, it } from 'vitest'

import {
  buildAltaTrabajadorPayload,
  deriveWorkDaysFromTelework,
  showsContractEndDate,
  showsDerivedWorkDays,
  showsTeleworkScheduleSplit,
} from '@/src/modules/alta-trabajador/domain/build-alta-trabajador-payload'
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

describe('buildAltaTrabajadorPayload — base fields', () => {
  it('always includes the base fields regardless of contract/telework state', () => {
    const payload = buildAltaTrabajadorPayload(validFormValues())
    expect(payload).toMatchObject({
      type: 'alta-trabajador',
      firstName: 'Ana',
      lastName: 'García',
      fullName: 'Ana García',
      dni: '12345678Z',
      contractType: 'indefinido',
      isTelework: 'no',
      salaryType: 'convenio',
      workSchedule: 'completa',
      requiresWorkAuthorization: 'no',
    })
  })

  it('omits every conditional field for a minimal indefinido / sin teletrabajo payload', () => {
    const payload = buildAltaTrabajadorPayload(validFormValues())
    expect(payload).not.toHaveProperty('temporaryReason')
    expect(payload).not.toHaveProperty('trainingType')
    expect(payload).not.toHaveProperty('otherContractReason')
    expect(payload).not.toHaveProperty('contractEndDate')
    expect(payload).not.toHaveProperty('teleworkAddressStreet')
    expect(payload).not.toHaveProperty('teleworkDaysRemote')
    expect(payload).not.toHaveProperty('grossSalary')
    expect(payload).not.toHaveProperty('partialWeeklyHours')
    expect(payload).not.toHaveProperty('identityDocument')
  })

  it('trims observations', () => {
    const payload = buildAltaTrabajadorPayload(validFormValues({ observations: '  hola  ' }))
    expect(payload.observations).toBe('hola')
  })
})

describe('buildAltaTrabajadorPayload — árbol de contrato temporal', () => {
  it('incremento_tareas includes causes, duration reason and end date (when filled)', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        contractType: 'temporal',
        temporaryReason: 'incremento_tareas',
        temporaryIncreaseCauses: 'Pico de pedidos',
        temporaryDurationReason: 'Dura 3 meses',
        contractEndDate: '2099-06-01',
      })
    )
    expect(payload).toMatchObject({
      temporaryReason: 'incremento_tareas',
      temporaryIncreaseCauses: 'Pico de pedidos',
      temporaryDurationReason: 'Dura 3 meses',
      contractEndDate: '2099-06-01',
    })
    expect(payload).not.toHaveProperty('vacationSubstitutionDetails')
    expect(payload).not.toHaveProperty('employeeToSubstitute')
  })

  it('omits contractEndDate when the field is left blank even though the reason requires it', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        contractType: 'temporal',
        temporaryReason: 'incremento_tareas',
        contractEndDate: '   ',
      })
    )
    expect(payload).not.toHaveProperty('contractEndDate')
  })

  it('sustitucion_vacaciones includes only vacation substitution details, no end date', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        contractType: 'temporal',
        temporaryReason: 'sustitucion_vacaciones',
        vacationSubstitutionDetails: 'Cubre a Juan en agosto',
        contractEndDate: '2099-06-01',
      })
    )
    expect(payload.vacationSubstitutionDetails).toBe('Cubre a Juan en agosto')
    expect(payload).not.toHaveProperty('temporaryIncreaseCauses')
    expect(payload).not.toHaveProperty('contractEndDate')
  })

  it.each(['sustitucion_it', 'sustitucion_paternidad_maternidad'])(
    '%s includes employeeToSubstitute, no end date',
    (reason) => {
      const payload = buildAltaTrabajadorPayload(
        validFormValues({
          contractType: 'temporal',
          temporaryReason: reason,
          employeeToSubstitute: 'María Pérez',
          contractEndDate: '2099-06-01',
        })
      )
      expect(payload.employeeToSubstitute).toBe('María Pérez')
      expect(payload).not.toHaveProperty('contractEndDate')
    }
  )

  it('otras_causas includes the detail and an end date', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        contractType: 'temporal',
        temporaryReason: 'otras_causas',
        otherTemporaryReasonDetail: 'Cobertura excepcional',
        contractEndDate: '2099-06-01',
      })
    )
    expect(payload.otherTemporaryReasonDetail).toBe('Cobertura excepcional')
    expect(payload.contractEndDate).toBe('2099-06-01')
  })
})

describe('buildAltaTrabajadorPayload — formación y otros', () => {
  it('formación always includes trainingType/trainingHasScholarship and the end date', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        contractType: 'formacion',
        trainingType: 'practicas_curriculares',
        trainingHasScholarship: 'no',
        contractEndDate: '2099-06-01',
      })
    )
    expect(payload).toMatchObject({
      trainingType: 'practicas_curriculares',
      trainingHasScholarship: 'no',
      contractEndDate: '2099-06-01',
    })
    expect(payload).not.toHaveProperty('trainingScholarshipAmount')
  })

  it('formación includes the scholarship amount/payer only when trainingHasScholarship is si', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        contractType: 'formacion',
        trainingType: 'practicas_curriculares',
        trainingHasScholarship: 'si',
        trainingScholarshipAmount: '400',
        trainingScholarshipPayer: 'Universidad',
        contractEndDate: '2099-06-01',
      })
    )
    expect(payload).toMatchObject({
      trainingScholarshipAmount: '400',
      trainingScholarshipPayer: 'Universidad',
    })
  })

  it('otros includes the reason and an end date', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        contractType: 'otros',
        otherContractReason: 'Convenio especial',
        contractEndDate: '2099-06-01',
      })
    )
    expect(payload.otherContractReason).toBe('Convenio especial')
    expect(payload.contractEndDate).toBe('2099-06-01')
  })

  it('never leaks a stale contractEndDate for indefinido even if the field still holds a value', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({ contractType: 'indefinido', contractEndDate: '2099-06-01' })
    )
    expect(payload).not.toHaveProperty('contractEndDate')
  })
})

describe('buildAltaTrabajadorPayload — teletrabajo', () => {
  const teleworkBase = {
    isTelework: 'si',
    teleworkAddressStreet: 'Calle Sol',
    teleworkAddressNumber: '2',
    teleworkAddressCity: 'Madrid',
    teleworkAddressProvince: 'Madrid',
    teleworkAddressPostalCode: '28002',
    teleworkEquipment: 'Portátil y monitor',
    teleworkAmountAgreed: 'El habitual',
  } as const

  it('includes the telework block only when isTelework is si', () => {
    const payload = buildAltaTrabajadorPayload(validFormValues({ isTelework: 'no' }))
    expect(payload).not.toHaveProperty('teleworkAddressStreet')
    expect(payload).not.toHaveProperty('teleworkEquipment')
  })

  it('full-time telework omits the per-day split fields', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        ...teleworkBase,
        teleworkFullTime: 'si',
        teleworkDaysRemote: 'lunes',
        teleworkDaysOnsite: 'martes',
      })
    )
    expect(payload).toMatchObject({ teleworkAddressStreet: 'Calle Sol', teleworkFullTime: 'si' })
    expect(payload).not.toHaveProperty('teleworkDaysRemote')
    expect(payload).not.toHaveProperty('teleworkDaysOnsite')
  })

  it('split telework includes the per-day fields', () => {
    const payload = buildAltaTrabajadorPayload(
      validFormValues({
        ...teleworkBase,
        teleworkFullTime: 'no',
        teleworkDaysRemote: 'lunes,martes',
        teleworkDaysOnsite: 'miercoles',
      })
    )
    expect(payload).toMatchObject({
      teleworkDaysRemote: 'lunes,martes',
      teleworkDaysOnsite: 'miercoles',
    })
  })
})

describe('showsContractEndDate', () => {
  it.each([
    ['indefinido', '', false],
    ['temporal', 'incremento_tareas', true],
    ['temporal', 'otras_causas', true],
    ['temporal', 'sustitucion_vacaciones', false],
    ['temporal', 'sustitucion_it', false],
    ['formacion', '', true],
    ['otros', '', true],
  ])('contractType=%s temporaryReason=%s -> %s', (contractType, temporaryReason, expected) => {
    expect(
      showsContractEndDate(validFormValues({ contractType, temporaryReason }))
    ).toBe(expected)
  })
})

describe('showsTeleworkScheduleSplit', () => {
  it('is true only when telework is active and not full-time', () => {
    expect(
      showsTeleworkScheduleSplit(validFormValues({ isTelework: 'si', teleworkFullTime: 'no' }))
    ).toBe(true)
    expect(
      showsTeleworkScheduleSplit(validFormValues({ isTelework: 'si', teleworkFullTime: 'si' }))
    ).toBe(false)
    expect(
      showsTeleworkScheduleSplit(validFormValues({ isTelework: 'no', teleworkFullTime: 'no' }))
    ).toBe(false)
  })
})

describe('showsDerivedWorkDays / deriveWorkDaysFromTelework', () => {
  it('derives days only when the telework schedule is split', () => {
    expect(
      showsDerivedWorkDays(validFormValues({ isTelework: 'si', teleworkFullTime: 'no' }))
    ).toBe(true)
    expect(
      showsDerivedWorkDays(validFormValues({ isTelework: 'si', teleworkFullTime: 'si' }))
    ).toBe(false)
  })

  it('unions remote/onsite days into canonical weekday order, deduped', () => {
    const values = validFormValues({
      teleworkDaysRemote: 'martes,lunes',
      teleworkDaysOnsite: 'lunes,miercoles',
    })
    expect(deriveWorkDaysFromTelework(values)).toBe('lunes,martes,miercoles')
  })
})

describe('buildAltaTrabajadorPayload — retribución y horario', () => {
  it('includes grossSalary only when salaryType is pactado', () => {
    expect(
      buildAltaTrabajadorPayload(validFormValues({ salaryType: 'convenio' }))
    ).not.toHaveProperty('grossSalary')
    expect(
      buildAltaTrabajadorPayload(validFormValues({ salaryType: 'pactado', grossSalary: '24000' }))
    ).toMatchObject({ grossSalary: '24000' })
  })

  it('includes partialWeeklyHours only when workSchedule is parcial and the value is non-blank', () => {
    expect(
      buildAltaTrabajadorPayload(validFormValues({ workSchedule: 'completa' }))
    ).not.toHaveProperty('partialWeeklyHours')
    expect(
      buildAltaTrabajadorPayload(
        validFormValues({ workSchedule: 'parcial', partialWeeklyHours: '   ' })
      )
    ).not.toHaveProperty('partialWeeklyHours')
    expect(
      buildAltaTrabajadorPayload(
        validFormValues({ workSchedule: 'parcial', partialWeeklyHours: '20' })
      )
    ).toMatchObject({ partialWeeklyHours: '20' })
  })
})

describe('buildAltaTrabajadorPayload — documentación', () => {
  const attachment = { name: 'dni.pdf', mimetype: 'application/pdf', dataBase64: 'AA==' }

  it('includes the identity document only when authorization is required AND an attachment is given', () => {
    expect(
      buildAltaTrabajadorPayload(validFormValues({ requiresWorkAuthorization: 'si' }))
    ).not.toHaveProperty('identityDocument')
    expect(
      buildAltaTrabajadorPayload(
        validFormValues({ requiresWorkAuthorization: 'no' }),
        attachment
      )
    ).not.toHaveProperty('identityDocument')
    expect(
      buildAltaTrabajadorPayload(
        validFormValues({ requiresWorkAuthorization: 'si' }),
        attachment
      )
    ).toMatchObject({ identityDocument: attachment })
  })
})
