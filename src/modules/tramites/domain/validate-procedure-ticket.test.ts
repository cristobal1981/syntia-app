import { describe, expect, it } from 'vitest'

import type {
  ProcedureTicketPayload,
  TrabajadorAltaPayload,
} from '@/src/modules/tramites/domain/procedure-ticket-types'
import {
  normalizeProcedureTicketPayload,
  validateProcedureTicketPayload,
} from '@/src/modules/tramites/domain/validate-procedure-ticket'

function validAltaTrabajadorPayload(
  overrides: Partial<TrabajadorAltaPayload> = {}
): TrabajadorAltaPayload {
  return {
    type: 'alta-trabajador',
    firstName: 'Ana',
    lastName: 'García',
    fullName: 'Ana García',
    dni: '12345678Z',
    naf: '',
    email: '',
    phone: '',
    iban: '',

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
    workScheduleNotes: '',

    observations: '',
    requiresWorkAuthorization: 'no',
    ...overrides,
  }
}

describe('validateProcedureTicketPayload — alta-trabajador', () => {
  it('accepts a minimal valid payload (indefinido, sin teletrabajo, jornada completa)', () => {
    const errors = validateProcedureTicketPayload(validAltaTrabajadorPayload())
    expect(errors).toEqual({})
  })

  it('requires firstName and lastName separately', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({ firstName: '', lastName: '' })
    )
    expect(errors.firstName).toBe('firstNameRequired')
    expect(errors.lastName).toBe('lastNameRequired')
  })

  it('rejects an invalid DNI/NIE', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({ dni: 'not-a-dni' })
    )
    expect(errors.dni).toBe('dniInvalid')
  })

  it('treats email/phone/iban as optional but validates format when present', () => {
    expect(validateProcedureTicketPayload(validAltaTrabajadorPayload()).email).toBeUndefined()

    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ email: 'not-an-email' })).email
    ).toBe('emailInvalid')

    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ phone: '123' })).phone
    ).toBe('phoneInvalid')

    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ iban: 'ES0000000000000000000000' }))
        .iban
    ).toBe('ibanInvalid')

    expect(
      validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ iban: 'ES9121000418450200051332' })
      ).iban
    ).toBeUndefined()
  })

  it('requires birthDate and every domicilio subfield, validating the postal code format', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({
        birthDate: '',
        addressStreet: '',
        addressNumber: '',
        addressCity: '',
        addressProvince: '',
        addressPostalCode: 'ABCDE',
      })
    )
    expect(errors.birthDate).toBe('dateRequired')
    expect(errors.addressStreet).toBe('requiredField')
    expect(errors.addressNumber).toBe('requiredField')
    expect(errors.addressCity).toBe('requiredField')
    expect(errors.addressProvince).toBe('requiredField')
    expect(errors.addressPostalCode).toBe('postalCodeInvalid')
  })

  it('rejects a fecha de alta anterior a hoy', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({ startDate: '2000-01-01' })
    )
    expect(errors.startDate).toBe('dateInPast')
  })

  it('requires workCenter, jobDuties, sepeOccupationCode and studiesLevel', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({
        workCenter: '',
        jobDuties: '',
        sepeOccupationCode: '',
        studiesLevel: '',
      })
    )
    expect(errors.workCenter).toBe('requiredField')
    expect(errors.jobDuties).toBe('requiredField')
    expect(errors.sepeOccupationCode).toBe('selectRequired')
    expect(errors.studiesLevel).toBe('selectRequired')
  })

  describe('contrato temporal', () => {
    it('requires a temporaryReason', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ contractType: 'temporal' })
      )
      expect(errors.temporaryReason).toBe('selectRequired')
    })

    it('incremento_tareas requires causes, duration reason and end date', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'temporal',
          temporaryReason: 'incremento_tareas',
        })
      )
      expect(errors.temporaryIncreaseCauses).toBe('requiredField')
      expect(errors.temporaryDurationReason).toBe('requiredField')
      expect(errors.contractEndDate).toBe('dateRequired')
    })

    it('incremento_tareas passes once all its fields are filled', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'temporal',
          temporaryReason: 'incremento_tareas',
          temporaryIncreaseCauses: 'Pico de pedidos en campaña',
          temporaryDurationReason: 'Se estima que dura 3 meses',
          contractEndDate: '2099-06-01',
        })
      )
      expect(errors).toEqual({})
    })

    it('sustitucion_vacaciones requires substitution details', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'temporal',
          temporaryReason: 'sustitucion_vacaciones',
        })
      )
      expect(errors.vacationSubstitutionDetails).toBe('requiredField')
      expect(errors.contractEndDate).toBeUndefined()
    })

    it('sustitucion_it and sustitucion_paternidad_maternidad require the employee to substitute', () => {
      for (const reason of ['sustitucion_it', 'sustitucion_paternidad_maternidad']) {
        const errors = validateProcedureTicketPayload(
          validAltaTrabajadorPayload({ contractType: 'temporal', temporaryReason: reason })
        )
        expect(errors.employeeToSubstitute).toBe('requiredField')
      }
    })

    it('otras_causas requires a detail and an end date', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'temporal',
          temporaryReason: 'otras_causas',
        })
      )
      expect(errors.otherTemporaryReasonDetail).toBe('requiredField')
      expect(errors.contractEndDate).toBe('dateRequired')
    })
  })

  describe('contrato de formación', () => {
    it('requires trainingType, trainingHasScholarship and an end date', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ contractType: 'formacion' })
      )
      expect(errors.trainingType).toBe('selectRequired')
      expect(errors.trainingHasScholarship).toBe('selectRequired')
      expect(errors.contractEndDate).toBe('dateRequired')
    })

    it('requires amount and payer only when there is a scholarship', () => {
      const withoutScholarship = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'formacion',
          trainingType: 'practicas_curriculares',
          trainingHasScholarship: 'no',
          contractEndDate: '2099-06-01',
        })
      )
      expect(withoutScholarship).toEqual({})

      const withScholarship = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'formacion',
          trainingType: 'practicas_curriculares',
          trainingHasScholarship: 'si',
          contractEndDate: '2099-06-01',
        })
      )
      expect(withScholarship.trainingScholarshipAmount).toBe('requiredField')
      expect(withScholarship.trainingScholarshipPayer).toBe('requiredField')

      const invalidAmount = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'formacion',
          trainingType: 'practicas_curriculares',
          trainingHasScholarship: 'si',
          trainingScholarshipAmount: 'no-numérico',
          trainingScholarshipPayer: 'Universidad',
          contractEndDate: '2099-06-01',
        })
      )
      expect(invalidAmount.trainingScholarshipAmount).toBe('amountInvalid')
    })
  })

  describe('contrato otros', () => {
    it('requires a reason and an end date', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ contractType: 'otros' })
      )
      expect(errors.otherContractReason).toBe('requiredField')
      expect(errors.contractEndDate).toBe('dateRequired')
    })
  })

  describe('teletrabajo', () => {
    it('requires address, equipment, amount and fullTime when isTelework is si', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ isTelework: 'si' })
      )
      expect(errors.teleworkAddressStreet).toBe('requiredField')
      expect(errors.teleworkEquipment).toBe('requiredField')
      expect(errors.teleworkAmountAgreed).toBe('requiredField')
      expect(errors.teleworkFullTime).toBe('selectRequired')
    })

    it('requires remote/onsite days only when teleworkFullTime is no', () => {
      const fullTimeErrors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          isTelework: 'si',
          teleworkAddressStreet: 'Calle Sol',
          teleworkAddressNumber: '2',
          teleworkAddressCity: 'Madrid',
          teleworkAddressProvince: 'Madrid',
          teleworkAddressPostalCode: '28002',
          teleworkEquipment: 'Portátil y monitor',
          teleworkAmountAgreed: 'El habitual',
          teleworkFullTime: 'si',
        })
      )
      expect(fullTimeErrors).toEqual({})

      const partialErrors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
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
      )
      expect(partialErrors.teleworkDaysRemote).toBe('requiredField')
      expect(partialErrors.teleworkDaysOnsite).toBe('requiredField')
    })

    it('rejects a day assigned to both remote and onsite work', () => {
      const base = {
        isTelework: 'si',
        teleworkAddressStreet: 'Calle Sol',
        teleworkAddressNumber: '2',
        teleworkAddressCity: 'Madrid',
        teleworkAddressProvince: 'Madrid',
        teleworkAddressPostalCode: '28002',
        teleworkEquipment: 'Portátil y monitor',
        teleworkAmountAgreed: 'El habitual',
        teleworkFullTime: 'no',
      } as const

      const overlapping = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          ...base,
          teleworkDaysRemote: 'lunes,martes',
          teleworkDaysOnsite: 'martes,miercoles',
        })
      )
      expect(overlapping.teleworkDaysOnsite).toBe('daysOverlap')

      const disjoint = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          ...base,
          teleworkDaysRemote: 'lunes,martes',
          teleworkDaysOnsite: 'miercoles,jueves',
        })
      )
      expect(disjoint.teleworkDaysOnsite).toBeUndefined()
    })
  })

  describe('retribución y horario', () => {
    it('requires grossSalary only when salaryType is pactado', () => {
      expect(validateProcedureTicketPayload(validAltaTrabajadorPayload()).grossSalary).toBe(
        undefined
      )

      const missing = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ salaryType: 'pactado' })
      )
      expect(missing.grossSalary).toBe('grossSalaryRequired')

      const invalid = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ salaryType: 'pactado', grossSalary: 'no-numérico' })
      )
      expect(invalid.grossSalary).toBe('grossSalaryInvalid')

      const valid = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ salaryType: 'pactado', grossSalary: '24000' })
      )
      expect(valid.grossSalary).toBeUndefined()
    })

    it('requires partialWeeklyHours only when workSchedule is parcial', () => {
      const missing = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ workSchedule: 'parcial' })
      )
      expect(missing.partialWeeklyHours).toBe('daysRequired')

      const invalid = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ workSchedule: 'parcial', partialWeeklyHours: 'x' })
      )
      expect(invalid.partialWeeklyHours).toBe('daysInvalid')
    })

    it('requires at least one work day', () => {
      const errors = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ workDays: '' })
      )
      expect(errors.workDays).toBe('selectRequired')
    })
  })

  describe('documentación', () => {
    it('requires the identity document only when work authorization is needed', () => {
      expect(
        validateProcedureTicketPayload(validAltaTrabajadorPayload()).identityDocument
      ).toBeUndefined()

      const missing = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ requiresWorkAuthorization: 'si' })
      )
      expect(missing.identityDocument).toBe('attachmentRequired')

      const provided = validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          requiresWorkAuthorization: 'si',
          identityDocument: { name: 'dni.pdf', mimetype: 'application/pdf', dataBase64: 'AA==' },
        })
      )
      expect(provided.identityDocument).toBeUndefined()
    })
  })
})

describe('normalizeProcedureTicketPayload — alta-trabajador', () => {
  it('composes fullName from firstName and lastName, trimming both', () => {
    const normalized = normalizeProcedureTicketPayload(
      validAltaTrabajadorPayload({ firstName: '  Ana  ', lastName: '  García López  ' })
    )
    expect(normalized).toMatchObject({ firstName: 'Ana', lastName: 'García López', fullName: 'Ana García López' })
  })

  it('normalizes a present IBAN to uppercase without spaces', () => {
    const normalized = normalizeProcedureTicketPayload(
      validAltaTrabajadorPayload({ iban: 'es91 2100 0418 4502 0005 1332' })
    )
    expect(normalized).toMatchObject({ iban: 'ES9121000418450200051332' })
  })
})

function localIso(offsetDays: number): string {
  const d = new Date()
  d.setDate(d.getDate() + offsetDays)
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${d.getFullYear()}-${m}-${day}`
}

type Baja = Extract<ProcedureTicketPayload, { type: 'baja-trabajador' }>
type Carta = Extract<ProcedureTicketPayload, { type: 'carta-vacaciones' }>

function baja(overrides: Partial<Baja> = {}): Baja {
  return {
    type: 'baja-trabajador',
    fullName: 'Ana García',
    dni: '12345678Z',
    endDate: '2099-01-01',
    reason: 'fin_contrato',
    observations: '',
    ...overrides,
  }
}

function carta(overrides: Partial<Carta> = {}): Carta {
  return {
    type: 'carta-vacaciones',
    fullName: 'Ana García',
    dni: '12345678Z',
    periodStart: '2099-08-01',
    periodEnd: '2099-08-15',
    days: '10',
    vacationYear: '2099',
    observations: '',
    ...overrides,
  }
}

describe('validateProcedureTicketPayload — campos comunes (baja/carta)', () => {
  it('payloads válidos no dan errores', () => {
    expect(validateProcedureTicketPayload(baja())).toEqual({})
    expect(validateProcedureTicketPayload(carta())).toEqual({})
  })

  it('fullName obligatorio (solo espacios cuenta como vacío)', () => {
    expect(validateProcedureTicketPayload(baja({ fullName: '   ' })).fullName).toBe(
      'fullNameRequired'
    )
  })

  it('fullName: 120 caracteres pasa, 121 falla con fullNameTooLong', () => {
    expect(validateProcedureTicketPayload(baja({ fullName: 'a'.repeat(120) })).fullName).toBeUndefined()
    expect(validateProcedureTicketPayload(baja({ fullName: 'a'.repeat(121) })).fullName).toBe(
      'fullNameTooLong'
    )
  })

  it('alta-trabajador no exige fullName combinado (usa firstName/lastName)', () => {
    const errors = validateProcedureTicketPayload(validAltaTrabajadorPayload({ fullName: '' }))
    expect(errors.fullName).toBeUndefined()
  })

  it('dni vacío es dniRequired y no dniInvalid', () => {
    expect(validateProcedureTicketPayload(baja({ dni: '  ' })).dni).toBe('dniRequired')
  })

  it('DNI: acepta NIE con espacios/minúsculas, rechaza longitudes y formatos erróneos', () => {
    expect(validateProcedureTicketPayload(baja({ dni: 'x1234567l' })).dni).toBeUndefined()
    expect(validateProcedureTicketPayload(baja({ dni: ' 1234 5678 z ' })).dni).toBeUndefined()
    for (const dni of ['1234567Z', '123456789Z', '12345678', 'A2345678Z', 'X123456Z', 'XX234567Z']) {
      expect(validateProcedureTicketPayload(baja({ dni })).dni).toBe('dniInvalid')
    }
  })

  it('observations: 500 pasa, 501 falla (baja y carta)', () => {
    expect(
      validateProcedureTicketPayload(baja({ observations: 'a'.repeat(500) })).observations
    ).toBeUndefined()
    expect(validateProcedureTicketPayload(baja({ observations: 'a'.repeat(501) })).observations).toBe(
      'observationsTooLong'
    )
    expect(validateProcedureTicketPayload(carta({ observations: 'a'.repeat(501) })).observations).toBe(
      'observationsTooLong'
    )
  })
})

describe('validateProcedureTicketPayload — baja-trabajador', () => {
  it('endDate obligatoria, imposible o válida', () => {
    expect(validateProcedureTicketPayload(baja({ endDate: '' })).endDate).toBe('dateRequired')
    expect(validateProcedureTicketPayload(baja({ endDate: '2026-02-31' })).endDate).toBe(
      'dateInvalid'
    )
    expect(validateProcedureTicketPayload(baja({ endDate: '01/02/2026' })).endDate).toBe(
      'dateInvalid'
    )
  })

  it('reason obligatorio', () => {
    expect(validateProcedureTicketPayload(baja({ reason: ' ' })).reason).toBe('selectRequired')
  })

  it('no valida campos de carta-vacaciones', () => {
    const errors = validateProcedureTicketPayload(baja())
    expect(errors.days).toBeUndefined()
    expect(errors.periodStart).toBeUndefined()
  })
})

describe('validateProcedureTicketPayload — carta-vacaciones', () => {
  it('periodStart/periodEnd obligatorios', () => {
    const errors = validateProcedureTicketPayload(carta({ periodStart: '', periodEnd: '' }))
    expect(errors.periodStart).toBe('dateRequired')
    expect(errors.periodEnd).toBe('dateRequired')
  })

  it('fecha imposible es dateInvalid', () => {
    expect(validateProcedureTicketPayload(carta({ periodStart: '2099-02-30' })).periodStart).toBe(
      'dateInvalid'
    )
  })

  it('periodEnd anterior a periodStart: periodEndBeforeStart; igual es válido', () => {
    expect(
      validateProcedureTicketPayload(carta({ periodStart: '2099-08-10', periodEnd: '2099-08-09' }))
        .periodEnd
    ).toBe('periodEndBeforeStart')
    expect(
      validateProcedureTicketPayload(carta({ periodStart: '2099-08-10', periodEnd: '2099-08-10' }))
        .periodEnd
    ).toBeUndefined()
  })

  it('periodEnd antes de un start inválido no pisa el error de fecha inválida', () => {
    const errors = validateProcedureTicketPayload(
      carta({ periodStart: '2099-02-31', periodEnd: '2099-01-01' })
    )
    expect(errors.periodStart).toBe('dateInvalid')
    expect(errors.periodEnd).toBeUndefined()
  })

  it('days: vacío requerido; 0, 4 dígitos, decimales y texto inválidos; 1 y 999 válidos', () => {
    expect(validateProcedureTicketPayload(carta({ days: ' ' })).days).toBe('daysRequired')
    for (const days of ['0', '1000', '1,5', 'x', '-3']) {
      expect(validateProcedureTicketPayload(carta({ days })).days).toBe('daysInvalid')
    }
    expect(validateProcedureTicketPayload(carta({ days: '1' })).days).toBeUndefined()
    expect(validateProcedureTicketPayload(carta({ days: '999' })).days).toBeUndefined()
  })

  it('vacationYear: vacío requerido; 3 o 5 dígitos inválidos; 4 válido', () => {
    expect(validateProcedureTicketPayload(carta({ vacationYear: '' })).vacationYear).toBe(
      'vacationYearRequired'
    )
    for (const vacationYear of ['202', '20266', 'abcd']) {
      expect(validateProcedureTicketPayload(carta({ vacationYear })).vacationYear).toBe(
        'vacationYearInvalid'
      )
    }
    expect(validateProcedureTicketPayload(carta({ vacationYear: '2026' })).vacationYear).toBeUndefined()
  })
})

describe('validateProcedureTicketPayload — alta-trabajador, bordes', () => {
  it('firstName/lastName: 120 pasa, 121 falla con su propia clave', () => {
    const ok = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({ firstName: 'a'.repeat(120), lastName: 'b'.repeat(120) })
    )
    expect(ok.firstName).toBeUndefined()
    expect(ok.lastName).toBeUndefined()
    const bad = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({ firstName: 'a'.repeat(121), lastName: 'b'.repeat(121) })
    )
    expect(bad.firstName).toBe('firstNameTooLong')
    expect(bad.lastName).toBe('lastNameTooLong')
  })

  it('firstName solo espacios es firstNameRequired (no TooLong)', () => {
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ firstName: '   ' })).firstName
    ).toBe('firstNameRequired')
  })

  it('startDate: hoy es válido, ayer es dateInPast, mañana válido', () => {
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ startDate: localIso(0) }))
        .startDate
    ).toBeUndefined()
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ startDate: localIso(-1) }))
        .startDate
    ).toBe('dateInPast')
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ startDate: localIso(1) }))
        .startDate
    ).toBeUndefined()
  })

  it('startDate vacía o imposible no se reporta como dateInPast', () => {
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ startDate: '' })).startDate
    ).toBe('dateRequired')
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ startDate: '2000-02-31' }))
        .startDate
    ).toBe('dateInvalid')
  })

  it('birthDate imposible es dateInvalid', () => {
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ birthDate: '1990-02-30' }))
        .birthDate
    ).toBe('dateInvalid')
  })

  it('código postal: vacío requiredField, 4 y 6 dígitos inválidos, 5 válido', () => {
    const run = (addressPostalCode: string) =>
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ addressPostalCode }))
        .addressPostalCode
    expect(run('')).toBe('requiredField')
    expect(run('   ')).toBe('requiredField')
    expect(run('2800')).toBe('postalCodeInvalid')
    expect(run('280011')).toBe('postalCodeInvalid')
    expect(run('28001')).toBeUndefined()
  })

  it('email con espacios alrededor válido; vacío opcional; sin dominio inválido', () => {
    const run = (email: string) =>
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ email })).email
    expect(run('  ana@example.com ')).toBeUndefined()
    expect(run('ana@example')).toBe('emailInvalid')
  })

  it('phone: 8 dígitos válido, 7 inválido', () => {
    const run = (phone: string) =>
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ phone })).phone
    expect(run('12345678')).toBeUndefined()
    expect(run('1234567')).toBe('phoneInvalid')
  })

  it('iban con espacios y minúsculas válido; solo espacios es opcional (sin error)', () => {
    const run = (iban: string) =>
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ iban })).iban
    expect(run('es91 2100 0418 4502 0005 1332')).toBeUndefined()
    expect(run('   ')).toBeUndefined()
    expect(run('ES9121000418450200051333')).toBe('ibanInvalid')
  })

  it('position vacío usa positionRequired (no requiredField)', () => {
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ position: ' ' })).position
    ).toBe('positionRequired')
  })

  it('salario pactado: formato español válido/ambiguo', () => {
    const run = (grossSalary: string) =>
      validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ salaryType: 'pactado', grossSalary })
      ).grossSalary
    expect(run('1.500,50')).toBeUndefined()
    expect(run('1500,5')).toBeUndefined()
    expect(run('1.5')).toBe('grossSalaryInvalid')
    expect(run('0')).toBe('grossSalaryInvalid')
    expect(run('   ')).toBe('grossSalaryRequired')
  })

  it('salario no pactado: un grossSalary basura se ignora', () => {
    expect(
      validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ salaryType: 'convenio', grossSalary: 'basura' })
      ).grossSalary
    ).toBeUndefined()
  })

  it('horas parciales: 1 y 99 válidos; 0, 100 y 1,5 inválidos; jornada completa las ignora', () => {
    const run = (partialWeeklyHours: string, workSchedule = 'parcial') =>
      validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ workSchedule, partialWeeklyHours })
      ).partialWeeklyHours
    expect(run('1')).toBeUndefined()
    expect(run('99')).toBeUndefined()
    expect(run('0')).toBe('daysInvalid')
    expect(run('100')).toBe('daysInvalid')
    expect(run('1,5')).toBe('daysInvalid')
    expect(run('x', 'completa')).toBeUndefined()
  })

  it('beca: importe ambiguo 1.5 es amountInvalid; 1.500,50 válido', () => {
    const run = (trainingScholarshipAmount: string) =>
      validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'formacion',
          trainingType: 'x',
          trainingHasScholarship: 'si',
          trainingScholarshipAmount,
          trainingScholarshipPayer: 'Uni',
          contractEndDate: '2099-06-01',
        })
      ).trainingScholarshipAmount
    expect(run('1.5')).toBe('amountInvalid')
    expect(run('1.500,50')).toBeUndefined()
  })

  it('contractEndDate: obligatoria en incremento_tareas, imposible es dateInvalid; no en indefinido ni sustitucion_it', () => {
    const base = {
      contractType: 'temporal',
      temporaryReason: 'incremento_tareas',
      temporaryIncreaseCauses: 'x',
      temporaryDurationReason: 'y',
    }
    expect(
      validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ ...base, contractEndDate: '2099-02-31' })
      ).contractEndDate
    ).toBe('dateInvalid')
    expect(
      validateProcedureTicketPayload(
        validAltaTrabajadorPayload({
          contractType: 'temporal',
          temporaryReason: 'sustitucion_it',
          employeeToSubstitute: 'Luis',
        })
      )
    ).toEqual({})
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ contractEndDate: '' }))
        .contractEndDate
    ).toBeUndefined()
  })

  it('campos de un motivo temporal no se exigen con otro motivo ni con otro contrato', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({
        contractType: 'temporal',
        temporaryReason: 'sustitucion_vacaciones',
        vacationSubstitutionDetails: 'x',
      })
    )
    expect(errors).toEqual({})
    const indef = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({ contractType: 'indefinido', temporaryReason: 'otras_causas' })
    )
    expect(indef.otherTemporaryReasonDetail).toBeUndefined()
  })

  it('teletrabajo: con no, ninguna regla de teletrabajo se aplica', () => {
    const errors = validateProcedureTicketPayload(validAltaTrabajadorPayload({ isTelework: 'no' }))
    expect(errors.teleworkAddressStreet).toBeUndefined()
    expect(errors.teleworkEquipment).toBeUndefined()
    expect(errors.teleworkFullTime).toBeUndefined()
  })

  it('teletrabajo: código postal propio requiredField/postalCodeInvalid', () => {
    const run = (teleworkAddressPostalCode: string) =>
      validateProcedureTicketPayload(
        validAltaTrabajadorPayload({ isTelework: 'si', teleworkAddressPostalCode })
      ).teleworkAddressPostalCode
    expect(run('')).toBe('requiredField')
    expect(run('abc')).toBe('postalCodeInvalid')
    expect(run('28002')).toBeUndefined()
  })

  it('teletrabajo parcial: solape no se evalúa si falta un listado de días', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({
        isTelework: 'si',
        teleworkFullTime: 'no',
        teleworkDaysRemote: 'lunes',
        teleworkDaysOnsite: '',
      })
    )
    expect(errors.teleworkDaysOnsite).toBe('requiredField')
    expect(errors.teleworkDaysRemote).toBeUndefined()
  })

  it('teletrabajo jornada completa: días solapados no se validan', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({
        isTelework: 'si',
        teleworkFullTime: 'si',
        teleworkDaysRemote: 'lunes',
        teleworkDaysOnsite: 'lunes',
      })
    )
    expect(errors.teleworkDaysOnsite).toBeUndefined()
  })

  it('observations alta: 500 pasa, 501 falla', () => {
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ observations: 'a'.repeat(500) }))
        .observations
    ).toBeUndefined()
    expect(
      validateProcedureTicketPayload(validAltaTrabajadorPayload({ observations: 'a'.repeat(501) }))
        .observations
    ).toBe('observationsTooLong')
  })

  it('obligatorios de horario y selects: isTelework, salaryType, workSchedule, workHoursDescription, requiresWorkAuthorization, contractType', () => {
    const errors = validateProcedureTicketPayload(
      validAltaTrabajadorPayload({
        isTelework: '',
        salaryType: '',
        workSchedule: '',
        workHoursDescription: '',
        requiresWorkAuthorization: '',
        contractType: '',
      })
    )
    expect(errors.isTelework).toBe('selectRequired')
    expect(errors.salaryType).toBe('selectRequired')
    expect(errors.workSchedule).toBe('selectRequired')
    expect(errors.workHoursDescription).toBe('requiredField')
    expect(errors.requiresWorkAuthorization).toBe('selectRequired')
    expect(errors.contractType).toBe('selectRequired')
  })
})

describe('normalizeProcedureTicketPayload — resto', () => {
  it('baja: recorta y normaliza DNI, conserva type y no añade campos de otro tipo', () => {
    const n = normalizeProcedureTicketPayload(
      baja({ fullName: ' Ana ', dni: ' 1234 5678 z ', endDate: ' 2099-01-01 ', reason: ' x ', observations: ' o ' })
    )
    expect(n).toEqual({
      type: 'baja-trabajador',
      fullName: 'Ana',
      dni: '12345678Z',
      observations: 'o',
      endDate: '2099-01-01',
      reason: 'x',
    })
  })

  it('carta: recorta todos los campos', () => {
    const n = normalizeProcedureTicketPayload(
      carta({ periodStart: ' 2099-08-01 ', periodEnd: ' 2099-08-02 ', days: ' 3 ', vacationYear: ' 2099 ' })
    )
    expect(n).toMatchObject({
      type: 'carta-vacaciones',
      periodStart: '2099-08-01',
      periodEnd: '2099-08-02',
      days: '3',
      vacationYear: '2099',
    })
  })

  it('alta: DNI normalizado, opcionales vacíos pasan a undefined y IBAN vacío queda ""', () => {
    const n = normalizeProcedureTicketPayload(
      validAltaTrabajadorPayload({
        dni: ' x1234567l ',
        iban: '   ',
        temporaryReason: '   ',
        grossSalary: ' 1.500 ',
        contractEndDate: '',
        teleworkEquipment: ' PC ',
      })
    ) as TrabajadorAltaPayload
    expect(n.dni).toBe('X1234567L')
    expect(n.iban).toBe('')
    expect(n.temporaryReason).toBeUndefined()
    expect(n.contractEndDate).toBeUndefined()
    expect(n.grossSalary).toBe('1.500')
    expect(n.teleworkEquipment).toBe('PC')
  })

  it('alta: fullName con apellido vacío queda sin espacio final y se conserva identityDocument', () => {
    const doc = { name: 'd.pdf', mimetype: 'application/pdf', dataBase64: 'AA==' }
    const n = normalizeProcedureTicketPayload(
      validAltaTrabajadorPayload({ firstName: ' Ana ', lastName: ' ', identityDocument: doc })
    ) as TrabajadorAltaPayload
    expect(n.fullName).toBe('Ana')
    expect(n.identityDocument).toBe(doc)
  })
})
