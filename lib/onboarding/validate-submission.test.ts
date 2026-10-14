import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { validateAltaAutonomoSubmission } from '@/lib/onboarding/validate-submission'

const VALID = {
  nombre: ' Ana ',
  apellidos: 'Pérez Gil',
  nif: '12345678z',
  naf: '',
  fecha_nacimiento: '1990-01-01',
  telefono: '+34 666 666 666',
  email: 'Ana@Example.com',
  certificado_digital: 'si',
  ya_eres_autonomo: 'si',
  fecha_alta: '2024-01-01',
  fecha_empezar_con_nosotros: '2026-07-01',
  direccion: 'Calle 1',
  ciudad: 'Madrid',
  provincia: '28',
  codigo_postal: '28001',
  pais: '68',
  direccion_fiscal: 'Calle 1, Madrid',
  direccion_notificacion: 'Calle 1, Madrid',
  actividad: 'Fontanería',
  ingresos_anuales: 10000,
  iban: 'ES91 2100 0418 4502 0005 1332',
  privacidad: true,
}

function run(overrides: Record<string, unknown> = {}) {
  return validateAltaAutonomoSubmission({ ...VALID, ...overrides })
}

function errorsOf(overrides: Record<string, unknown>) {
  const r = run(overrides)
  return r.ok ? null : r.fieldErrors
}

beforeEach(() => {
  vi.resetAllMocks()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-06-15T12:00:00.000Z'))
})

afterEach(() => {
  vi.useRealTimers()
})

describe('validateAltaAutonomoSubmission - payload', () => {
  it.each([null, undefined, 'x', 5])('rechaza payload no objeto %s', (p) => {
    expect(validateAltaAutonomoSubmission(p)).toEqual({
      ok: false,
      fieldErrors: { _form: 'Solicitud invalida.' },
    })
  })

  it('acepta un payload válido y normaliza campos', () => {
    const r = run()
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.firstName).toBe('Ana')
      expect(r.data.nifNie).toBe('12345678Z')
      expect(r.data.phone).toBe('+34666666666')
      expect(r.data.email).toBe('ana@example.com')
      expect(r.data.iban).toBe('ES9121000418450200051332')
      expect(r.data.provinceId).toBe(28)
      expect(r.data.countryId).toBe(68)
      expect(r.data.naf).toBeUndefined()
      expect(r.data.isAlreadyAutonomo).toBe(true)
      expect(r.data.startedAutonomoAt).toBe('2024-01-01')
      expect(r.data.requestedAltaAt).toBeUndefined()
      expect(r.data.wasAutonomoLast3Years).toBeUndefined()
    }
  })
})

describe('edad 18-100', () => {
  it.each([
    ['cumple 18 hoy', '2008-06-15', true],
    ['17 años (cumple mañana)', '2008-06-16', false],
    ['17 años', '2009-01-01', false],
    ['18 años (cumplidos ayer)', '2008-06-14', true],
    ['100 años cumplidos hoy', '1926-06-15', true],
    ['100 años (cumple 101 mañana)', '1925-06-16', true],
    ['101 años hoy', '1925-06-15', false],
    ['101 años', '1920-01-01', false],
    ['fecha imposible', '1990-02-31', false],
    ['formato malo', '01/01/1990', false],
  ])('%s (%s)', (_l, date, ok) => {
    const errors = errorsOf({ fecha_nacimiento: date })
    expect(errors === null).toBe(ok)
    if (!ok) expect(errors?.fecha_nacimiento).toBeDefined()
  })

  it('vacía: mensaje de obligatoria', () => {
    expect(errorsOf({ fecha_nacimiento: '' })?.fecha_nacimiento).toBe(
      'La fecha de nacimiento es obligatoria.'
    )
  })
})

describe('NIF/NIE', () => {
  it.each([
    ['DNI correcto', '12345678Z', true],
    ['DNI minúscula con guion', '12345678-z', true],
    ['DNI con espacio', '1234 5678 Z', true],
    ['DNI 7 dígitos', '1234567L', true],
    ['NIE X correcto', 'X1234567L', true],
    ['NIE Y correcto', 'Y1234567X', true],
    ['NIE Z correcto', 'Z1234567R', true],
    ['DNI letra mal', '12345678A', false],
    ['NIE X letra mal', 'X1234567A', false],
    ['NIE Y letra mal', 'Y1234567L', false],
    ['NIE Z letra mal', 'Z1234567L', false],
    ['sin letra', '12345678', false],
    ['demasiado corto', '123456Z', false],
    ['prefijo W', 'W1234567L', false],
  ])('%s (%s)', (_l, nif, ok) => {
    const errors = errorsOf({ nif })
    expect(errors === null).toBe(ok)
    if (!ok) expect(errors?.nif).toBe('El NIF/NIE no es válido.')
  })

  it('vacío: obligatorio', () => {
    expect(errorsOf({ nif: '  ' })?.nif).toBe('El NIF/NIE es obligatorio.')
  })
})

describe('IBAN', () => {
  it.each([
    ['válido', 'ES9121000418450200051332', true],
    ['válido con espacios y minúsculas', 'es91 2100 0418 4502 0005 1332', true],
    ['checksum mal', 'ES9221000418450200051332', false],
    ['un dígito cambiado', 'ES9121000418450200051333', false],
    ['país distinto', 'FR9121000418450200051332', false],
    ['demasiado corto', 'ES912100041845020005133', false],
    ['demasiado largo', 'ES91210004184502000513320', false],
    ['con letras', 'ES91210004184502000513AB', false],
  ])('%s', (_l, iban, ok) => {
    const errors = errorsOf({ iban })
    expect(errors === null).toBe(ok)
    if (!ok) expect(errors?.iban).toBe('El IBAN no es válido.')
  })

  it('vacío: obligatorio', () => {
    expect(errorsOf({ iban: '' })?.iban).toBe('El IBAN es obligatorio.')
  })
})

describe('NAF, teléfono, importes, CP', () => {
  it.each([
    ['9 dígitos', '123456789', true],
    ['12 dígitos', '123456789012', true],
    ['8 dígitos', '12345678', false],
    ['13 dígitos', '1234567890123', false],
    ['con letras', '12345678A', false],
    ['con guiones', '12-3456-78901', false],
  ])('NAF %s', (_l, naf, ok) => {
    const errors = errorsOf({ naf })
    expect(errors === null).toBe(ok)
  })

  it('NAF con espacios internos se normaliza', () => {
    const r = run({ naf: '1234 5678 9012' })
    expect(r.ok && r.data.naf).toBe('123456789012')
  })

  it.each([
    ['+34666666666', true],
    ['666666666', false],
    ['+3466666666', false],
    ['+346666666666', false],
    ['+44666666666', false],
  ])('teléfono %s', (telefono, ok) => {
    expect(errorsOf({ telefono }) === null).toBe(ok)
  })

  it.each([
    [10000, true],
    [9999, false],
    ['10.000', true],
    ['9.999', false],
    ['10000 €', true],
    [10000.5, false],
    ['', false],
    [null, false],
  ])('ingresos %s', (v, ok) => {
    const errors = errorsOf({ ingresos_anuales: v })
    expect(errors === null).toBe(ok)
  })

  it('ingresos vacío vs bajo: mensajes distintos', () => {
    expect(errorsOf({ ingresos_anuales: '' })?.ingresos_anuales).toBe(
      'La estimación de ingresos anuales es obligatoria.'
    )
    expect(errorsOf({ ingresos_anuales: 9999 })?.ingresos_anuales).toContain('10000')
  })

  it.each([
    ['28001', true],
    ['2800', false],
    ['280011', false],
    ['2800A', false],
  ])('código postal %s', (codigo_postal, ok) => {
    expect(errorsOf({ codigo_postal }) === null).toBe(ok)
  })

  it('direcciones: 320 ok, 321 no', () => {
    expect(errorsOf({ direccion_fiscal: 'a'.repeat(320) })).toBeNull()
    expect(errorsOf({ direccion_fiscal: 'a'.repeat(321) })?.direccion_fiscal).toBeDefined()
    expect(errorsOf({ direccion_notificacion: 'a'.repeat(320) })).toBeNull()
    expect(
      errorsOf({ direccion_notificacion: 'a'.repeat(321) })?.direccion_notificacion
    ).toBeDefined()
  })

  it.each([
    ['provincia', 'Selecciona una provincia válida.'],
    ['pais', 'Selecciona un país válido.'],
  ])('%s: 0, negativo y no numérico se rechazan', (field, msg) => {
    for (const v of [0, -3, 'abc', '', 1.5]) {
      expect(errorsOf({ [field]: v })?.[field]).toBe(msg)
    }
  })

  it('privacidad solo true estricto', () => {
    expect(errorsOf({ privacidad: 'true' })?.privacidad).toBeDefined()
    expect(errorsOf({ privacidad: false })?.privacidad).toBeDefined()
  })
})

describe('fechas condicionales', () => {
  it('ya autónomo sí: exige fecha_alta válida', () => {
    expect(errorsOf({ fecha_alta: '' })?.fecha_alta).toBe(
      'La fecha de alta actual es obligatoria.'
    )
    expect(errorsOf({ fecha_alta: '2026-02-31' })?.fecha_alta).toBe(
      'La fecha de alta actual no es válida.'
    )
  })

  it('ya autónomo sí: no exige fechas de la rama no', () => {
    expect(errorsOf({ fecha_dar_alta: '', fuiste_autonomo_3_anos: '' })).toBeNull()
  })

  const NO = { ya_eres_autonomo: 'no', fecha_alta: '' }

  it('ya autónomo no: exige fecha_dar_alta y fuiste_autonomo_3_anos', () => {
    const e = errorsOf({ ...NO })
    expect(e?.fecha_dar_alta).toBe('La fecha de alta solicitada es obligatoria.')
    expect(e?.fuiste_autonomo_3_anos).toBeDefined()
    expect(e?.fecha_alta).toBeUndefined()
  })

  it('ya autónomo no: fecha_dar_alta imposible', () => {
    const e = errorsOf({ ...NO, fecha_dar_alta: '2026-04-31', fuiste_autonomo_3_anos: 'no' })
    expect(e?.fecha_dar_alta).toBe('La fecha de alta solicitada no es válida.')
  })

  it('fuiste 3 años sí: exige fecha_baja válida', () => {
    const base = { ...NO, fecha_dar_alta: '2026-08-01', fuiste_autonomo_3_anos: 'si' }
    expect(errorsOf({ ...base, fecha_baja: '' })?.fecha_baja).toBe(
      'La fecha de baja anterior es obligatoria.'
    )
    expect(errorsOf({ ...base, fecha_baja: 'ayer' })?.fecha_baja).toBe(
      'La fecha de baja anterior no es válida.'
    )
  })

  it('fuiste 3 años no: fecha_baja no se exige ni se devuelve', () => {
    const r = run({
      ...NO,
      fecha_dar_alta: '2026-08-01',
      fuiste_autonomo_3_anos: 'no',
      fecha_baja: '2025-01-01',
    })
    expect(r.ok).toBe(true)
    if (r.ok) {
      expect(r.data.isAlreadyAutonomo).toBe(false)
      expect(r.data.requestedAltaAt).toBe('2026-08-01')
      expect(r.data.wasAutonomoLast3Years).toBe(false)
      expect(r.data.previousAutonomoEndDate).toBeUndefined()
      expect(r.data.startedAutonomoAt).toBeUndefined()
    }
  })

  it('fuiste 3 años sí: devuelve fecha_baja', () => {
    const r = run({
      ...NO,
      fecha_dar_alta: '2026-08-01',
      fuiste_autonomo_3_anos: 'SI',
      fecha_baja: '2025-01-01',
    })
    expect(r.ok && r.data.previousAutonomoEndDate).toBe('2025-01-01')
    expect(r.ok && r.data.wasAutonomoLast3Years).toBe(true)
  })

  it('fecha_empezar_con_nosotros obligatoria y válida', () => {
    expect(errorsOf({ fecha_empezar_con_nosotros: '' })?.fecha_empezar_con_nosotros).toBe(
      'La fecha de inicio con nosotros es obligatoria.'
    )
    expect(
      errorsOf({ fecha_empezar_con_nosotros: '2026-13-01' })?.fecha_empezar_con_nosotros
    ).toBe('La fecha de inicio con nosotros no es válida.')
  })

  it('yes/no inválido se rechaza', () => {
    expect(errorsOf({ ya_eres_autonomo: 'quizá' })?.ya_eres_autonomo).toBeDefined()
    expect(errorsOf({ certificado_digital: 'maybe' })?.certificado_digital).toBeDefined()
  })

  it('email inválido', () => {
    expect(errorsOf({ email: 'no-es-email' })?.email).toBe(
      'El correo electrónico no es válido.'
    )
    expect(errorsOf({ email: '' })?.email).toBe('El correo electrónico es obligatorio.')
  })
})

describe('parsePositiveInt (comportamiento actual, permisivo)', () => {
  it('provincia "28abc" se lee como 28 (parseInt permisivo)', () => {
    const r = run({ provincia: '28abc' })
    expect(r.ok && r.data.provinceId).toBe(28)
  })
})
