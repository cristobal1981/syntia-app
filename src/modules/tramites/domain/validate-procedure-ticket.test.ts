import { describe, expect, it } from 'vitest'

import type { TrabajadorAltaPayload } from '@/src/modules/tramites/domain/procedure-ticket-types'
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
