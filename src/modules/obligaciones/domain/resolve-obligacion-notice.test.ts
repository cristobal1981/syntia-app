import { describe, expect, it } from 'vitest'

import {
  formatObligacionNoticeDate,
  getDaysUntilObligacionDeadlineFromClock,
  getObligacionCompletion,
  getObligacionNoticeClock,
  getObligacionNoticeSlotForKind,
  resolveObligacionNoticeKind,
  resolveObligacionNoticeSlot,
  type ObligacionNoticeClock,
} from '@/src/modules/obligaciones/domain/resolve-obligacion-notice'

const clockOn = (month: number, day: number, hour = 8): ObligacionNoticeClock => ({
  year: 2026,
  month,
  day,
  hour,
})

/** Plazo con el mismo formato que `resolveObligacionDeadline` (fin del día, hora local). */
const deadlineOn = (month: number, day: number) => new Date(2026, month - 1, day, 23, 59, 59)

describe('getObligacionNoticeClock', () => {
  it('lee el día y la hora de Canarias en verano (UTC+1)', () => {
    expect(getObligacionNoticeClock(new Date('2026-07-14T07:00:00Z'))).toEqual({
      year: 2026,
      month: 7,
      day: 14,
      hour: 8,
    })
  })

  it('lee el día y la hora de Canarias en invierno (UTC+0)', () => {
    expect(getObligacionNoticeClock(new Date('2026-01-14T08:00:00Z'))).toEqual({
      year: 2026,
      month: 1,
      day: 14,
      hour: 8,
    })
  })

  it('cambia de día con la hora local, no con la UTC', () => {
    // 23:30 UTC del 14 de julio ya es 00:30 del 15 en Canarias.
    expect(getObligacionNoticeClock(new Date('2026-07-14T23:30:00Z'))).toEqual({
      year: 2026,
      month: 7,
      day: 15,
      hour: 0,
    })
  })
})

describe('formatObligacionNoticeDate', () => {
  it('rellena con ceros mes y día', () => {
    expect(formatObligacionNoticeDate(clockOn(1, 5))).toBe('2026-01-05')
    expect(formatObligacionNoticeDate(clockOn(10, 14))).toBe('2026-10-14')
  })
})

describe('resolveObligacionNoticeSlot', () => {
  it('las 8 son la mañana y las 14 el día de presentación', () => {
    expect(resolveObligacionNoticeSlot(8)).toBe('morning')
    expect(resolveObligacionNoticeSlot(14)).toBe('presentation')
  })

  it.each([0, 7, 9, 13, 15, 23])('a las %i no toca avisar', (hour) => {
    expect(resolveObligacionNoticeSlot(hour)).toBeNull()
  })

  it('la presentación va a la franja de las 14 y el resto a la de la mañana', () => {
    expect(getObligacionNoticeSlotForKind('presentacion')).toBe('presentation')
    expect(getObligacionNoticeSlotForKind('domiciliar')).toBe('morning')
    expect(getObligacionNoticeSlotForKind('normal')).toBe('morning')
  })
})

describe('getDaysUntilObligacionDeadlineFromClock', () => {
  it('cuenta días naturales sin depender de la hora', () => {
    expect(getDaysUntilObligacionDeadlineFromClock(deadlineOn(4, 20), clockOn(4, 10))).toBe(10)
    expect(getDaysUntilObligacionDeadlineFromClock(deadlineOn(4, 20), clockOn(4, 20, 14))).toBe(0)
    expect(getDaysUntilObligacionDeadlineFromClock(deadlineOn(4, 20), clockOn(4, 21))).toBe(-1)
  })

  it('cruza fin de mes', () => {
    expect(getDaysUntilObligacionDeadlineFromClock(deadlineOn(2, 3), clockOn(1, 30))).toBe(4)
  })
})

describe('resolveObligacionNoticeKind — plazo el día 20', () => {
  const deadline = deadlineOn(4, 20)

  it.each([
    [10, 'domiciliar'],
    [14, 'domiciliar'],
    [18, 'normal'],
    [20, 'presentacion'],
  ])('el día %i de un modelo domiciliable es %s', (day, kind) => {
    expect(
      resolveObligacionNoticeKind({ deadline, clock: clockOn(4, day), domiciliable: true })
    ).toBe(kind)
  })

  it('un modelo no domiciliable salta los avisos de domiciliación y conserva el 18 y el 20', () => {
    const kindOn = (day: number) =>
      resolveObligacionNoticeKind({ deadline, clock: clockOn(4, day), domiciliable: false })

    expect(kindOn(10)).toBeNull()
    expect(kindOn(14)).toBeNull()
    expect(kindOn(18)).toBe('normal')
    expect(kindOn(20)).toBe('presentacion')
  })

  it.each([1, 9, 11, 13, 15, 16, 17, 19, 21])('el día %i no toca ningún aviso', (day) => {
    expect(
      resolveObligacionNoticeKind({ deadline, clock: clockOn(4, day), domiciliable: true })
    ).toBeNull()
  })
})

describe('resolveObligacionNoticeKind — resto de plazos (30/31 y anuales)', () => {
  it('plazo el 30: 5 días antes (25) y el mismo día', () => {
    const deadline = deadlineOn(1, 30)
    const kindOn = (day: number, domiciliable: boolean) =>
      resolveObligacionNoticeKind({ deadline, clock: clockOn(1, day), domiciliable })

    expect(kindOn(25, true)).toBe('domiciliar')
    expect(kindOn(30, true)).toBe('presentacion')
    expect(kindOn(26, true)).toBeNull()
    expect(kindOn(29, true)).toBeNull()
  })

  it('plazo el 31: 5 días antes cae el 26', () => {
    const deadline = deadlineOn(1, 31)

    expect(
      resolveObligacionNoticeKind({ deadline, clock: clockOn(1, 26), domiciliable: true })
    ).toBe('domiciliar')
    expect(
      resolveObligacionNoticeKind({ deadline, clock: clockOn(1, 31), domiciliable: false })
    ).toBe('presentacion')
  })

  it('un modelo no domiciliable recibe el aviso de 5 días antes como normal', () => {
    expect(
      resolveObligacionNoticeKind({
        deadline: deadlineOn(1, 30),
        clock: clockOn(1, 25),
        domiciliable: false,
      })
    ).toBe('normal')
  })

  it('los días 10, 14 y 18 no avisan a un plazo que no es el 20', () => {
    const deadline = deadlineOn(1, 30)

    for (const day of [10, 14, 18]) {
      expect(
        resolveObligacionNoticeKind({ deadline, clock: clockOn(1, day), domiciliable: true })
      ).toBeNull()
    }
  })

  it('los fines de semana no mueven los avisos: el 25 de julio (sábado) sigue siendo el día fijo', () => {
    // 25 de julio de 2026 es sábado; el calendario usa días fijos a propósito.
    expect(
      resolveObligacionNoticeKind({
        deadline: deadlineOn(7, 30),
        clock: clockOn(7, 25),
        domiciliable: true,
      })
    ).toBe('domiciliar')
  })

  it('un plazo ya pasado no avisa', () => {
    expect(
      resolveObligacionNoticeKind({
        deadline: deadlineOn(4, 20),
        clock: clockOn(4, 21),
        domiciliable: true,
      })
    ).toBeNull()
  })
})

describe('getObligacionCompletion', () => {
  it('hecha y con documento está completa', () => {
    expect(getObligacionCompletion('done', 1)).toEqual({ level: 'complete' })
    expect(getObligacionCompletion('1_done', 3)).toEqual({ level: 'complete' })
  })

  it('hecha sin documento es parcial', () => {
    expect(getObligacionCompletion('done', 0)).toEqual({
      level: 'partial',
      reason: 'done_without_document',
    })
  })

  it('con documento sin estar hecha es parcial', () => {
    expect(getObligacionCompletion('01_in_progress', 1)).toEqual({
      level: 'partial',
      reason: 'document_without_done',
    })
  })

  it('sin estado hecho ni documento falta todo', () => {
    expect(getObligacionCompletion('01_in_progress', 0)).toEqual({ level: 'missing' })
    expect(getObligacionCompletion(undefined, 0)).toEqual({ level: 'missing' })
  })

  it('cancelada queda aparte aunque tenga documentos', () => {
    expect(getObligacionCompletion('canceled', 0)).toEqual({ level: 'canceled' })
    expect(getObligacionCompletion('1_canceled', 4)).toEqual({ level: 'canceled' })
  })

  it('cambios solicitados no cuenta como hecha', () => {
    expect(getObligacionCompletion('02_changes_requested', 0)).toEqual({ level: 'missing' })
  })
})
