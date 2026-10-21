import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

type Icon = { src: string; sizes: string; purpose?: string }
type Manifest = {
  id: string
  start_url: string
  scope: string
  display: string
  icons: Icon[]
  screenshots: { src: string; sizes: string; form_factor: string }[]
  shortcuts: { name: string; url: string; icons: Icon[] }[]
}

const publicDir = join(process.cwd(), 'public')
const manifest = JSON.parse(
  readFileSync(join(publicDir, 'brand/site.webmanifest'), 'utf8')
) as Manifest

describe('site.webmanifest (instalación PWA)', () => {
  it('es instalable: standalone, inicio dentro del scope', () => {
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url.startsWith(manifest.scope)).toBe(true)
  })

  it('declara iconos any y maskable de 192 y 512, y los archivos existen', () => {
    for (const purpose of ['any', 'maskable']) {
      for (const sizes of ['192x192', '512x512']) {
        expect(
          manifest.icons.some((i) => i.purpose === purpose && i.sizes === sizes)
        ).toBe(true)
      }
    }
    const all = [...manifest.icons, ...manifest.shortcuts.flatMap((s) => s.icons)]
    for (const icon of all) {
      expect(existsSync(join(publicDir, icon.src))).toBe(true)
    }
  })

  it('los atajos apuntan dentro del scope', () => {
    for (const shortcut of manifest.shortcuts) {
      expect(shortcut.url.startsWith(manifest.scope)).toBe(true)
    }
  })

  it('las capturas existen, con tamaño declarado igual al real y formatos wide y narrow', () => {
    expect(manifest.screenshots.map((s) => s.form_factor).sort()).toEqual([
      'narrow',
      'wide',
    ])
    for (const shot of manifest.screenshots) {
      const png = readFileSync(join(publicDir, shot.src))
      const real = `${png.readUInt32BE(16)}x${png.readUInt32BE(20)}`
      expect(real).toBe(shot.sizes)
    }
  })
})
