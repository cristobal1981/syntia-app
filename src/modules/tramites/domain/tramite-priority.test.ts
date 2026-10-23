import { describe, expect, it } from 'vitest'

import { getTramitePriorityMeta } from '@/src/modules/tramites/domain/tramite-priority'

describe('getTramitePriorityMeta', () => {
  it('cada nivel enciende una barra más, con su etiqueta', () => {
    expect([0, 1, 2, 3].map((p) => getTramitePriorityMeta(p as 0 | 1 | 2 | 3))).toEqual([
      expect.objectContaining({ level: 0, label: 'Baja', bars: 1 }),
      expect.objectContaining({ level: 1, label: 'Media', bars: 2 }),
      expect.objectContaining({ level: 2, label: 'Alta', bars: 3 }),
      expect.objectContaining({ level: 3, label: 'Urgente', bars: 4 }),
    ])
  })

  it('el color sube de gris a rojo y cada nivel tiene el suyo', () => {
    const tones = [0, 1, 2, 3].map((p) => getTramitePriorityMeta(p as 0 | 1 | 2 | 3).toneClass)
    expect(new Set(tones).size).toBe(4)
    expect(tones[0]).toContain('muted')
    expect(tones[3]).toContain('destructive')
  })
})
