import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { PULSE_STALLED_MS } from '@/src/modules/push/domain/push-health'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261028160000_push_cron_jobs.sql'),
  'utf8',
)
const body = sql
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n')

/** El texto de un job: lo que va entre `$cmd$` tras su nombre. */
function jobCommand(name: string): string {
  const start = body.indexOf(`'${name}'`)
  expect(start).toBeGreaterThan(-1)
  const open = body.indexOf('$cmd$', start) + '$cmd$'.length
  return body.slice(open, body.indexOf('$cmd$', open))
}

describe('migración push_cron_jobs', () => {
  it('no lleva ningún secreto en claro: la cabecera lo lee del Vault por nombre', () => {
    expect(body).not.toMatch(/Bearer\s+[A-Za-z0-9_\-.]{20,}/)
    for (const name of ['push-dispatch', 'push-reconcile']) {
      const command = jobCommand(name)
      expect(command).toContain(
        "(select decrypted_secret from vault.decrypted_secrets where name = 'push_dispatch_secret')",
      )
    }
  })

  it('push-dispatch: cada minuto, solo con trabajo o en el latido, contra /api/push/dispatch', () => {
    expect(body).toMatch(/'push-dispatch',\s*'\* \* \* \* \*'/)
    const command = jobCommand('push-dispatch')
    expect(command).toContain("url := 'https://app.syntia.es/api/push/dispatch'")
    expect(command).toContain('where public.dispatch_has_work()')
    expect(command).toContain('timeout_milliseconds := 60000')
  })

  it('el latido es más corto que el límite del monitor de salud (pulse_stalled)', () => {
    const match = jobCommand('push-dispatch').match(
      /extract\(minute from now\(\)\)::int % (\d+) = 0/,
    )
    expect(match).not.toBeNull()
    const heartbeatMs = Number(match![1]) * 60_000
    expect(heartbeatMs).toBeLessThan(PULSE_STALLED_MS)
  })

  it('push-reconcile: cada 30 minutos contra /api/push/reconcile y sin gating', () => {
    expect(body).toMatch(/'push-reconcile',\s*'\*\/30 \* \* \* \*'/)
    const command = jobCommand('push-reconcile')
    expect(command).toContain("url := 'https://app.syntia.es/api/push/reconcile'")
    expect(command).not.toContain('dispatch_has_work')
    expect(command).toContain('timeout_milliseconds := 60000')
  })

  it('solo programa donde puede funcionar: pg_cron, pg_net y el secreto del Vault', () => {
    expect(body).toContain("extname = 'pg_cron'")
    expect(body).toContain("extname = 'pg_net'")
    expect(body).toContain("name = 'push_dispatch_secret'")
    expect(body.match(/\breturn;/g)?.length).toBe(3)
    // Los jobs se crean después de las tres comprobaciones.
    expect(body.lastIndexOf('return;')).toBeLessThan(body.indexOf('perform cron.schedule'))
  })

  it('no duplica el job de la purga (ya está en la migración de portal_events)', () => {
    expect(body).not.toContain('purge-portal-events')
  })
})
