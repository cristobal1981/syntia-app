import { describe, expect, it } from 'vitest'

import { restrictNotifyPartnerIds } from '@/src/modules/portal/domain/notify-partner-ids'

describe('restrictNotifyPartnerIds', () => {
  it('deja pasar solo a los responsables reales del registro', () => {
    expect(restrictNotifyPartnerIds([701, 999, 902], [701, 902])).toEqual([701, 902])
  })

  it('descarta a cualquier contacto que no sea responsable (otro cliente, un id inventado)', () => {
    expect(restrictNotifyPartnerIds([5, 6, 7], [701])).toEqual([])
  })

  it('sin responsables en el servidor no avisa a nadie, pida lo que pida el navegador', () => {
    expect(restrictNotifyPartnerIds([701], [])).toEqual([])
  })

  it('no repite ids ni acepta valores no enteros o no positivos', () => {
    expect(restrictNotifyPartnerIds([701, 701, 0, -3, 1.5, Number.NaN], [701, 0, -3, 1.5])).toEqual([701])
  })

  it('si el navegador no pide a nadie, no se avisa a nadie', () => {
    expect(restrictNotifyPartnerIds([], [701, 902])).toEqual([])
  })
})
