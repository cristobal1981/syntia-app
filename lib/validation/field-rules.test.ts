import { describe, expect, it } from 'vitest'
import {
  applyFieldRule,
  requireIsoDate,
  requireMaxLength,
  requireSelected,
  requireTrimmed,
} from '@/lib/validation/field-rules'

describe('requireTrimmed', () => {
  it('error si vacío o solo espacios', () => {
    expect(requireTrimmed('', 'req')).toEqual({ ok: false, error: 'req' })
    expect(requireTrimmed(' \t\n ', 'req')).toEqual({ ok: false, error: 'req' })
  })
  it('ok si hay contenido', () => {
    expect(requireTrimmed(' a ', 'req')).toEqual({ ok: true })
  })
})

describe('requireSelected', () => {
  // DUPLICADO: requireSelected es idéntico a requireTrimmed. Si se unifican,
  // este test garantiza que el comportamiento observable no cambia.
  it.each(['', '   ', '\t', 'a', ' a ', '0', 'uuid-1'])(
    'se comporta igual que requireTrimmed para %j',
    (v) => {
      expect(requireSelected(v, 'sel')).toEqual(requireTrimmed(v, 'sel'))
    }
  )
  it('devuelve el error pasado cuando está vacío', () => {
    expect(requireSelected('', 'sel')).toEqual({ ok: false, error: 'sel' })
    expect(requireSelected('x', 'sel')).toEqual({ ok: true })
  })
})

describe('requireMaxLength', () => {
  it('ok en el límite exacto, error en max+1', () => {
    expect(requireMaxLength('abc', 3, 'long')).toEqual({ ok: true })
    expect(requireMaxLength('abcd', 3, 'long')).toEqual({ ok: false, error: 'long' })
  })
  it('mide la longitud tras recortar', () => {
    expect(requireMaxLength('  abc  ', 3, 'long')).toEqual({ ok: true })
  })
  it('vacío es ok (no exige contenido)', () => {
    expect(requireMaxLength('', 0, 'long')).toEqual({ ok: true })
    expect(requireMaxLength('a', 0, 'long')).toEqual({ ok: false, error: 'long' })
  })
})

describe('requireIsoDate', () => {
  it('vacío o espacios devuelve requiredError', () => {
    expect(requireIsoDate('', 'req', 'inv')).toEqual({ ok: false, error: 'req' })
    expect(requireIsoDate('  ', 'req', 'inv')).toEqual({ ok: false, error: 'req' })
  })
  it('fecha mal formada o imposible devuelve invalidError', () => {
    expect(requireIsoDate('31/12/2024', 'req', 'inv')).toEqual({ ok: false, error: 'inv' })
    expect(requireIsoDate('2024-02-31', 'req', 'inv')).toEqual({ ok: false, error: 'inv' })
  })
  it('fecha válida (con espacios alrededor) es ok', () => {
    expect(requireIsoDate(' 2024-02-29 ', 'req', 'inv')).toEqual({ ok: true })
  })
})

describe('applyFieldRule', () => {
  it('escribe el error en el campo si falla', () => {
    const errors: Record<string, string> = {}
    applyFieldRule(errors, 'name', { ok: false, error: 'req' })
    expect(errors).toEqual({ name: 'req' })
  })
  it('no toca el objeto si ok', () => {
    const errors: Record<string, string> = { other: 'x' }
    applyFieldRule(errors, 'name', { ok: true })
    expect(errors).toEqual({ other: 'x' })
  })
  it('un campo posterior sobrescribe el error del mismo campo y respeta los demás', () => {
    const errors: Record<string, string> = { name: 'a', other: 'x' }
    applyFieldRule(errors, 'name', { ok: false, error: 'b' })
    expect(errors).toEqual({ name: 'b', other: 'x' })
  })
})
