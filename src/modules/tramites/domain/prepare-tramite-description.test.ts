import { describe, expect, it } from 'vitest'

import { prepareTramiteDescription } from '@/src/modules/tramites/domain/prepare-tramite-description'

const ODOO = 'https://tena.odoo.com'

describe('prepareTramiteDescription', () => {
  it('devuelve null si no hay texto', () => {
    expect(prepareTramiteDescription(false, ODOO)).toBeNull()
    expect(prepareTramiteDescription(null, ODOO)).toBeNull()
    expect(prepareTramiteDescription('', ODOO)).toBeNull()
    expect(prepareTramiteDescription('<p><br></p>', ODOO)).toBeNull()
  })

  it('conserva el formato permitido', () => {
    expect(prepareTramiteDescription('<p>Hola <strong>mundo</strong></p>', ODOO)).toBe(
      '<p>Hola <strong>mundo</strong></p>'
    )
  })

  it('elimina scripts y atributos', () => {
    const html = prepareTramiteDescription(
      '<p onclick="x()">Hola</p><script>alert(1)</script>',
      ODOO
    )
    expect(html).toBe('<p>Hola</p>')
  })

  it('quita el enlace a Odoo pero deja el texto', () => {
    const html = prepareTramiteDescription(
      '<p><a href="https://tena.odoo.com/odoo/project/5">Ver tarea</a></p>',
      ODOO
    )
    expect(html).toBe('<p>Ver tarea</p>')
  })

  it('quita rutas internas /web# aunque el host sea otro', () => {
    const html = prepareTramiteDescription(
      '<p><a href="https://otro.example/web#id=3">Interno</a></p>',
      ODOO
    )
    expect(html).toBe('<p>Interno</p>')
  })

  it('mantiene enlaces externos', () => {
    const html = prepareTramiteDescription(
      '<p><a href="https://www.agenciatributaria.es/">AEAT</a></p>',
      ODOO
    )
    expect(html).toContain('href="https://www.agenciatributaria.es/"')
  })

  it('sin URL de Odoo configurada sigue quitando rutas internas', () => {
    const html = prepareTramiteDescription(
      '<p><a href="https://x.odoo.com/odoo/action-1">Interno</a></p>',
      undefined
    )
    expect(html).toBe('<p>Interno</p>')
  })

  it('quita cualquier enlace al host de Odoo, aunque la ruta no sea /web ni /odoo', () => {
    const html = prepareTramiteDescription(
      '<p><a href="https://tena.odoo.com/mail/view?id=1">Mensaje</a></p>',
      ODOO
    )
    expect(html).toBe('<p>Mensaje</p>')
  })
})
