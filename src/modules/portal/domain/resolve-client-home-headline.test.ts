import { describe, expect, it } from 'vitest'

import type { ClientDashboardSnapshot } from '@/src/modules/portal/application/get-client-dashboard-snapshot'
import {
  resolveClientHomeHeadlineCase,
  resolveWorkerHomeHeadlineCase,
} from '@/src/modules/portal/domain/resolve-client-home-headline'

const ALL_CLEAR: ClientDashboardSnapshot = {
  activeTramitesAndConsultas: 0,
  obligacionesInProgress: 0,
  pendingSignatures: 0,
  nextObligacion: null,
}

const NEXT_OBLIGACION = { name: 'Modelo 303', deadline: '2026-10-20' }

describe('resolveClientHomeHeadlineCase (titular: plazo > firmas > obligaciones > trámites)', () => {
  it('returns allClear when everything is zero/null', () => {
    expect(resolveClientHomeHeadlineCase(ALL_CLEAR)).toEqual({ kind: 'allClear' })
  })

  it('a next obligacion wins over everything else, even if others are also set', () => {
    const data: ClientDashboardSnapshot = {
      ...ALL_CLEAR,
      nextObligacion: NEXT_OBLIGACION,
      pendingSignatures: 3,
      obligacionesInProgress: 2,
      activeTramitesAndConsultas: 1,
    }

    expect(resolveClientHomeHeadlineCase(data)).toEqual({
      kind: 'deadline',
      name: 'Modelo 303',
      deadline: '2026-10-20',
      href: '/obligaciones',
    })
  })

  it('pendingSignatures wins over obligacionesInProgress/activeTramites when there is no next obligacion', () => {
    const data: ClientDashboardSnapshot = {
      ...ALL_CLEAR,
      pendingSignatures: 1,
      obligacionesInProgress: 5,
      activeTramitesAndConsultas: 5,
    }

    expect(resolveClientHomeHeadlineCase(data)).toEqual({
      kind: 'signatures',
      count: 1,
      href: '/firmas',
    })
  })

  it('obligacionesInProgress wins over activeTramites when there is no deadline/signature', () => {
    const data: ClientDashboardSnapshot = {
      ...ALL_CLEAR,
      obligacionesInProgress: 4,
      activeTramitesAndConsultas: 9,
    }

    expect(resolveClientHomeHeadlineCase(data)).toEqual({
      kind: 'obligaciones',
      count: 4,
      href: '/obligaciones',
    })
  })

  it('falls through to tramites only when deadline/signatures/obligaciones are all empty', () => {
    const data: ClientDashboardSnapshot = { ...ALL_CLEAR, activeTramitesAndConsultas: 7 }

    expect(resolveClientHomeHeadlineCase(data)).toEqual({
      kind: 'tramites',
      count: 7,
      href: '/tramites',
    })
  })
})

describe('resolveWorkerHomeHeadlineCase (colaborador: trámites > obligaciones > firmas > plazo) — deliberately different order', () => {
  it('returns allClear when everything is zero/null', () => {
    expect(resolveWorkerHomeHeadlineCase(ALL_CLEAR)).toEqual({ kind: 'allClear' })
  })

  it('activeTramites wins over a next obligacion — opposite priority from the client case', () => {
    const data: ClientDashboardSnapshot = {
      ...ALL_CLEAR,
      activeTramitesAndConsultas: 2,
      nextObligacion: NEXT_OBLIGACION,
      pendingSignatures: 3,
      obligacionesInProgress: 4,
    }

    expect(resolveWorkerHomeHeadlineCase(data)).toEqual({
      kind: 'tramites',
      count: 2,
      href: '/tramites',
    })
  })

  it('without tramites, a next obligacion wins over obligacionesInProgress/pendingSignatures', () => {
    const data: ClientDashboardSnapshot = {
      ...ALL_CLEAR,
      nextObligacion: NEXT_OBLIGACION,
      pendingSignatures: 3,
      obligacionesInProgress: 4,
    }

    expect(resolveWorkerHomeHeadlineCase(data)).toEqual({
      kind: 'deadline',
      name: 'Modelo 303',
      deadline: '2026-10-20',
      href: '/obligaciones',
    })
  })

  it('without tramites/deadline, obligacionesInProgress wins over pendingSignatures — opposite priority from the client case', () => {
    const data: ClientDashboardSnapshot = {
      ...ALL_CLEAR,
      obligacionesInProgress: 4,
      pendingSignatures: 9,
    }

    expect(resolveWorkerHomeHeadlineCase(data)).toEqual({
      kind: 'obligaciones',
      count: 4,
      href: '/obligaciones',
    })
  })

  it('falls through to signatures only when tramites/deadline/obligaciones are all empty', () => {
    const data: ClientDashboardSnapshot = { ...ALL_CLEAR, pendingSignatures: 6 }

    expect(resolveWorkerHomeHeadlineCase(data)).toEqual({
      kind: 'signatures',
      count: 6,
      href: '/firmas',
    })
  })
})
