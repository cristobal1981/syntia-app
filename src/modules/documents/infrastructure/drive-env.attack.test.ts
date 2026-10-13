import { describe, expect, it } from 'vitest'

import { validateDriveItemName } from '@/src/modules/documents/infrastructure/drive-env'
import { isAllowedUploadType } from '@/src/modules/portal/domain/upload-policy'

describe('isAllowedUploadType — intentos de colar un ejecutable', () => {
  const dangerous: Array<[string, string]> = [
    ['virus.exe', 'application/octet-stream'],
    ['VIRUS.EXE', 'application/octet-stream'],
    ['virus.Exe', ''],
    ['virus.exe ', 'application/octet-stream'],
    [' virus.exe', 'application/octet-stream'],
    ['virus.exe.', 'application/octet-stream'],
    ['virus.exe..', 'application/octet-stream'],
    ['virus.exe. .', 'application/octet-stream'],
    ['virus.exe \t', 'application/octet-stream'],
    ['factura.pdf.exe', 'application/pdf'],
    ['factura.pdf.scr', 'application/pdf'],
    ['.exe', 'application/octet-stream'],
    ['a.b.c.d.bat', ''],
    ['setup.msi', ''],
    ['macro.vbs', ''],
    ['script.ps1', ''],
    ['script.js', ''],
    ['script.JS', ''],
    ['atajo.lnk', ''],
    ['instalador.dmg', ''],
    ['app.jar', ''],
    ['app.apk', ''],
    ['imagen.iso', ''],
    ['x.hta', ''],
    ['x.cmd', ''],
    ['x.com', ''],
    ['x.pif', ''],
    // Extensión inocente pero MIME ejecutable
    ['factura.pdf', 'application/x-msdownload'],
    ['factura.pdf', 'APPLICATION/X-MSDOWNLOAD'],
    ['factura.pdf', '  application/x-msdownload  '],
    ['factura.pdf', 'application/x-msdownload; charset=binary'],
    ['factura.pdf', 'application/x-msdownload;'],
    ['factura.pdf', 'Application/X-Sh; foo=bar'],
    ['factura.pdf', 'application/vnd.microsoft.portable-executable'],
    ['factura.pdf', 'application/java-archive'],
    ['factura.pdf', 'application/x-msdos-program'],
    // Extensión permitida pero el MIME declarado delata otra cosa
    ['foto.png', 'image/svg+xml'],
    ['informe.pdf', 'text/html'],
    ['informe.pdf', 'application/zip'],
    ['informe.docx', 'application/x-sh'],
    // Trucos de nombre
    ['factura.pdf‮exe.', 'application/pdf'],
    ['virus.exe\u0000.pdf', 'application/pdf'],
    ['virus.exe\u0000', 'application/pdf'],
    ['virus.exe​', 'application/octet-stream'],
    ['virus.exe﻿', 'application/octet-stream'],
  ]

  it.each(dangerous)('bloquea %j con mime %j', (name, mime) => {
    // Aceptable rechazarlo por tipo (lista blanca) o por nombre inválido.
    expect(!isAllowedUploadType(name, mime) || !validateDriveItemName(name)).toBe(true)
  })

  const harmless: Array<[string, string]> = [
    ['informe.final.v2.pdf', 'application/pdf'],
    ['exe.pdf', 'application/pdf'],
    ['executive.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['jsfile.txt', 'text/plain'],
    ['script.js.txt', 'text/plain'],
    ['balance 2026.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['ñandú.pdf', 'application/pdf'],
    ['foto.JPG', 'image/jpeg'],
    ['datos.csv', 'text/csv'],
    ['x.pdf', 'application/pdf; charset=binary'],
    ['sin-mime.pdf', ''],
    ['foto.heic', ''],
  ]

  it.each(harmless)('admite el legítimo %j (%j)', (name, mime) => {
    expect(isAllowedUploadType(name, mime)).toBe(true)
    expect(validateDriveItemName(name)).toBe(true)
  })
})

describe('validateDriveItemName — nombres hostiles', () => {
  const invalid: Array<[string, string]> = [
    ['vacío', ''],
    ['solo espacios', '   '],
    ['solo tabulador', '\t'],
    ['barra', 'a/b.pdf'],
    ['barra invertida', 'a\\b.pdf'],
    ['traversal', '..\\..\\x.pdf'],
    ['dos puntos', 'a:b.pdf'],
    ['asterisco', 'a*.pdf'],
    ['interrogación', 'a?.pdf'],
    ['comillas', 'a"b.pdf'],
    ['menor', 'a<b.pdf'],
    ['mayor', 'a>b.pdf'],
    ['pipe', 'a|b.pdf'],
    ['256 caracteres', 'a'.repeat(252) + '.pdf'],
    ['nulo', 'a\u0000b.pdf'],
    ['salto de línea', 'a\nb.pdf'],
    ['retorno de carro', 'a\rb.pdf'],
    ['control C0', 'a\u001Fb.pdf'],
    ['DEL', 'a\u007Fb.pdf'],
    ['control C1', 'a\u0085b.pdf'],
    ['RTL override', 'fdp.‮exe'],
    ['isolate', 'a⁦b.pdf'],
    ['zero width space', 'a​b.pdf'],
    ['BOM', '﻿a.pdf'],
  ]

  it.each(invalid)('rechaza %s', (_label, name) => {
    expect(validateDriveItemName(name)).toBe(false)
  })

  it('acepta exactamente 255 caracteres y rechaza 256', () => {
    expect(validateDriveItemName('a'.repeat(251) + '.pdf')).toBe(true)
    expect(validateDriveItemName('a'.repeat(252) + '.pdf')).toBe(false)
  })

  it('acepta nombres normales con espacios, acentos y emojis', () => {
    expect(validateDriveItemName('Nómina enero 2026 (final).pdf')).toBe(true)
    expect(validateDriveItemName('Factura 📄.pdf')).toBe(true)
  })
})
