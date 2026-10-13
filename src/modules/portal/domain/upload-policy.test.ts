import { describe, expect, it } from 'vitest'

import {
  ALLOWED_UPLOAD_EXTENSIONS,
  UPLOAD_ACCEPT_ATTRIBUTE,
  UPLOAD_MAX_FILES,
  UPLOAD_MAX_FILE_BYTES,
  UPLOAD_MAX_TOTAL_BYTES,
  findUploadPolicyViolation,
  isAllowedUploadType,
} from '@/src/modules/portal/domain/upload-policy'

const MB = 1024 * 1024
const pdf = (size = 1, name = 'a.pdf') => ({ name, mimeType: 'application/pdf', size })

describe('isAllowedUploadType — lista blanca', () => {
  it.each([
    ['factura.pdf', 'application/pdf'],
    ['foto.png', 'image/png'],
    ['foto.jpg', 'image/jpeg'],
    ['foto.JPEG', 'image/jpeg'],
    ['foto.heic', 'image/heic'],
    ['foto.webp', 'image/webp'],
    ['carta.doc', 'application/msword'],
    ['carta.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    ['hoja.xls', 'application/vnd.ms-excel'],
    ['hoja.xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
    ['pase.ppt', 'application/vnd.ms-powerpoint'],
    ['pase.pptx', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
    ['carta.odt', 'application/vnd.oasis.opendocument.text'],
    ['hoja.ods', 'application/vnd.oasis.opendocument.spreadsheet'],
    ['pase.odp', 'application/vnd.oasis.opendocument.presentation'],
    ['datos.csv', 'text/csv'],
    ['datos.csv', 'application/vnd.ms-excel'],
    ['notas.txt', 'text/plain'],
  ])('admite %s (%s)', (name, mime) => {
    expect(isAllowedUploadType(name, mime)).toBe(true)
  })

  it.each([
    'a.html', 'a.htm', 'a.svg', 'a.docm', 'a.xlsm', 'a.pptm', 'a.dotm', 'a.sh', 'a.py',
    'a.php', 'a.reg', 'a.url', 'a.exe', 'a.js', 'a.bat', 'a.jar',
    'a.zip', 'a.tar', 'a.tar.gz', 'a.gz', 'a.rar', 'a.7z', 'a.bz2', 'a.xz',
    'a.gif', 'a.bmp', 'a.tiff', 'a.ico', 'a.ai', 'a.eps', 'a.psd',
    'a.xml', 'a.json', 'a.rtf', 'a.eml', 'a.msg', 'a.odg',
    'sin-extension', 'pdf',
  ])('rechaza %s aunque el navegador no declare tipo', (name) => {
    expect(isAllowedUploadType(name, '')).toBe(false)
  })

  it('la extensión manda, no el MIME: un .exe declarado como PDF no entra', () => {
    expect(isAllowedUploadType('factura.exe', 'application/pdf')).toBe(false)
  })

  it('la doble extensión se juzga por la última', () => {
    expect(isAllowedUploadType('factura.pdf.exe', 'application/pdf')).toBe(false)
    expect(isAllowedUploadType('factura.exe.pdf', 'application/pdf')).toBe(true)
  })

  it('puntos finales no disfrazan nada: sin extensión conocida, fuera', () => {
    expect(isAllowedUploadType('virus.exe.', '')).toBe(false)
    expect(isAllowedUploadType('virus.exe. .', '')).toBe(false)
    expect(isAllowedUploadType('factura.pdf.', '')).toBe(false)
    expect(isAllowedUploadType('factura.pdf ', '')).toBe(true)
  })

  it('un MIME ajeno a la lista contradice la extensión', () => {
    expect(isAllowedUploadType('foto.png', 'image/svg+xml')).toBe(false)
    expect(isAllowedUploadType('doc.pdf', 'text/html')).toBe(false)
    expect(isAllowedUploadType('doc.pdf', 'application/zip')).toBe(false)
  })

  it('MIME vacío u octet-stream se resuelve por la extensión; parámetros y mayúsculas se ignoran', () => {
    expect(isAllowedUploadType('a.pdf', 'application/octet-stream')).toBe(true)
    expect(isAllowedUploadType('a.pdf', 'APPLICATION/PDF; foo=bar')).toBe(true)
    expect(isAllowedUploadType('a.exe', 'application/octet-stream')).toBe(false)
  })
})

describe('findUploadPolicyViolation — límites', () => {
  it('10 MB por archivo, 10 MB de suma, 10 archivos', () => {
    expect(UPLOAD_MAX_FILE_BYTES).toBe(10 * MB)
    expect(UPLOAD_MAX_TOTAL_BYTES).toBe(10 * MB)
    expect(UPLOAD_MAX_FILES).toBe(10)
  })

  it('sin archivos → empty', () => {
    expect(findUploadPolicyViolation([])).toBe('empty')
  })

  it('un archivo de exactamente 10 MB pasa; 10 MB + 1 no', () => {
    expect(findUploadPolicyViolation([pdf(10 * MB)])).toBeNull()
    expect(findUploadPolicyViolation([pdf(10 * MB + 1)])).toBe('file_too_large')
  })

  it('la suma no puede pasar de 10 MB aunque cada archivo sea pequeño', () => {
    expect(findUploadPolicyViolation([pdf(5 * MB, 'a.pdf'), pdf(5 * MB, 'b.pdf')])).toBeNull()
    expect(findUploadPolicyViolation([pdf(5 * MB, 'a.pdf'), pdf(5 * MB + 1, 'b.pdf')])).toBe(
      'total_too_large'
    )
  })

  it('10 archivos pasan; 11 no', () => {
    const files = (n: number) => Array.from({ length: n }, (_, i) => pdf(1, `f${i}.pdf`))
    expect(findUploadPolicyViolation(files(10))).toBeNull()
    expect(findUploadPolicyViolation(files(11))).toBe('too_many_files')
  })

  it('un solo archivo malo tumba todo el lote', () => {
    expect(
      findUploadPolicyViolation([pdf(1, 'ok.pdf'), { name: 'x.exe', mimeType: '', size: 1 }])
    ).toBe('invalid_type')
    expect(findUploadPolicyViolation([pdf(1, 'ok.pdf'), pdf(1, 'a/b.pdf')])).toBe('invalid_name')
  })
})

describe('UPLOAD_ACCEPT_ATTRIBUTE', () => {
  it('lista exactamente las extensiones permitidas', () => {
    expect(UPLOAD_ACCEPT_ATTRIBUTE.split(',')).toEqual(
      ALLOWED_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`)
    )
    expect(UPLOAD_ACCEPT_ATTRIBUTE).not.toMatch(/svg|html|zip|docm|xlsm/)
  })
})
