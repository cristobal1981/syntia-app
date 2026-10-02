import { describe, expect, it } from 'vitest'

import { isDangerousDriveUpload } from '@/src/modules/documents/infrastructure/drive-env'

describe('isDangerousDriveUpload', () => {
  it('permite documentos normales de negocio', () => {
    expect(isDangerousDriveUpload('factura.pdf', 'application/pdf')).toBe(false)
    expect(isDangerousDriveUpload('contrato.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')).toBe(false)
    expect(isDangerousDriveUpload('foto.jpg', 'image/jpeg')).toBe(false)
    expect(isDangerousDriveUpload('datos.csv', 'text/csv')).toBe(false)
    expect(isDangerousDriveUpload('archivo.zip', 'application/zip')).toBe(false)
  })

  it('bloquea extensiones ejecutables conocidas', () => {
    expect(isDangerousDriveUpload('virus.exe', 'application/octet-stream')).toBe(true)
    expect(isDangerousDriveUpload('script.bat', 'application/octet-stream')).toBe(true)
    expect(isDangerousDriveUpload('instalador.msi', 'application/octet-stream')).toBe(true)
    expect(isDangerousDriveUpload('payload.js', 'text/javascript')).toBe(true)
    expect(isDangerousDriveUpload('malware.scr', 'application/octet-stream')).toBe(true)
  })

  it('bloquea por mimetype aunque la extensión esté disfrazada', () => {
    expect(isDangerousDriveUpload('factura.pdf', 'application/x-msdownload')).toBe(true)
  })

  it('no distingue mayúsculas/minúsculas en la extensión', () => {
    expect(isDangerousDriveUpload('VIRUS.EXE', 'application/octet-stream')).toBe(true)
  })

  it('no bloquea un archivo sin extensión', () => {
    expect(isDangerousDriveUpload('README', 'text/plain')).toBe(false)
  })
})
