import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

import { EVENT_MAX_AGE_MS } from '@/src/modules/push/application/run-event-push-dispatch'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261028100000_dispatch_has_work.sql'),
  'utf8',
)

/** Solo el cuerpo de la función, sin los comentarios que explican el plazo. */
const body = sql
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n')

describe('migración dispatch_has_work', () => {
  it('el plazo de eventos de la función es el mismo que usa el dispatcher', () => {
    const match = body.match(/now\(\) - interval '(\d+) (hour|minute)s?'/)
    expect(match).not.toBeNull()
    const amount = Number(match![1])
    const ms = match![2] === 'hour' ? amount * 3_600_000 : amount * 60_000
    expect(ms).toBe(EVENT_MAX_AGE_MS)
  })

  it('cuenta los dispositivos sin foto inicial y los eventos posteriores al cursor más atrasado', () => {
    expect(body).toMatch(/last_event_seq is null/)
    expect(body).toMatch(/e\.seq > \(\s*select min\(last_event_seq\)/)
  })

  it('solo la puede ejecutar service_role (ni anon ni authenticated)', () => {
    expect(body).toMatch(
      /revoke all on function public\.dispatch_has_work\(\) from public, anon, authenticated;/,
    )
    expect(body).toMatch(/grant execute on function public\.dispatch_has_work\(\) to service_role;/)
  })
})
