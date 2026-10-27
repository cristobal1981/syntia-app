import { describe, expect, it } from 'vitest'

import {
  DEFERRED_POLL_MS,
  initialPollDelayMs,
  SERVER_SEED_GRACE_MS,
  shouldAcknowledgeEventsSeen,
  shouldRunFullNotificationsCheck,
} from '@/src/modules/portal/infrastructure/portal-notifications-poll-timing'

const base = { signalSeq: 10, lastSignalSeq: 10, lastFullCheckAt: 1_000_000, now: 1_030_000, maxAgeMs: 300_000 }

describe('shouldRunFullNotificationsCheck', () => {
  it('sin eventos nuevos y con la última comprobación reciente, se la salta', () => {
    expect(shouldRunFullNotificationsCheck(base)).toBe(false)
  })

  it('con un evento nuevo la hace, suba el seq lo que suba', () => {
    expect(shouldRunFullNotificationsCheck({ ...base, signalSeq: 11 })).toBe(true)
  })

  it('la primera vez la hace siempre (sin seq o sin comprobación previa)', () => {
    expect(shouldRunFullNotificationsCheck({ ...base, lastSignalSeq: null })).toBe(true)
    expect(shouldRunFullNotificationsCheck({ ...base, lastFullCheckAt: null })).toBe(true)
  })

  it('al cumplirse el máximo la hace aunque no haya eventos (cubre lo que no llega por eventos)', () => {
    expect(shouldRunFullNotificationsCheck({ ...base, now: 1_299_999 })).toBe(false)
    expect(shouldRunFullNotificationsCheck({ ...base, now: 1_300_000 })).toBe(true)
  })

  it('un seq que baja (se purgaron eventos) también cuenta como cambio', () => {
    expect(shouldRunFullNotificationsCheck({ ...base, signalSeq: 0 })).toBe(true)
  })
})

describe('initialPollDelayMs', () => {
  const base = { seededFromServer: false, deferForOpenParam: false, intervalMs: 30_000 }

  it('si el servidor ya sembró las novedades, el primer sondeo espera al intervalo normal (no repite la carga)', () => {
    expect(initialPollDelayMs({ ...base, seededFromServer: true })).toBe(30_000)
    expect(initialPollDelayMs({ ...base, seededFromServer: true, deferForOpenParam: true })).toBe(30_000)
  })

  it('sin sembrar, sondea ya; con ?open= espera un poco para dejar abrir el drawer', () => {
    expect(initialPollDelayMs(base)).toBe(0)
    expect(initialPollDelayMs({ ...base, deferForOpenParam: true })).toBe(DEFERRED_POLL_MS)
  })

  it('en el inicio, si el servidor aún va a sembrar, espera un margen corto (no los 30 s) por si la carga falla', () => {
    expect(initialPollDelayMs({ ...base, serverWillSeed: true })).toBe(SERVER_SEED_GRACE_MS)
    expect(SERVER_SEED_GRACE_MS).toBeLessThan(base.intervalMs)
  })

  it('ya sembrado manda sobre todo lo demás', () => {
    expect(
      initialPollDelayMs({ ...base, seededFromServer: true, serverWillSeed: true })
    ).toBe(30_000)
  })
})

describe('shouldAcknowledgeEventsSeen', () => {
  const ack = { signalSeq: 42, lastAcknowledgedSeq: 40, windowVisible: true, usedRecentSnapshots: false }

  it('con la ventana a la vista y un evento más nuevo que el último avisado, avisa', () => {
    expect(shouldAcknowledgeEventsSeen(ack)).toBe(true)
  })

  it('la primera vez (nada avisado todavía) avisa', () => {
    expect(shouldAcknowledgeEventsSeen({ ...ack, lastAcknowledgedSeq: null })).toBe(true)
  })

  it('con la ventana oculta no avisa: el push debe llegar como siempre', () => {
    expect(shouldAcknowledgeEventsSeen({ ...ack, windowVisible: false })).toBe(false)
  })

  it('tras una comprobación con snapshots reutilizados no avisa: pueden ir por detrás de los eventos', () => {
    expect(shouldAcknowledgeEventsSeen({ ...ack, usedRecentSnapshots: true })).toBe(false)
  })

  it('sin evento nuevo no repite el aviso', () => {
    expect(shouldAcknowledgeEventsSeen({ ...ack, signalSeq: 40 })).toBe(false)
    expect(shouldAcknowledgeEventsSeen({ ...ack, signalSeq: 39 })).toBe(false)
  })

  it('sin seq (señal apagada) o con seq 0 no avisa', () => {
    expect(shouldAcknowledgeEventsSeen({ ...ack, signalSeq: null })).toBe(false)
    expect(shouldAcknowledgeEventsSeen({ ...ack, signalSeq: 0, lastAcknowledgedSeq: null })).toBe(false)
  })
})
