import { describe, expect, it } from 'vitest'

import {
  MAX_AUTOMATION_INPUT_TEXT_LENGTH,
  advisorCanSeeAutomation,
  adminCanSeeAutomation,
  buildYearInputOptions,
  parseAutomationInputFields,
  validateAutomationInputFieldsDefinition,
  validateAutomationInputValues,
  type AutomationInputField,
} from '@/src/modules/automatizaciones/domain/types'

function field(overrides: Partial<AutomationInputField> = {}): AutomationInputField {
  return {
    key: 'campo',
    label: 'Campo',
    type: 'text',
    required: true,
    defaultValue: null,
    options: [],
    ...overrides,
  }
}

function selectField(overrides: Partial<AutomationInputField> = {}) {
  return field({
    type: 'select',
    options: [
      { value: 'a', label: 'A' },
      { value: 'b', label: 'B' },
    ],
    ...overrides,
  })
}

describe('advisorCanSeeAutomation / adminCanSeeAutomation', () => {
  it('inactive is never visible, whatever the visibility', () => {
    expect(
      advisorCanSeeAutomation(
        { isActive: false, visibility: 'all', grantedAdvisorIds: ['x'] },
        'x'
      )
    ).toBe(false)
    expect(adminCanSeeAutomation({ isActive: false })).toBe(false)
    expect(adminCanSeeAutomation({ isActive: true })).toBe(true)
  })

  it('all -> visible; none -> hidden even when granted', () => {
    expect(
      advisorCanSeeAutomation({ isActive: true, visibility: 'all', grantedAdvisorIds: [] }, 'x')
    ).toBe(true)
    expect(
      advisorCanSeeAutomation({ isActive: true, visibility: 'none', grantedAdvisorIds: ['x'] }, 'x')
    ).toBe(false)
  })

  it('selected -> only granted advisors', () => {
    const a = { isActive: true, visibility: 'selected' as const, grantedAdvisorIds: ['x'] }
    expect(advisorCanSeeAutomation(a, 'x')).toBe(true)
    expect(advisorCanSeeAutomation(a, 'y')).toBe(false)
  })
})

describe('buildYearInputOptions', () => {
  it('goes from ref+1 down to ref-3, newest first', () => {
    expect(buildYearInputOptions(2026).map((o) => o.value)).toEqual([
      '2027',
      '2026',
      '2025',
      '2024',
      '2023',
    ])
  })
})

describe('parseAutomationInputFields', () => {
  it('returns [] for non-arrays', () => {
    expect(parseAutomationInputFields(null)).toEqual([])
    expect(parseAutomationInputFields({})).toEqual([])
  })

  it('skips non-objects and invalid keys without throwing', () => {
    const result = parseAutomationInputFields([
      null,
      'x',
      { key: 'Bad', type: 'text' },
      { key: '1abc', type: 'text' },
      { key: 'a'.repeat(41), type: 'text' },
      { key: 5, type: 'text' },
      { key: 'ok', type: 'text' },
    ])
    expect(result.map((f) => f.key)).toEqual(['ok'])
  })

  it('accepts a 40-char key (boundary)', () => {
    const key = 'a'.repeat(40)
    expect(parseAutomationInputFields([{ key, type: 'text' }])).toHaveLength(1)
  })

  it('caps at 6 fields', () => {
    const raw = Array.from({ length: 10 }, (_, i) => ({ key: `k${i}`, type: 'text' }))
    const result = parseAutomationInputFields(raw)
    expect(result.map((f) => f.key)).toEqual(['k0', 'k1', 'k2', 'k3', 'k4', 'k5'])
  })

  it('caps at 6 for every field type, not only text', () => {
    const types = ['year', 'checkbox', 'odoo_companies_multi']
    for (const type of types) {
      const raw = Array.from({ length: 8 }, (_, i) => ({ key: `k${i}`, type }))
      expect(parseAutomationInputFields(raw)).toHaveLength(6)
    }
    const rawSelect = Array.from({ length: 8 }, (_, i) => ({
      key: `k${i}`,
      type: 'select',
      options: [{ value: 'a' }],
    }))
    expect(parseAutomationInputFields(rawSelect)).toHaveLength(6)
  })

  it('unknown type falls back to select and needs valid options', () => {
    expect(parseAutomationInputFields([{ key: 'k', type: 'weird' }])).toEqual([])
    expect(parseAutomationInputFields([{ key: 'k', options: [] }])).toEqual([])
    expect(
      parseAutomationInputFields([{ key: 'k', type: 'weird', options: [{ value: 'a' }] }])
    ).toEqual([
      {
        key: 'k',
        label: 'k',
        type: 'select',
        required: true,
        defaultValue: null,
        options: [{ value: 'a', label: 'a' }],
      },
    ])
  })

  it('select: drops malformed options, trims, keeps default only if among options', () => {
    const [f] = parseAutomationInputFields([
      {
        key: 'k',
        type: 'select',
        label: '  Etiqueta ',
        required: false,
        defaultValue: 'b',
        options: [{ value: ' a ', label: ' A ' }, { value: '  ' }, 7, { value: 'b' }],
      },
    ])
    expect(f.label).toBe('Etiqueta')
    expect(f.required).toBe(false)
    expect(f.options).toEqual([
      { value: 'a', label: 'A' },
      { value: 'b', label: 'b' },
    ])
    expect(f.defaultValue).toBe('b')

    const [g] = parseAutomationInputFields([
      { key: 'k', type: 'select', defaultValue: 'zzz', options: [{ value: 'a' }] },
    ])
    expect(g.defaultValue).toBeNull()
  })

  it('required defaults to true unless exactly false', () => {
    const [a, b, c] = parseAutomationInputFields([
      { key: 'a', type: 'text' },
      { key: 'b', type: 'text', required: false },
      { key: 'c', type: 'text', required: 0 },
    ])
    expect([a.required, b.required, c.required]).toEqual([true, false, true])
  })

  it('text: trims default, blank default -> null, options forced empty', () => {
    const [a, b] = parseAutomationInputFields([
      { key: 'a', type: 'text', defaultValue: '  hola ', options: [{ value: 'x' }] },
      { key: 'b', type: 'text', defaultValue: '   ' },
    ])
    expect(a.defaultValue).toBe('hola')
    expect(a.options).toEqual([])
    expect(b.defaultValue).toBeNull()
  })

  it('checkbox: normalises truthy/falsy defaults, else null', () => {
    const defaults = [true, 'true', 1, '1', false, 'false', 0, '0', 'si', null]
    const result = parseAutomationInputFields(
      defaults.map((defaultValue, i) => ({ key: `c${i}`, type: 'checkbox', defaultValue }))
    )
    // el límite de 6 corta la lista; comprobamos las seis primeras
    expect(result.map((f) => f.defaultValue)).toEqual([
      'true',
      'true',
      'true',
      'true',
      'false',
      'false',
    ])
    const rest = parseAutomationInputFields(
      [0, '0', 'si', null].map((defaultValue, i) => ({
        key: `c${i}`,
        type: 'checkbox',
        defaultValue,
      }))
    )
    expect(rest.map((f) => f.defaultValue)).toEqual(['false', 'false', null, null])
  })

  it('odoo_companies_multi: default always null, no options', () => {
    const [f] = parseAutomationInputFields([
      { key: 'e', type: 'odoo_companies_multi', defaultValue: 'x', options: [{ value: 'a' }] },
    ])
    expect(f).toMatchObject({ type: 'odoo_companies_multi', defaultValue: null, options: [] })
  })

  it('year: options are generated, default must be in the generated range', () => {
    const thisYear = String(new Date().getFullYear())
    const [a, b] = parseAutomationInputFields([
      { key: 'a', type: 'year', defaultValue: thisYear, options: [{ value: 'x' }] },
      { key: 'b', type: 'year', defaultValue: '1999' },
    ])
    expect(a.options.map((o) => o.value)).toEqual(
      buildYearInputOptions().map((o) => o.value)
    )
    expect(a.defaultValue).toBe(thisYear)
    expect(b.defaultValue).toBeNull()
  })
})

describe('validateAutomationInputFieldsDefinition', () => {
  it('accepts exactly 6 fields and rejects 7', () => {
    const six = Array.from({ length: 6 }, (_, i) => field({ key: `k${i}` }))
    expect(validateAutomationInputFieldsDefinition(six).ok).toBe(true)
    const seven = Array.from({ length: 7 }, (_, i) => field({ key: `k${i}` }))
    const r = validateAutomationInputFieldsDefinition(seven)
    expect(r).toEqual({ ok: false, message: 'Máximo 6 parámetros por automatización.' })
  })

  it('normalises the key (trim + lowercase) and rejects invalid ones', () => {
    const ok = validateAutomationInputFieldsDefinition([field({ key: '  MiClave ' })])
    expect(ok.ok && ok.fields[0].key).toBe('miclave')

    for (const key of ['1a', 'a-b', '', 'a b', 'a'.repeat(41)]) {
      const r = validateAutomationInputFieldsDefinition([field({ key })])
      expect(r.ok).toBe(false)
    }
    expect(
      validateAutomationInputFieldsDefinition([field({ key: 'a'.repeat(40) })]).ok
    ).toBe(true)
  })

  it('rejects duplicated keys (case-insensitive)', () => {
    const r = validateAutomationInputFieldsDefinition([
      field({ key: 'abc' }),
      field({ key: 'ABC' }),
    ])
    expect(r).toEqual({ ok: false, message: 'Clave de parámetro repetida: «abc».' })
  })

  it('requires a non-blank label', () => {
    const r = validateAutomationInputFieldsDefinition([field({ label: '   ' })])
    expect(r.ok).toBe(false)
  })

  it('text: default limited to 500 chars (boundary), blank -> null', () => {
    expect(MAX_AUTOMATION_INPUT_TEXT_LENGTH).toBe(500)
    const ok = validateAutomationInputFieldsDefinition([
      field({ defaultValue: 'x'.repeat(500) }),
    ])
    expect(ok.ok).toBe(true)
    const bad = validateAutomationInputFieldsDefinition([
      field({ defaultValue: 'x'.repeat(501) }),
    ])
    expect(bad.ok).toBe(false)
    const blank = validateAutomationInputFieldsDefinition([field({ defaultValue: '  ' })])
    expect(blank.ok && blank.fields[0].defaultValue).toBeNull()
  })

  it('select: needs options, max 24, no empty/duplicate values', () => {
    const opts = (n: number) =>
      Array.from({ length: n }, (_, i) => ({ value: `v${i}`, label: `V${i}` }))
    expect(
      validateAutomationInputFieldsDefinition([selectField({ options: [] })]).ok
    ).toBe(false)
    expect(
      validateAutomationInputFieldsDefinition([selectField({ options: opts(24) })]).ok
    ).toBe(true)
    expect(
      validateAutomationInputFieldsDefinition([selectField({ options: opts(25) })]).ok
    ).toBe(false)
    expect(
      validateAutomationInputFieldsDefinition([
        selectField({ options: [{ value: ' ', label: 'x' }] }),
      ]).ok
    ).toBe(false)
    expect(
      validateAutomationInputFieldsDefinition([
        selectField({
          options: [
            { value: 'a', label: 'A' },
            { value: ' a ', label: 'A2' },
          ],
        }),
      ]).ok
    ).toBe(false)
  })

  it('select: label falls back to value; default must be among options', () => {
    const r = validateAutomationInputFieldsDefinition([
      selectField({
        options: [{ value: ' a ', label: '  ' }],
        defaultValue: ' a ',
      }),
    ])
    expect(r.ok && r.fields[0].options).toEqual([{ value: 'a', label: 'a' }])
    expect(r.ok && r.fields[0].defaultValue).toBe('a')

    const bad = validateAutomationInputFieldsDefinition([
      selectField({ defaultValue: 'zzz' }),
    ])
    expect(bad.ok).toBe(false)
  })

  it('unknown type is treated as select', () => {
    const r = validateAutomationInputFieldsDefinition([
      field({ type: 'weird' as never, options: [] }),
    ])
    expect(r.ok).toBe(false)
  })

  it('checkbox: only "true"/"false" defaults survive; options dropped', () => {
    const r = validateAutomationInputFieldsDefinition([
      field({ key: 'a', type: 'checkbox', defaultValue: 'true', options: [{ value: 'x', label: 'x' }] }),
      field({ key: 'b', type: 'checkbox', defaultValue: 'false' }),
      field({ key: 'c', type: 'checkbox', defaultValue: 'maybe' }),
    ])
    expect(r.ok && r.fields.map((f) => f.defaultValue)).toEqual(['true', 'false', null])
    expect(r.ok && r.fields[0].options).toEqual([])
  })

  it('odoo_companies_multi: default forced to null', () => {
    const r = validateAutomationInputFieldsDefinition([
      field({ type: 'odoo_companies_multi', defaultValue: 'x' }),
    ])
    expect(r.ok && r.fields[0].defaultValue).toBeNull()
  })

  it('year: default kept only if inside the generated range; options empty', () => {
    const thisYear = String(new Date().getFullYear())
    const r = validateAutomationInputFieldsDefinition([
      field({ key: 'a', type: 'year', defaultValue: ` ${thisYear} ` }),
      field({ key: 'b', type: 'year', defaultValue: '1999' }),
    ])
    expect(r.ok && r.fields[0].defaultValue).toBe(thisYear)
    expect(r.ok && r.fields[1].defaultValue).toBeNull()
    expect(r.ok && r.fields[0].options).toEqual([])
  })
})

describe('validateAutomationInputValues', () => {
  it('text: required missing -> error; optional missing -> omitted from payload', () => {
    expect(validateAutomationInputValues([field()], {}).ok).toBe(false)
    const r = validateAutomationInputValues([field({ required: false })], {})
    expect(r).toEqual({ ok: true, payload: {} })
  })

  it('text: trims, falls back to default, enforces 500 chars (boundary)', () => {
    expect(
      validateAutomationInputValues([field()], { campo: '  hola ' })
    ).toEqual({ ok: true, payload: { campo: 'hola' } })
    expect(
      validateAutomationInputValues([field({ defaultValue: 'def' })], { campo: '  ' })
    ).toEqual({ ok: true, payload: { campo: 'def' } })
    expect(
      validateAutomationInputValues([field()], { campo: 'x'.repeat(500) }).ok
    ).toBe(true)
    expect(
      validateAutomationInputValues([field()], { campo: 'x'.repeat(501) }).ok
    ).toBe(false)
  })

  it('select: value must be among options', () => {
    expect(validateAutomationInputValues([selectField()], { campo: 'a' })).toEqual({
      ok: true,
      payload: { campo: 'a' },
    })
    expect(validateAutomationInputValues([selectField()], { campo: 'zzz' }).ok).toBe(false)
  })

  it('year: validated against its options like select', () => {
    const y = field({ type: 'year', options: buildYearInputOptions() })
    const thisYear = String(new Date().getFullYear())
    expect(validateAutomationInputValues([y], { campo: thisYear }).ok).toBe(true)
    expect(validateAutomationInputValues([y], { campo: '1999' }).ok).toBe(false)
  })

  it('checkbox: explicit true/false, default applies only when value is absent', () => {
    const cb = (o: Partial<AutomationInputField>) =>
      field({ type: 'checkbox', ...o })
    expect(
      validateAutomationInputValues([cb({ required: false })], { campo: 'true' })
    ).toEqual({ ok: true, payload: { campo: true } })
    expect(
      validateAutomationInputValues([cb({ required: false, defaultValue: 'true' })], {})
    ).toEqual({ ok: true, payload: { campo: true } })
    expect(
      validateAutomationInputValues(
        [cb({ required: false, defaultValue: 'true' })],
        { campo: 'false' }
      )
    ).toEqual({ ok: true, payload: { campo: false } })
    expect(
      validateAutomationInputValues([cb({ required: true })], { campo: 'false' }).ok
    ).toBe(false)
    expect(validateAutomationInputValues([cb({ required: true })], {}).ok).toBe(false)
  })

  it('odoo_companies_multi: parses, dedupes, drops non-positive/non-integer ids', () => {
    const f = field({ type: 'odoo_companies_multi' })
    const r = validateAutomationInputValues([f], {}, { campo: [3, 3, 0, -1, 2.5, 7] })
    expect(r).toEqual({ ok: true, payload: { campo: [3, 7] } })
    expect(validateAutomationInputValues([f], {}, {}).ok).toBe(false)
    expect(validateAutomationInputValues([f], {}, { campo: [0] }).ok).toBe(false)
    expect(
      validateAutomationInputValues([{ ...f, required: false }], {}, {})
    ).toEqual({ ok: true, payload: {} })
  })

  it('does not leak undeclared values into the payload', () => {
    const r = validateAutomationInputValues([field()], { campo: 'a', extra: 'b' })
    expect(r).toEqual({ ok: true, payload: { campo: 'a' } })
  })
})
