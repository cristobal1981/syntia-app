/**
 * Política única de subida de archivos del portal (Documentos/Drive y
 * adjuntos de Trámites/Odoo). Lista blanca: solo entra lo que se usa a diario
 * (PDF, imágenes raster comunes, Office y LibreOffice). Todo lo demás se
 * rechaza, sin intentar adivinar si es peligroso.
 *
 * El navegador declara el MIME y no es de fiar (a veces viene vacío), así que
 * la decisión la toma la extensión; el MIME solo puede contradecirla.
 */

export const UPLOAD_MAX_FILE_BYTES = 10 * 1024 * 1024
/** Suma de todos los archivos de una misma subida. */
export const UPLOAD_MAX_TOTAL_BYTES = 10 * 1024 * 1024
export const UPLOAD_MAX_FILES = 10
const UPLOAD_MAX_NAME_LENGTH = 255

const MIME_BY_EXTENSION: Readonly<Record<string, readonly string[]>> = {
  pdf: ['application/pdf'],

  png: ['image/png'],
  jpg: ['image/jpeg', 'image/pjpeg'],
  jpeg: ['image/jpeg', 'image/pjpeg'],
  heic: ['image/heic', 'image/heif'],
  webp: ['image/webp'],

  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],

  odt: ['application/vnd.oasis.opendocument.text'],
  ods: ['application/vnd.oasis.opendocument.spreadsheet'],
  odp: ['application/vnd.oasis.opendocument.presentation'],

  csv: ['text/csv', 'application/csv', 'application/vnd.ms-excel'],
  txt: ['text/plain'],
}

export const ALLOWED_UPLOAD_EXTENSIONS: readonly string[] = Object.keys(MIME_BY_EXTENSION)

const ALLOWED_MIME_TYPES: ReadonlySet<string> = new Set(
  Object.values(MIME_BY_EXTENSION).flat()
)

/** Valor para `<input accept>`: orienta al selector del sistema; no sustituye a la validación. */
export const UPLOAD_ACCEPT_ATTRIBUTE = ALLOWED_UPLOAD_EXTENSIONS.map((ext) => `.${ext}`).join(',')

const INVALID_NAME_PATTERN = /[\\/:*?"<>|]/
// Caracteres de control, espacios de ancho cero, marcas y anulaciones de
// dirección (RTL override) y BOM: sirven para disfrazar extensiones.
const HIDDEN_CHARS_PATTERN =
  /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/

export function isValidUploadFileName(name: string): boolean {
  const trimmed = name.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= UPLOAD_MAX_NAME_LENGTH &&
    !INVALID_NAME_PATTERN.test(trimmed) &&
    !HIDDEN_CHARS_PATTERN.test(name)
  )
}

function extensionOf(name: string): string {
  // Sin normalizar puntos finales: "virus.exe." no tiene extensión conocida y
  // la lista blanca lo rechaza igual.
  const normalized = name.trim().toLowerCase()
  const dot = normalized.lastIndexOf('.')
  if (dot < 0) return ''
  return normalized.slice(dot + 1)
}

function normalizeMime(mimeType: string): string {
  return mimeType.split(';')[0].trim().toLowerCase()
}

export function isAllowedUploadType(name: string, mimeType: string): boolean {
  if (!ALLOWED_UPLOAD_EXTENSIONS.includes(extensionOf(name))) return false

  const mime = normalizeMime(mimeType)
  // Vacío u octet-stream: el navegador no sabe qué es; manda la extensión.
  if (!mime || mime === 'application/octet-stream') return true
  return ALLOWED_MIME_TYPES.has(mime)
}

export type UploadPolicyViolation =
  | 'empty'
  | 'too_many_files'
  | 'invalid_name'
  | 'invalid_type'
  | 'file_too_large'
  | 'total_too_large'

export type UploadCandidate = { name: string; mimeType: string; size: number }

/** Primera infracción de una subida completa, o `null` si todo cumple. */
export function findUploadPolicyViolation(
  files: readonly UploadCandidate[]
): UploadPolicyViolation | null {
  if (files.length === 0) return 'empty'
  if (files.length > UPLOAD_MAX_FILES) return 'too_many_files'

  let total = 0
  for (const file of files) {
    if (!isValidUploadFileName(file.name)) return 'invalid_name'
    if (!isAllowedUploadType(file.name, file.mimeType)) return 'invalid_type'
    if (file.size > UPLOAD_MAX_FILE_BYTES) return 'file_too_large'
    total += file.size
  }
  if (total > UPLOAD_MAX_TOTAL_BYTES) return 'total_too_large'
  return null
}
