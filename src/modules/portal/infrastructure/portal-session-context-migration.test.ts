import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261028120000_portal_session_context.sql'),
  'utf8',
)
const body = sql
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n')

describe('migración portal_session_context / portal_news_signal', () => {
  it('el actor sale primero por auth_user_id y, si no, por el correo en minúsculas', () => {
    const byAuth = body.indexOf('u.auth_user_id = p_auth_user_id')
    const byEmail = body.indexOf('u.email = lower(p_email)')
    expect(byAuth).toBeGreaterThan(-1)
    expect(byEmail).toBeGreaterThan(byAuth)
    expect(body).toMatch(/coalesce\(\s*\(select u\.id from users u where u\.auth_user_id/)
  })

  it('el cliente de Odoo solo cuenta si es mayor que 0', () => {
    expect(body).toMatch(/ci\.user_id = a\.id and ci\.odoo_partner_id > 0/)
  })

  it('sin actor no devuelve filas (el código usa el camino anterior)', () => {
    expect(body).toMatch(/where a\.id is not null;/)
  })

  it('la señal usa el contexto y el último seq del cliente, 0 si no hay', () => {
    expect(body).toMatch(/max\(e\.seq\) from portal_events e where e\.partner_id = c\.partner_id/)
    expect(body).toMatch(/from public\.portal_session_context\(p_auth_user_id, p_email\) c;/)
    expect(body).toMatch(/\),\s*0\s*\)::bigint/)
  })

  it.each(['portal_session_context', 'portal_news_signal'])(
    '%s solo la puede ejecutar service_role',
    (name) => {
      expect(body).toContain(
        `revoke all on function public.${name}(uuid, text) from public, anon, authenticated;`,
      )
      expect(body).toContain(
        `grant execute on function public.${name}(uuid, text) to service_role;`,
      )
    },
  )
})
