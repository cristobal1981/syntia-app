import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { Input } from '@/components/ui/input'
import { NO_AUTOFILL } from '@/components/ui/no-autofill'

const ROOT = join(import.meta.dirname, '..', '..')

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return path.endsWith('.tsx') ? [path] : []
  })
}

describe('NO_AUTOFILL', () => {
  it('pinta en el HTML los atributos de cada gestor de contraseñas', () => {
    const html = renderToStaticMarkup(createElement(Input, { ...NO_AUTOFILL, name: 'x' }))

    expect(html).toContain('autoComplete="off"')
    expect(html).toContain('data-1p-ignore="true"')
    expect(html).toContain('data-bwignore="true"')
    expect(html).toContain('data-lpignore="true"')
    expect(html).toContain('data-form-type="other"')
  })

  it('un atributo posterior no pisa los de NO_AUTOFILL salvo que se pase a propósito', () => {
    const html = renderToStaticMarkup(createElement(Input, { ...NO_AUTOFILL, id: 'a' }))

    expect(html).toContain('id="a"')
    expect(html).toContain('data-bwignore="true"')
  })
})

/**
 * Estos módulos recogen datos de otras personas (clientes, gestores, trabajadores,
 * trámites): un `autoComplete` de dato personal (`given-name`, `email`, `tel`...)
 * haría que el navegador o Bitwarden ofrecieran los datos propios.
 */
describe('formularios de datos de terceros', () => {
  const PERSONAL_TOKEN =
    /autoComplete="(name|given-name|additional-name|family-name|email|tel|street-address|postal-code)"/
  const MODULES = ['directory', 'alta-trabajador', 'colaboradores', 'tramites', 'leads', 'invitations']

  const files = MODULES.flatMap((module) => sourceFiles(join(ROOT, 'src/modules', module, 'ui')))

  it('encuentra archivos que revisar', () => {
    expect(files.length).toBeGreaterThan(20)
  })

  it.each(files.map((file) => [file.replace(`${ROOT}/`, ''), file]))(
    '%s no declara autoComplete de dato personal',
    (_name, file) => {
      expect(readFileSync(file, 'utf8')).not.toMatch(PERSONAL_TOKEN)
    }
  )
})
