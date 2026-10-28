import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const sql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20261028140000_upsert_chatter_read_state.sql'),
  'utf8',
)
const body = sql
  .split('\n')
  .filter((line) => !line.trimStart().startsWith('--'))
  .join('\n')

describe('migración upsert_chatter_read_state', () => {
  it('el «visto» nunca retrocede: greatest() entre lo guardado y lo nuevo', () => {
    expect(body).toMatch(
      /last_seen_message_id = greatest\(\s*chatter_read_state\.last_seen_message_id,\s*excluded\.last_seen_message_id\s*\)/,
    )
  })

  it('solo escribe si el mensaje avanza (no genera filas muertas al repetir el mismo «visto»)', () => {
    expect(body).toMatch(
      /where excluded\.last_seen_message_id > chatter_read_state\.last_seen_message_id/,
    )
  })

  it('el conflicto es la clave única real de la tabla', () => {
    expect(body).toMatch(/on conflict \(user_id, record_kind, record_id\)/)
  })

  it('agrupa los duplicados de la llamada con el máximo (un insert … on conflict los rechazaría)', () => {
    expect(body).toMatch(/max\(e\.last_seen_message_id\)/)
    expect(body).toMatch(/group by u\.id, e\.record_kind, e\.record_id/)
  })

  it('escribe a cada miembro del grupo (cross join de usuarios y entradas)', () => {
    expect(body).toMatch(
      /from unnest\(p_user_ids\) as u\(id\)\s+cross join jsonb_to_recordset\(p_entries\)/,
    )
  })

  it('solo la puede ejecutar service_role', () => {
    expect(body).toContain(
      'revoke all on function public.upsert_chatter_read_state(uuid[], jsonb) from public, anon, authenticated;',
    )
    expect(body).toContain(
      'grant execute on function public.upsert_chatter_read_state(uuid[], jsonb) to service_role;',
    )
  })
})
