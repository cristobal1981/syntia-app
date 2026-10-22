import { describe, expect, it } from 'vitest'

import {
  EVENTS_SILENT_MS,
  evaluatePushHealth,
  isBusinessHours,
  PULSE_STALLED_MS,
  SWEEP_STALLED_MS,
  type PushHealthInput,
  type PushHealthRun,
} from '@/src/modules/push/domain/push-health'

// Jueves 22 de octubre de 2026, 12:00 en Madrid (UTC+2).
const WORKDAY = Date.parse('2026-10-22T10:00:00Z')
const MIN = 60_000

function run(partial: Partial<PushHealthRun> = {}): PushHealthRun {
  return {
    source: 'events',
    startedAt: WORKDAY - MIN,
    hadError: false,
    locked: false,
    truncated: false,
    created: 0,
    ...partial,
  }
}

function input(partial: Partial<PushHealthInput> = {}): PushHealthInput {
  return {
    now: WORKDAY,
    source: 'events',
    runs: [run()],
    lastEventAt: WORKDAY - 10 * MIN,
    ...partial,
  }
}

function codes(health: ReturnType<typeof evaluatePushHealth>) {
  return health.problems.map((problem) => problem.code)
}

describe('isBusinessHours', () => {
  it.each([
    ['jueves 12:00', '2026-10-22T10:00:00Z', true],
    ['lunes a las 8:00', '2026-10-19T06:00:00Z', true],
    ['viernes 19:59', '2026-10-23T17:59:00Z', true],
    ['jueves 7:59', '2026-10-22T05:59:00Z', false],
    ['jueves 20:00', '2026-10-22T18:00:00Z', false],
    ['sábado a mediodía', '2026-10-24T10:00:00Z', false],
    ['domingo a mediodía', '2026-10-25T10:00:00Z', false],
  ])('%s', (_name, iso, expected) => {
    expect(isBusinessHours(Date.parse(iso))).toBe(expected)
  })

  it('usa la hora de Madrid también en invierno (UTC+1)', () => {
    expect(isBusinessHours(Date.parse('2026-12-10T07:00:00Z'))).toBe(true)
    expect(isBusinessHours(Date.parse('2026-12-10T06:59:00Z'))).toBe(false)
  })
})

describe('evaluatePushHealth', () => {
  it('todo en orden: ok y sin problemas', () => {
    expect(evaluatePushHealth(input())).toEqual({ ok: true, problems: [] })
  })

  describe('pulso', () => {
    it('sin ninguna ejecución registrada es un error', () => {
      const health = evaluatePushHealth(input({ runs: [] }))
      expect(codes(health)).toContain('pulse_stalled')
      expect(health.ok).toBe(false)
    })

    it('una última ejecución de hace más de 15 minutos es un error', () => {
      const stalled = evaluatePushHealth(input({ runs: [run({ startedAt: WORKDAY - PULSE_STALLED_MS - 1 })] }))
      expect(codes(stalled)).toContain('pulse_stalled')

      const fresh = evaluatePushHealth(input({ runs: [run({ startedAt: WORKDAY - PULSE_STALLED_MS })] }))
      expect(codes(fresh)).not.toContain('pulse_stalled')
      expect(PULSE_STALLED_MS).toBe(15 * MIN)
    })

    it('un barrido reciente no cuenta como pulso del dispatcher', () => {
      const health = evaluatePushHealth(
        input({ runs: [run({ source: 'sweep', startedAt: WORKDAY - MIN })] })
      )
      expect(codes(health)).toContain('pulse_stalled')
    })
  })

  describe('errores', () => {
    it('la última ejecución con error es un error', () => {
      const health = evaluatePushHealth(input({ runs: [run({ hadError: true })] }))
      expect(codes(health)).toContain('run_errors')
      expect(health.ok).toBe(false)
    })

    it('tres errores entre las últimas diez, aunque la última esté bien', () => {
      const runs = [
        run(),
        run({ hadError: true }),
        run({ hadError: true }),
        run({ hadError: true }),
        ...Array.from({ length: 6 }, () => run()),
      ]
      expect(codes(evaluatePushHealth(input({ runs })))).toContain('run_errors')
    })

    it('dos errores antiguos no alertan', () => {
      const runs = [run(), run({ hadError: true }), run({ hadError: true }), run()]
      expect(codes(evaluatePushHealth(input({ runs })))).not.toContain('run_errors')
    })

    it('un error fuera de las últimas diez no cuenta', () => {
      const runs = [...Array.from({ length: 10 }, () => run()), run({ hadError: true })]
      expect(codes(evaluatePushHealth(input({ runs })))).not.toContain('run_errors')
    })
  })

  describe('cerrojo y atasco', () => {
    it('cinco ejecuciones seguidas saltadas por el cerrojo es un error', () => {
      const runs = Array.from({ length: 5 }, () => run({ locked: true }))
      expect(codes(evaluatePushHealth(input({ runs })))).toContain('stuck_lock')
    })

    it('cuatro saltadas, o cinco con una en medio libre, no alertan', () => {
      const four = Array.from({ length: 4 }, () => run({ locked: true }))
      expect(codes(evaluatePushHealth(input({ runs: four })))).not.toContain('stuck_lock')

      const broken = [run({ locked: true }), run({ locked: true }), run(), run({ locked: true }), run({ locked: true })]
      expect(codes(evaluatePushHealth(input({ runs: broken })))).not.toContain('stuck_lock')
    })

    it('tres truncadas entre las últimas cinco es un aviso, no un error', () => {
      const runs = [run({ truncated: true }), run(), run({ truncated: true }), run({ truncated: true }), run()]
      const health = evaluatePushHealth(input({ runs }))
      expect(codes(health)).toContain('backlog')
      expect(health.ok).toBe(true)
    })

    it('dos truncadas no alertan', () => {
      const runs = [run({ truncated: true }), run(), run({ truncated: true }), run(), run()]
      expect(codes(evaluatePushHealth(input({ runs })))).not.toContain('backlog')
    })
  })

  describe('silencio de Odoo', () => {
    it('en horario laboral, sin eventos hace más de 4 horas es un aviso (no un error)', () => {
      const health = evaluatePushHealth(input({ lastEventAt: WORKDAY - EVENTS_SILENT_MS - 1 }))
      expect(codes(health)).toContain('events_silent')
      expect(health.ok).toBe(true)
    })

    it('justo en el límite no alerta', () => {
      expect(
        codes(evaluatePushHealth(input({ lastEventAt: WORKDAY - EVENTS_SILENT_MS })))
      ).not.toContain('events_silent')
    })

    it('sin ningún evento recibido, en horario laboral, también avisa', () => {
      expect(codes(evaluatePushHealth(input({ lastEventAt: null })))).toContain('events_silent')
    })

    it('fuera de horario laboral no avisa', () => {
      const saturday = Date.parse('2026-10-24T10:00:00Z')
      const health = evaluatePushHealth(
        input({ now: saturday, runs: [run({ startedAt: saturday - MIN })], lastEventAt: null })
      )
      expect(codes(health)).not.toContain('events_silent')
    })

    it('con el cálculo por snapshots no aplica', () => {
      expect(
        codes(evaluatePushHealth(input({ source: 'snapshots', lastEventAt: null })))
      ).not.toContain('events_silent')
    })
  })

  describe('barrido', () => {
    it('un barrido de hace más de 2 horas es un aviso', () => {
      const runs = [run(), run({ source: 'sweep', startedAt: WORKDAY - SWEEP_STALLED_MS - 1 })]
      expect(codes(evaluatePushHealth(input({ runs })))).toContain('sweep_stalled')
    })

    it('si nunca se ha ejecutado un barrido no se avisa (aún no está activado)', () => {
      expect(codes(evaluatePushHealth(input()))).not.toContain('sweep_stalled')
    })

    it('un barrido reciente está bien', () => {
      const runs = [run(), run({ source: 'sweep', startedAt: WORKDAY - 30 * MIN })]
      expect(codes(evaluatePushHealth(input({ runs })))).not.toContain('sweep_stalled')
    })

    it('mensajes recuperados por el barrido son un aviso con el total', () => {
      const runs = [
        run(),
        run({ source: 'sweep', startedAt: WORKDAY - 30 * MIN, created: 2 }),
        run({ source: 'sweep', startedAt: WORKDAY - 60 * MIN, created: 3 }),
      ]
      const health = evaluatePushHealth(input({ runs }))

      expect(codes(health)).toContain('events_lost')
      expect(health.problems.find((problem) => problem.code === 'events_lost')?.message).toContain('5')
      expect(health.ok).toBe(true)
    })
  })

  it('un aviso solo no pone ok a false; un error sí, y se acumulan', () => {
    const health = evaluatePushHealth(input({ runs: [run({ hadError: true, startedAt: WORKDAY - 20 * MIN })] }))
    expect(health.ok).toBe(false)
    expect(codes(health)).toEqual(expect.arrayContaining(['pulse_stalled', 'run_errors']))
  })
})
