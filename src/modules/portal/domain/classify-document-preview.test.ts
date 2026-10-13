import { describe, expect, it } from 'vitest'

import {
  classifyDocumentPreview,
  DOCUMENT_PREVIEW_MAX_BYTES,
} from '@/src/modules/portal/domain/classify-document-preview'

describe('classifyDocumentPreview', () => {
  it('classifies an image mimetype as previewable "image"', () => {
    expect(
      classifyDocumentPreview({ name: 'foto.jpg', mimetype: 'image/jpeg', fileSize: 100 })
    ).toEqual({ category: 'image', canPreview: true })
  })

  it('matches image mimetype case-insensitively', () => {
    expect(
      classifyDocumentPreview({ name: 'foto.jpg', mimetype: 'IMAGE/JPEG', fileSize: 100 })
    ).toEqual({ category: 'image', canPreview: true })
  })

  it('classifies application/pdf as "pdf"', () => {
    expect(
      classifyDocumentPreview({ name: 'doc', mimetype: 'application/pdf', fileSize: 100 })
    ).toEqual({ category: 'pdf', canPreview: true })
  })

  it('falls back to the .pdf extension when mimetype is missing', () => {
    expect(
      classifyDocumentPreview({ name: 'informe.PDF', mimetype: undefined, fileSize: 100 })
    ).toEqual({ category: 'pdf', canPreview: true })
  })

  it('classifies the docx mimetype as "docx"', () => {
    expect(
      classifyDocumentPreview({
        name: 'x',
        mimetype:
          'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        fileSize: 100,
      })
    ).toEqual({ category: 'docx', canPreview: true })
  })

  it('falls back to the .docx extension when mimetype is missing', () => {
    expect(
      classifyDocumentPreview({ name: 'contrato.docx', mimetype: undefined, fileSize: 100 })
    ).toEqual({ category: 'docx', canPreview: true })
  })

  it('classifies the xlsx mimetype as "xlsx"', () => {
    expect(
      classifyDocumentPreview({
        name: 'x',
        mimetype:
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        fileSize: 100,
      })
    ).toEqual({ category: 'xlsx', canPreview: true })
  })

  it('falls back to the .xlsx extension when mimetype is missing', () => {
    expect(
      classifyDocumentPreview({ name: 'balance.xlsx', mimetype: undefined, fileSize: 100 })
    ).toEqual({ category: 'xlsx', canPreview: true })
  })

  it('returns "unsupported" with reason "unsupported" for an unknown type', () => {
    expect(
      classifyDocumentPreview({ name: 'archivo.zip', mimetype: 'application/zip', fileSize: 100 })
    ).toEqual({ category: 'unsupported', canPreview: false, reason: 'unsupported' })
  })

  it('returns "unsupported" with reason "too_large" when fileSize exceeds the max, even for an otherwise-previewable type', () => {
    expect(
      classifyDocumentPreview({
        name: 'foto.jpg',
        mimetype: 'image/jpeg',
        fileSize: DOCUMENT_PREVIEW_MAX_BYTES + 1,
      })
    ).toEqual({ category: 'unsupported', canPreview: false, reason: 'too_large' })
  })

  it('does NOT reject a file exactly at the max size boundary (boundary is exclusive)', () => {
    expect(
      classifyDocumentPreview({
        name: 'foto.jpg',
        mimetype: 'image/jpeg',
        fileSize: DOCUMENT_PREVIEW_MAX_BYTES,
      })
    ).toEqual({ category: 'image', canPreview: true })
  })

  it('does not apply the size guard when fileSize is not a number (e.g. unknown)', () => {
    expect(
      classifyDocumentPreview({ name: 'foto.jpg', mimetype: 'image/jpeg', fileSize: undefined })
    ).toEqual({ category: 'image', canPreview: true })
  })
})
