import { DOCUMENT_PREVIEW_MAX_BYTES } from '@/src/modules/portal/domain/classify-document-preview'

// Máximo por archivo (subida y descarga): PDFs, modelos y fotos de facturas.
const DEFAULT_MAX_UPLOAD_BYTES = 15 * 1024 * 1024
const DEFAULT_MAX_FILES_PER_BATCH = 10
// Todo el archivo se carga en memoria al descargar (y en base64 ocupa ~1,33x).
const DEFAULT_MAX_DOWNLOAD_BYTES = 15 * 1024 * 1024

export function getDriveMaxUploadBytes(): number {
  const raw = process.env.DRIVE_MAX_UPLOAD_BYTES?.trim()
  if (!raw) return DEFAULT_MAX_UPLOAD_BYTES
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_UPLOAD_BYTES
}

export function getDriveMaxDownloadBytes(): number {
  const raw = process.env.DRIVE_MAX_DOWNLOAD_BYTES?.trim()
  if (!raw) return DEFAULT_MAX_DOWNLOAD_BYTES
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_DOWNLOAD_BYTES
}

export function getDriveMaxFilesPerBatch(): number {
  const raw = process.env.DRIVE_MAX_FILES_PER_BATCH?.trim()
  if (!raw) return DEFAULT_MAX_FILES_PER_BATCH
  const parsed = Number(raw)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_MAX_FILES_PER_BATCH
}

export function getDrivePreviewMaxBytes(): number {
  return DOCUMENT_PREVIEW_MAX_BYTES
}

const INVALID_NAME_PATTERN = /[\\/:*?"<>|]/
// Caracteres de control, espacios de ancho cero, marcas y anulaciones de
// dirección (RTL override) y BOM: sirven para disfrazar extensiones.
const HIDDEN_CHARS_PATTERN =
  /[\u0000-\u001F\u007F-\u009F​-‏‪-‮⁦-⁩﻿]/

export function validateDriveItemName(name: string): boolean {
  const trimmed = name.trim()
  return (
    trimmed.length > 0 &&
    trimmed.length <= 255 &&
    !INVALID_NAME_PATTERN.test(trimmed) &&
    !HIDDEN_CHARS_PATTERN.test(name)
  )
}

/**
 * Lista negra de extensiones ejecutables/script (mismo criterio que Gmail
 * bloquea en adjuntos). No restringimos tipos de documento legítimos
 * (pdf, docx, xlsx, imágenes, zip, csv...) — solo lo que podría ejecutarse.
 */
const DANGEROUS_EXTENSIONS = new Set([
  'ade', 'adp', 'apk', 'appx', 'appxbundle', 'bat', 'cab', 'chm', 'cmd', 'com',
  'cpl', 'diagcab', 'diagcfg', 'diagpack', 'dll', 'dmg', 'ex', 'ex_', 'exe',
  'hta', 'img', 'ins', 'iso', 'isp', 'jar', 'jnlp', 'js', 'jse', 'lib', 'lnk',
  'mde', 'msc', 'msi', 'msix', 'msixbundle', 'msp', 'mst', 'nsh', 'pif', 'ps1',
  'scr', 'sct', 'shb', 'sys', 'vb', 'vbe', 'vbs', 'vxd', 'wsc', 'wsf', 'wsh',
])

const DANGEROUS_MIME_TYPES = new Set([
  'application/x-msdownload',
  'application/x-msdos-program',
  'application/x-sh',
  'application/x-bat',
  'application/vnd.microsoft.portable-executable',
  'application/java-archive',
  'application/x-java-archive',
])

function extensionOf(name: string): string {
  // Windows ignora puntos y espacios finales: "virus.exe." se ejecuta como .exe.
  const normalized = name.trim().toLowerCase().replace(/[.\s]+$/, '')
  const dot = normalized.lastIndexOf('.')
  if (dot < 0) return ''
  return normalized.slice(dot + 1)
}

export function isDangerousDriveUpload(name: string, mimeType: string): boolean {
  if (DANGEROUS_EXTENSIONS.has(extensionOf(name))) return true
  // Se descartan los parámetros (tipo; charset=...) antes de comparar.
  if (DANGEROUS_MIME_TYPES.has(mimeType.split(';')[0].trim().toLowerCase())) return true
  return false
}
