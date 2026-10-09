import { describe, expect, it } from 'vitest'

import type { DriveUiErrorCode } from '@/src/modules/documents/domain/drive-error-presentation'
import { planFolderLoadFailure } from '@/src/modules/documents/domain/drive-stale-recovery'

const plan = (over: Partial<Parameters<typeof planFolderLoadFailure>[0]>) =>
  planFolderLoadFailure({
    code: 'not_found',
    requestedFolderId: 'hija',
    currentFolderId: 'padre',
    hasListing: true,
    ...over,
  })

describe('planFolderLoadFailure — Drive cambia por detrás, la lista no se pierde', () => {
  it('primera carga fallida: no hay lista que conservar → aviso a pantalla completa', () => {
    expect(plan({ hasListing: false, requestedFolderId: undefined, currentFolderId: null })).toEqual({
      listing: 'clear',
      fallback: 'none',
      context: 'load',
    })
  })

  it('abro una carpeta que ya no existe: conservo lo que veía y resincronizo la actual', () => {
    expect(plan({})).toEqual({ listing: 'keep', fallback: 'refresh-current', context: 'folder' })
  })

  it('refresco la carpeta en la que estaba y ya no existe: a Inicio con aviso', () => {
    expect(plan({ requestedFolderId: 'padre', currentFolderId: 'padre' })).toEqual({
      listing: 'keep',
      fallback: 'go-home',
      context: 'home',
    })
  })

  it('la propia raíz ya no existe: no hay a dónde volver → aviso, sin bucle', () => {
    expect(plan({ requestedFolderId: undefined })).toEqual({
      listing: 'clear',
      fallback: 'none',
      context: 'load',
    })
  })

  it.each(['drive_unavailable', 'timeout', 'rate_limited', 'offline', 'unexpected'] as DriveUiErrorCode[])(
    'fallo pasajero (%s) con lista: se conserva la lista y NO se hace nada automático',
    (code) => {
      expect(plan({ code })).toEqual({ listing: 'keep', fallback: 'none', context: 'folder' })
      expect(plan({ code, requestedFolderId: 'padre' }).fallback).toBe('none')
    }
  )

  it.each(['session_expired', 'forbidden', 'not_linked', 'not_configured'] as DriveUiErrorCode[])(
    '%s invalida la sección: se sustituye la lista por el aviso',
    (code) => {
      expect(plan({ code })).toEqual({ listing: 'clear', fallback: 'none', context: 'load' })
    }
  )

  it('jamás pide dos sincronizaciones: el plan tiene una sola salida', () => {
    const codes: DriveUiErrorCode[] = ['not_found', 'timeout', 'forbidden', 'offline']
    for (const code of codes) {
      for (const requestedFolderId of [undefined, 'padre', 'hija']) {
        for (const hasListing of [true, false]) {
          const result = plan({ code, requestedFolderId, hasListing })
          expect(['none', 'refresh-current', 'go-home']).toContain(result.fallback)
          if (result.listing === 'clear') expect(result.fallback).toBe('none')
        }
      }
    }
  })
})
