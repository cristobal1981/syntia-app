import { describe, expect, it } from 'vitest'

import {
  validateChatterCandidates,
  validateChatterUploadFiles,
} from '@/src/modules/portal/lib/chatter-attachment-validation'

const MB = 1024 * 1024
const upload = (name: string, mimetype: string, bytes = 10) => ({
  name,
  mimetype,
  dataBase64: Buffer.alloc(bytes, 1).toString('base64'),
})

describe('validateChatterUploadFiles — misma política que Documentos', () => {
  it('admite PDF, imagen y Office', () => {
    expect(
      validateChatterUploadFiles([
        upload('a.pdf', 'application/pdf'),
        upload('b.png', 'image/png'),
        upload('c.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'),
      ])
    ).toEqual({ ok: true })
  })

  it.each([
    ['a.zip', 'application/zip'],
    ['a.svg', 'image/svg+xml'],
    ['a.html', 'text/html'],
    ['a.docm', 'application/vnd.ms-word.document.macroEnabled.12'],
    ['a.exe', 'application/pdf'],
    ['a.gif', 'image/gif'],
    ['sin-extension', 'application/pdf'],
  ])('rechaza %s (%s) como invalid_attachment', (name, mime) => {
    expect(validateChatterUploadFiles([upload(name, mime)])).toEqual({
      ok: false,
      error: 'invalid_attachment',
    })
  })

  it('un archivo de 10 MB pasa; 10 MB + 1 → attachment_too_large', () => {
    expect(validateChatterUploadFiles([upload('a.pdf', 'application/pdf', 10 * MB)])).toEqual({
      ok: true,
    })
    expect(validateChatterUploadFiles([upload('a.pdf', 'application/pdf', 10 * MB + 1)])).toEqual({
      ok: false,
      error: 'attachment_too_large',
    })
  })

  it('la suma de adjuntos no puede pasar de 10 MB', () => {
    expect(
      validateChatterUploadFiles([
        upload('a.pdf', 'application/pdf', 6 * MB),
        upload('b.pdf', 'application/pdf', 6 * MB),
      ])
    ).toEqual({ ok: false, error: 'attachment_too_large' })
  })

  it('10 archivos pasan; 11 → too_many_attachments', () => {
    const many = (n: number) =>
      Array.from({ length: n }, (_, i) => upload(`f${i}.pdf`, 'application/pdf'))
    expect(validateChatterUploadFiles(many(10))).toEqual({ ok: true })
    expect(validateChatterUploadFiles(many(11))).toEqual({
      ok: false,
      error: 'too_many_attachments',
    })
  })

  it('nombre con caracteres ocultos → invalid_attachment', () => {
    expect(validateChatterUploadFiles([upload('fdp.‮exe.pdf', 'application/pdf')])).toEqual({
      ok: false,
      error: 'invalid_attachment',
    })
  })
})

describe('validateChatterCandidates — selección en el cliente', () => {
  it('suma lo ya pendiente con lo nuevo', () => {
    const pending = [{ name: 'a.pdf', mimeType: 'application/pdf', size: 8 * MB }]
    const incoming = [{ name: 'b.pdf', mimeType: 'application/pdf', size: 3 * MB }]
    expect(validateChatterCandidates([...pending, ...incoming])).toEqual({
      ok: false,
      error: 'attachment_too_large',
    })
  })

  it('MIME vacío con extensión permitida (navegador que no lo sabe) entra', () => {
    expect(
      validateChatterCandidates([{ name: 'foto.heic', mimeType: '', size: MB }])
    ).toEqual({ ok: true })
  })
})

describe('isAttachmentError', () => {
  it('reconoce solo los tres códigos de adjuntos', async () => {
    const { isAttachmentError } = await import(
      '@/src/modules/portal/lib/chatter-attachment-validation'
    )
    expect(isAttachmentError('invalid_attachment')).toBe(true)
    expect(isAttachmentError('attachment_too_large')).toBe(true)
    expect(isAttachmentError('too_many_attachments')).toBe(true)
    expect(isAttachmentError('odoo_unavailable')).toBe(false)
    expect(isAttachmentError('rate_limited')).toBe(false)
  })
})
