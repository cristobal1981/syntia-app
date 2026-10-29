import { describe, expect, it, vi } from 'vitest'

import {
  MAX_CONSECUTIVE_REJECTIONS,
  runPushDispatch,
  type PushDispatchDeps,
} from '@/src/modules/push/application/run-push-dispatch'
import { MAX_SENT_KEYS, pushKeyForNotification } from '@/src/modules/push/domain/push-dispatch'
import type { PortalNotification } from '@/src/modules/portal/domain/portal-notifications-types'
import type {
  DispatchSubscription,
  PushRecipient,
} from '@/src/modules/push/infrastructure/push-subscriptions.supabase'

const notification: PortalNotification = {
  scope: 'tramite',
  recordId: 1,
  name: 'IRPF',
  reason: 'unread_chatter',
  latestDate: '2026-10-20 10:00:00',
  listKind: 'tramite',
  latestMessageId: 10,
}

function sub(partial: Partial<DispatchSubscription> = {}): DispatchSubscription {
  return {
    id: 's1',
    userId: 'u1',
    endpoint: 'https://push.example/1',
    p256dh: 'k',
    auth: 'a',
    preferences: { chatter: true, status: true, firmas: true },
    sentKeys: [],
    baselined: true,
    failureCount: 0,
    lastEventSeq: null,
    ...partial,
  }
}

function recipient(partial: Partial<PushRecipient> = {}): PushRecipient {
  return {
    id: 'u1',
    email: 'a@b.c',
    role: 'client',
    authUserId: 'auth-1',
    status: 'active',
    isActive: true,
    ...partial,
  }
}

function setup(overrides: Partial<PushDispatchDeps> = {}, subs = [sub()], rec = recipient()) {
  const deps: PushDispatchDeps = {
    listSubscriptions: vi.fn().mockResolvedValue(subs),
    fetchRecipients: vi.fn().mockResolvedValue(new Map([[rec.id, rec]])),
    loadNotifications: vi.fn().mockResolvedValue([notification]),
    send: vi.fn().mockResolvedValue('ok'),
    loadMessagePreview: vi.fn().mockResolvedValue('Hola, ¿puedes subir el modelo 303?'),
    saveState: vi.fn().mockResolvedValue(undefined),
    saveFailureCount: vi.fn().mockResolvedValue(undefined),
    deleteByIds: vi.fn().mockResolvedValue(undefined),
    acquireLock: vi.fn().mockResolvedValue(true),
    releaseLock: vi.fn().mockResolvedValue(undefined),
    now: () => 0,
    order: (items) => items,
    ...overrides,
  }
  return deps
}

const options = { deadlineAt: 1000 }

describe('runPushDispatch', () => {
  it('manda el aviso nuevo y guarda la clave enviada', async () => {
    const deps = setup()
    const summary = await runPushDispatch(deps, options)

    expect(deps.send).toHaveBeenCalledTimes(1)
    expect(deps.saveState).toHaveBeenCalledWith('s1', [pushKeyForNotification(notification)])
    expect(summary).toMatchObject({ users: 1, sent: 1, removed: 0, skipped: 0 })
  })

  it('no repite un aviso ya enviado ni escribe en BD si no hay cambios', async () => {
    const deps = setup({}, [sub({ sentKeys: [pushKeyForNotification(notification)] })])
    const summary = await runPushDispatch(deps, options)

    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.saveState).not.toHaveBeenCalled()
    expect(summary.sent).toBe(0)
  })

  it('guarda aunque la lista de claves siga con el mismo tamaño (recorte al máximo)', async () => {
    const full = Array.from({ length: MAX_SENT_KEYS }, (_, i) => `old-${i}`)
    const deps = setup({}, [
      sub({
        sentKeys: full,
        preferences: { chatter: false, status: true, firmas: true },
      }),
    ])
    await runPushDispatch(deps, options)

    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.saveState).toHaveBeenCalledTimes(1)
  })

  it('la primera ejecución toma la foto inicial sin mandar', async () => {
    const deps = setup({}, [sub({ baselined: false })])
    await runPushDispatch(deps, options)

    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.saveState).toHaveBeenCalledWith('s1', [pushKeyForNotification(notification)])
  })

  it('una suscripción caducada (gone) se borra y no se guarda estado', async () => {
    const deps = setup({ send: vi.fn().mockResolvedValue('gone') })
    const summary = await runPushDispatch(deps, options)

    expect(deps.deleteByIds).toHaveBeenCalledWith(['s1'])
    expect(deps.saveState).not.toHaveBeenCalled()
    expect(summary.removed).toBe(1)
  })

  it('si el envío falla no guarda lo enviado, para reintentar', async () => {
    const deps = setup({ send: vi.fn().mockResolvedValue('error') })
    const summary = await runPushDispatch(deps, options)

    expect(deps.saveState).not.toHaveBeenCalled()
    expect(deps.deleteByIds).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ sent: 0, skipped: 1, failed: 1, rejected: 0 })
  })

  it.each([
    ['usuario inexistente', undefined],
    ['archivado', recipient({ status: 'Archived' })],
    ['desactivado', recipient({ isActive: false })],
    ['rol de asesor', recipient({ role: 'advisor' })],
  ])('borra las suscripciones de un %s sin calcular avisos', async (_name, rec) => {
    const deps = setup(
      { fetchRecipients: vi.fn().mockResolvedValue(rec ? new Map([['u1', rec]]) : new Map()) }
    )
    const summary = await runPushDispatch(deps, options)

    expect(deps.loadNotifications).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.deleteByIds).toHaveBeenCalledWith(['s1'])
    expect(summary.removed).toBe(1)
  })

  it('un colaborador sigue siendo destinatario', async () => {
    const deps = setup({}, [sub()], recipient({ role: 'worker' }))
    await runPushDispatch(deps, options)
    expect(deps.send).toHaveBeenCalledTimes(1)
  })

  it('si no se pueden calcular los avisos de un usuario, se salta sin borrar', async () => {
    const deps = setup({ loadNotifications: vi.fn().mockResolvedValue(null) })
    const summary = await runPushDispatch(deps, options)

    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.deleteByIds).not.toHaveBeenCalled()
    expect(summary.skipped).toBe(1)
  })

  it('un fallo al calcular avisos de un usuario no frena a los demás', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const subs = [sub({ id: 's1', userId: 'u1' }), sub({ id: 's2', userId: 'u2' })]
    const deps = setup(
      {
        fetchRecipients: vi.fn().mockResolvedValue(
          new Map([
            ['u1', recipient({ id: 'u1' })],
            ['u2', recipient({ id: 'u2' })],
          ])
        ),
        loadNotifications: vi
          .fn()
          .mockRejectedValueOnce(new Error('odoo'))
          .mockResolvedValue([notification]),
      },
      subs
    )
    const summary = await runPushDispatch(deps, options)

    expect(summary).toMatchObject({ sent: 1, skipped: 1 })
  })

  it('cada dispositivo del mismo usuario usa sus propias preferencias', async () => {
    const subs = [
      sub({ id: 's1' }),
      sub({ id: 's2', preferences: { chatter: false, status: true, firmas: true } }),
    ]
    const deps = setup({}, subs)
    const summary = await runPushDispatch(deps, options)

    expect(deps.send).toHaveBeenCalledTimes(1)
    expect(summary.sent).toBe(1)
    expect(deps.loadNotifications).toHaveBeenCalledTimes(1)
  })

  it('al pasar el tiempo disponible deja de procesar y lo indica', async () => {
    const deps = setup({ now: () => 2000 })
    const summary = await runPushDispatch(deps, options)

    expect(deps.loadNotifications).not.toHaveBeenCalled()
    expect(summary.truncated).toBe(true)
  })

  it('sin suscripciones no hace nada', async () => {
    const deps = setup({}, [])
    const summary = await runPushDispatch(deps, options)
    expect(summary).toEqual({
      users: 0,
      sent: 0,
      removed: 0,
      skipped: 0,
      rejected: 0,
      failed: 0,
      truncated: false,
      locked: false,
    })
    expect(deps.deleteByIds).not.toHaveBeenCalled()
  })

  it('el aviso de un mensaje lleva el extracto leído de Odoo', async () => {
    const deps = setup()
    await runPushDispatch(deps, options)

    expect(deps.loadMessagePreview).toHaveBeenCalledWith(10)
    expect(deps.send).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: 'Hola, ¿puedes subir el modelo 303?' })
    )
  })

  it('el mismo mensaje para varios dispositivos se lee de Odoo una sola vez', async () => {
    const deps = setup({}, [sub({ id: 's1' }), sub({ id: 's2' })])
    await runPushDispatch(deps, options)

    expect(deps.send).toHaveBeenCalledTimes(2)
    expect(deps.loadMessagePreview).toHaveBeenCalledTimes(1)
  })

  it('si no se puede leer el mensaje, el aviso sale con el texto genérico', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = setup({ loadMessagePreview: vi.fn().mockRejectedValue(new Error('odoo')) })
    await runPushDispatch(deps, options)

    expect(deps.send).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ body: 'Tu asesoría te ha escrito.' })
    )
  })

  it('con varios avisos no se leen mensajes: es un resumen', async () => {
    const deps = setup({
      loadNotifications: vi.fn().mockResolvedValue([
        notification,
        { ...notification, recordId: 2, latestMessageId: 20 },
      ]),
    })
    await runPushDispatch(deps, options)

    expect(deps.loadMessagePreview).not.toHaveBeenCalled()
  })

  it('un aviso de estado con id de mensaje tampoco lee el mensaje', async () => {
    const deps = setup({
      loadNotifications: vi.fn().mockResolvedValue([
        { ...notification, reason: 'status_change', latestMessageId: 77 },
      ]),
    })
    await runPushDispatch(deps, options)

    expect(deps.loadMessagePreview).not.toHaveBeenCalled()
  })

  it('un aviso que no es de chatter no lee ningún mensaje', async () => {
    const deps = setup({
      loadNotifications: vi.fn().mockResolvedValue([
        { ...notification, reason: 'status_change', latestMessageId: undefined },
      ]),
    })
    await runPushDispatch(deps, options)

    expect(deps.loadMessagePreview).not.toHaveBeenCalled()
  })
})

function twoUsers(overrides: Partial<PushDispatchDeps> = {}, subs: DispatchSubscription[] = []) {
  return setup(
    {
      fetchRecipients: vi.fn().mockResolvedValue(
        new Map([
          ['u1', recipient({ id: 'u1' })],
          ['u2', recipient({ id: 'u2' })],
        ])
      ),
      ...overrides,
    },
    subs.length
      ? subs
      : [sub({ id: 's1', userId: 'u1' }), sub({ id: 's2', userId: 'u2' })]
  )
}

describe('runPushDispatch: cerrojo de ejecución', () => {
  it('si otra ejecución tiene el cerrojo no hace nada y no lo suelta', async () => {
    const deps = setup({ acquireLock: vi.fn().mockResolvedValue(false) })
    const summary = await runPushDispatch(deps, options)

    expect(summary.locked).toBe(true)
    expect(deps.listSubscriptions).not.toHaveBeenCalled()
    expect(deps.send).not.toHaveBeenCalled()
    expect(deps.releaseLock).not.toHaveBeenCalled()
  })

  it('suelta el cerrojo al terminar', async () => {
    const deps = setup()
    const summary = await runPushDispatch(deps, options)

    expect(summary.locked).toBe(false)
    expect(deps.releaseLock).toHaveBeenCalledTimes(1)
  })

  it('suelta el cerrojo aunque la ejecución falle', async () => {
    const deps = setup({ listSubscriptions: vi.fn().mockRejectedValue(new Error('bd')) })

    await expect(runPushDispatch(deps, options)).rejects.toThrow('bd')
    expect(deps.releaseLock).toHaveBeenCalledTimes(1)
  })
})

describe('runPushDispatch: aislamiento de fallos', () => {
  it('si falla guardar el estado de un dispositivo, los demás se procesan igual', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = twoUsers({
      saveState: vi.fn().mockRejectedValueOnce(new Error('bd')).mockResolvedValue(undefined),
    })
    const summary = await runPushDispatch(deps, options)

    expect(deps.send).toHaveBeenCalledTimes(2)
    expect(deps.saveState).toHaveBeenCalledTimes(2)
    expect(summary.skipped).toBe(1)
  })

  it('un dispositivo que falla no impide borrar los caducados', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = twoUsers({
      send: vi.fn().mockResolvedValueOnce('gone').mockResolvedValue('ok'),
      saveState: vi.fn().mockRejectedValue(new Error('bd')),
    })
    const summary = await runPushDispatch(deps, options)

    expect(deps.deleteByIds).toHaveBeenCalledWith(['s1'])
    expect(summary.removed).toBe(1)
  })

  it('si falla el borrado final devuelve igualmente el resumen', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = setup({
      send: vi.fn().mockResolvedValue('gone'),
      deleteByIds: vi.fn().mockRejectedValue(new Error('bd')),
    })
    const summary = await runPushDispatch(deps, options)

    expect(summary.removed).toBe(0)
    expect(deps.releaseLock).toHaveBeenCalledTimes(1)
  })
})

describe('runPushDispatch: envíos rechazados', () => {
  it('un rechazo cuenta el fallo, no guarda lo enviado y no borra', async () => {
    const deps = setup(
      { send: vi.fn().mockResolvedValue('rejected') },
      [sub({ failureCount: 2 })]
    )
    const summary = await runPushDispatch(deps, options)

    expect(deps.saveFailureCount).toHaveBeenCalledWith('s1', 3)
    expect(deps.saveState).not.toHaveBeenCalled()
    expect(deps.deleteByIds).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ sent: 0, skipped: 1, removed: 0, rejected: 1, failed: 0 })
  })

  it('un error transitorio no cuenta como rechazo', async () => {
    const deps = setup({ send: vi.fn().mockResolvedValue('error') })
    const summary = await runPushDispatch(deps, options)

    expect(deps.saveFailureCount).not.toHaveBeenCalled()
    expect(summary).toMatchObject({ rejected: 0, failed: 1 })
  })

  it('al llegar al máximo de rechazos seguidos se da de baja si otros envíos funcionan', async () => {
    const deps = twoUsers(
      { send: vi.fn().mockResolvedValueOnce('rejected').mockResolvedValue('ok') },
      [
        sub({ id: 's1', userId: 'u1', failureCount: MAX_CONSECUTIVE_REJECTIONS - 1 }),
        sub({ id: 's2', userId: 'u2' }),
      ]
    )
    const summary = await runPushDispatch(deps, options)

    expect(deps.deleteByIds).toHaveBeenCalledWith(['s1'])
    expect(summary).toMatchObject({ sent: 1, removed: 1 })
  })

  it('un rechazo por debajo del máximo no se da de baja aunque otros funcionen', async () => {
    const deps = twoUsers(
      { send: vi.fn().mockResolvedValueOnce('rejected').mockResolvedValue('ok') },
      [
        sub({ id: 's1', userId: 'u1', failureCount: MAX_CONSECUTIVE_REJECTIONS - 2 }),
        sub({ id: 's2', userId: 'u2' }),
      ]
    )
    await runPushDispatch(deps, options)

    expect(deps.deleteByIds).not.toHaveBeenCalled()
  })

  it('si ningún envío sale bien (fallo del servidor) no se da de baja a nadie', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})
    const deps = setup(
      { send: vi.fn().mockResolvedValue('rejected') },
      [sub({ failureCount: MAX_CONSECUTIVE_REJECTIONS })]
    )
    const summary = await runPushDispatch(deps, options)

    expect(deps.deleteByIds).not.toHaveBeenCalled()
    expect(summary.removed).toBe(0)
  })
})
