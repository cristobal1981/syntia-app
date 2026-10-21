import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  resolveDirectoryActorId: vi.fn(),
  checkRateLimit: vi.fn(),
  upsertPushSubscription: vi.fn(),
  deletePushSubscription: vi.fn(),
  fetchPushPreferences: vi.fn(),
  updatePushPreferences: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({
  getSession: mocks.getSession,
}))
vi.mock('@/src/modules/directory/application/resolve-actor-id', () => ({
  resolveDirectoryActorId: mocks.resolveDirectoryActorId,
}))
vi.mock('@/lib/rate-limit/check-rate-limit', () => ({
  checkRateLimit: mocks.checkRateLimit,
}))
vi.mock('@/src/modules/push/infrastructure/push-subscriptions.supabase', () => ({
  upsertPushSubscription: mocks.upsertPushSubscription,
  deletePushSubscription: mocks.deletePushSubscription,
  fetchPushPreferences: mocks.fetchPushPreferences,
  updatePushPreferences: mocks.updatePushPreferences,
}))

import {
  getPushPreferencesAction,
  subscribePushAction,
  unsubscribePushAction,
  updatePushPreferencesAction,
} from '@/src/modules/push/application/push-subscription-actions'

const validInput = {
  endpoint: 'https://fcm.googleapis.com/fcm/send/abc',
  p256dh: 'BNcRdreALRFXTkOOUHK1EtK2wtaz5Ry4YfYCA_0QTpQ',
  auth: 'tBHItJI5svbpez7KI4CCXg',
}
const prefs = { chatter: true, status: false, firmas: true }

function session(role: string) {
  mocks.getSession.mockResolvedValue({
    user: { id: 'auth-1', email: 'a@b.c', name: 'A', role },
  })
}

beforeEach(() => {
  vi.resetAllMocks()
  mocks.resolveDirectoryActorId.mockResolvedValue('actor-1')
  mocks.checkRateLimit.mockResolvedValue(true)
  session('client')
})

describe('acceso', () => {
  it.each([
    ['subscribe', () => subscribePushAction(validInput)],
    ['unsubscribe', () => unsubscribePushAction(validInput.endpoint)],
    ['preferencias', () => getPushPreferencesAction(validInput.endpoint)],
    ['actualizar', () => updatePushPreferencesAction(validInput.endpoint, prefs)],
  ])('%s sin sesión es forbidden', async (_name, run) => {
    mocks.getSession.mockResolvedValue(null)
    expect(await run()).toEqual({ ok: false, error: 'forbidden' })
  })

  it('un asesor no puede suscribir dispositivos', async () => {
    session('advisor')
    expect(await subscribePushAction(validInput)).toEqual({
      ok: false,
      error: 'forbidden',
    })
    expect(mocks.upsertPushSubscription).not.toHaveBeenCalled()
  })

  it('un colaborador sí puede', async () => {
    session('worker')
    expect((await subscribePushAction(validInput)).ok).toBe(true)
  })
})

describe('subscribePushAction', () => {
  it('guarda la suscripción para el actor con las preferencias por defecto', async () => {
    const result = await subscribePushAction(validInput)
    expect(result).toEqual({
      ok: true,
      preferences: { chatter: true, status: true, firmas: true },
    })
    expect(mocks.upsertPushSubscription).toHaveBeenCalledWith(
      'actor-1',
      expect.objectContaining({ endpoint: validInput.endpoint }),
      { chatter: true, status: true, firmas: true }
    )
  })

  it('rechaza una entrada inválida sin tocar la BD', async () => {
    expect(await subscribePushAction({ ...validInput, endpoint: 'http://x' })).toEqual({
      ok: false,
      error: 'invalid',
    })
    expect(mocks.upsertPushSubscription).not.toHaveBeenCalled()
  })

  it('aplica el límite de peticiones por actor', async () => {
    mocks.checkRateLimit.mockResolvedValue(false)
    expect(await subscribePushAction(validInput)).toEqual({
      ok: false,
      error: 'rate_limited',
    })
    expect(mocks.checkRateLimit).toHaveBeenCalledWith(
      'push-subscribe:actor-1',
      expect.any(Object)
    )
    expect(mocks.upsertPushSubscription).not.toHaveBeenCalled()
  })

  it('un fallo de BD se devuelve como unavailable', async () => {
    mocks.upsertPushSubscription.mockRejectedValue(new Error('boom'))
    vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(await subscribePushAction(validInput)).toEqual({
      ok: false,
      error: 'unavailable',
    })
  })
})

describe('unsubscribePushAction', () => {
  it('borra solo con el actor de la sesión', async () => {
    expect(await unsubscribePushAction(validInput.endpoint)).toEqual({ ok: true })
    expect(mocks.deletePushSubscription).toHaveBeenCalledWith(
      'actor-1',
      validInput.endpoint
    )
  })

  it('un endpoint vacío o que no es texto es inválido', async () => {
    expect(await unsubscribePushAction('')).toEqual({ ok: false, error: 'invalid' })
    expect(await unsubscribePushAction(7)).toEqual({ ok: false, error: 'invalid' })
  })
})

describe('getPushPreferencesAction', () => {
  it('devuelve las preferencias guardadas del actor', async () => {
    mocks.fetchPushPreferences.mockResolvedValue(prefs)
    expect(await getPushPreferencesAction(validInput.endpoint)).toEqual({
      ok: true,
      preferences: prefs,
    })
    expect(mocks.fetchPushPreferences).toHaveBeenCalledWith(
      'actor-1',
      validInput.endpoint
    )
  })

  it('not_found si el servidor no conoce el dispositivo', async () => {
    mocks.fetchPushPreferences.mockResolvedValue(null)
    expect(await getPushPreferencesAction(validInput.endpoint)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })
})

describe('updatePushPreferencesAction', () => {
  it('actualiza solo si el dispositivo es del actor', async () => {
    mocks.updatePushPreferences.mockResolvedValue(true)
    expect(await updatePushPreferencesAction(validInput.endpoint, prefs)).toEqual({
      ok: true,
    })
    expect(mocks.updatePushPreferences).toHaveBeenCalledWith(
      'actor-1',
      validInput.endpoint,
      prefs
    )
  })

  it('not_found si no actualizó ninguna fila (dispositivo de otro usuario)', async () => {
    mocks.updatePushPreferences.mockResolvedValue(false)
    expect(await updatePushPreferencesAction(validInput.endpoint, prefs)).toEqual({
      ok: false,
      error: 'not_found',
    })
  })

  it('preferencias mal formadas son inválidas y no tocan la BD', async () => {
    expect(
      await updatePushPreferencesAction(validInput.endpoint, { chatter: 'si' })
    ).toEqual({ ok: false, error: 'invalid' })
    expect(mocks.updatePushPreferences).not.toHaveBeenCalled()
  })
})
