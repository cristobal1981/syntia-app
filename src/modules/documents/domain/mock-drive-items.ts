import { mapDriveApiFileToItem } from '@/src/modules/documents/domain/classify-drive-item'
import {
  MOCK_IMAGE_JPEG_BASE64,
  MOCK_PDF_BASE64,
  mockImageDataUrl,
} from '@/src/modules/documents/domain/mock-drive-assets'
import { sortDriveItems } from '@/src/modules/documents/domain/sort-drive-items'
import type { DriveFolderListing, DriveItem } from '@/src/modules/documents/domain/types'
import { shouldUseMockDrive } from '@/src/modules/documents/infrastructure/drive-runtime'

export const MOCK_ROOT_ID = 'mock-root'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

const mockFolderNames: Record<string, string> = {
  [MOCK_ROOT_ID]: 'Documentos',
  'mock-fiscal': 'Fiscal 2026',
  'mock-fiscal-q1': 'Trimestre 1',
  'mock-fiscal-q2': 'Trimestre 2',
  'mock-laboral': 'Laboral',
  'mock-nominas': 'Nóminas',
  'mock-contratos': 'Contratos',
  'mock-societario': 'Societario',
  'mock-certificados': 'Certificados',
}

/** folderId → parentId (null = root has no parent). */
const mockParentByFolder: Record<string, string | null> = {
  [MOCK_ROOT_ID]: null,
  'mock-fiscal': MOCK_ROOT_ID,
  'mock-fiscal-q1': 'mock-fiscal',
  'mock-fiscal-q2': 'mock-fiscal',
  'mock-laboral': MOCK_ROOT_ID,
  'mock-nominas': 'mock-laboral',
  'mock-contratos': 'mock-laboral',
  'mock-societario': MOCK_ROOT_ID,
  'mock-certificados': MOCK_ROOT_ID,
}

function folder(id: string, name: string, modifiedAt: string): DriveItem {
  return mapDriveApiFileToItem({
    id,
    name,
    mimeType: FOLDER_MIME,
    modifiedTime: modifiedAt,
  })
}

function file(
  id: string,
  name: string,
  mimeType: string,
  modifiedAt: string,
  size: number,
  thumbnailLink?: string
): DriveItem {
  return mapDriveApiFileToItem({
    id,
    name,
    mimeType,
    modifiedTime: modifiedAt,
    size: String(size),
    thumbnailLink,
  })
}

const imageThumb = mockImageDataUrl()

const mockItemsByFolder: Record<string, DriveItem[]> = {
  [MOCK_ROOT_ID]: [
    folder('mock-fiscal', 'Fiscal 2026', '2026-03-01T10:00:00.000Z'),
    folder('mock-laboral', 'Laboral', '2026-02-20T09:00:00.000Z'),
    folder('mock-societario', 'Societario', '2026-01-15T11:30:00.000Z'),
    folder('mock-certificados', 'Certificados', '2026-01-10T08:00:00.000Z'),
    file(
      'mock-root-nota',
      'Bienvenida documentación.pdf',
      'application/pdf',
      '2026-01-05T12:00:00.000Z',
      156_000
    ),
  ],
  'mock-fiscal': [
    folder('mock-fiscal-q1', 'Trimestre 1', '2026-04-01T10:00:00.000Z'),
    folder('mock-fiscal-q2', 'Trimestre 2', '2026-07-01T10:00:00.000Z'),
    file(
      'mock-fiscal-memoria',
      'Memoria anual 2025.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '2026-03-05T08:00:00.000Z',
      245_000
    ),
    file(
      'mock-fiscal-resumen',
      'Resumen impuestos 2026.pdf',
      'application/pdf',
      '2026-03-12T14:30:00.000Z',
      512_000
    ),
  ],
  'mock-fiscal-q1': [
    file(
      'mock-fiscal-q1-303',
      'Modelo 303 T1.pdf',
      'application/pdf',
      '2026-04-20T09:00:00.000Z',
      189_000
    ),
    file(
      'mock-fiscal-q1-303-xlsx',
      'Modelo 303 T1.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '2026-04-20T09:05:00.000Z',
      89_000
    ),
    file(
      'mock-fiscal-q1-justificante',
      'Justificante AEAT T1.png',
      'image/png',
      '2026-04-21T16:00:00.000Z',
      324_000,
      imageThumb
    ),
    file(
      'mock-fiscal-q1-111',
      'Modelo 111 T1.pdf',
      'application/pdf',
      '2026-04-22T11:00:00.000Z',
      142_000
    ),
  ],
  'mock-fiscal-q2': [
    file(
      'mock-fiscal-q2-303',
      'Modelo 303 T2.pdf',
      'application/pdf',
      '2026-07-18T10:00:00.000Z',
      191_000
    ),
    file(
      'mock-fiscal-q2-borrador',
      'Borrador liquidación T2.xlsx',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      '2026-07-10T15:00:00.000Z',
      67_000
    ),
  ],
  'mock-laboral': [
    folder('mock-nominas', 'Nóminas', '2026-02-28T08:00:00.000Z'),
    folder('mock-contratos', 'Contratos', '2026-02-10T12:00:00.000Z'),
    file(
      'mock-laboral-rlc',
      'Registro laboral empresa.pdf',
      'application/pdf',
      '2026-02-01T09:00:00.000Z',
      278_000
    ),
  ],
  'mock-nominas': [
    file(
      'mock-nomina-ene',
      'Nómina enero 2026.pdf',
      'application/pdf',
      '2026-02-05T08:00:00.000Z',
      98_000
    ),
    file(
      'mock-nomina-feb',
      'Nómina febrero 2026.pdf',
      'application/pdf',
      '2026-03-05T08:00:00.000Z',
      99_000
    ),
    file(
      'mock-nomina-mar',
      'Nómina marzo 2026.pdf',
      'application/pdf',
      '2026-04-05T08:00:00.000Z',
      101_000
    ),
  ],
  'mock-contratos': [
    file(
      'mock-contrato-servicios',
      'Contrato servicios asesoría.pdf',
      'application/pdf',
      '2026-01-20T10:00:00.000Z',
      412_000
    ),
    file(
      'mock-contrato-anexo',
      'Anexo teletrabajo.docx',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      '2026-02-15T11:00:00.000Z',
      156_000
    ),
    file(
      'mock-contrato-finiquito',
      'Finiquito empleado 2025.pdf',
      'application/pdf',
      '2026-01-30T14:00:00.000Z',
      134_000
    ),
  ],
  'mock-societario': [
    file(
      'mock-soc-escritura',
      'Escritura constitución.pdf',
      'application/pdf',
      '2025-11-10T09:00:00.000Z',
      1_240_000
    ),
    file(
      'mock-soc-dni',
      'DNI administrador.jpg',
      'image/jpeg',
      '2026-01-08T13:00:00.000Z',
      890_000,
      imageThumb
    ),
    file(
      'mock-soc-poderes',
      'Poderes notariales.pdf',
      'application/pdf',
      '2025-12-01T10:00:00.000Z',
      567_000
    ),
    file(
      'mock-soc-acta',
      'Acta junta general 2026.pdf',
      'application/pdf',
      '2026-03-20T16:00:00.000Z',
      198_000
    ),
  ],
  'mock-certificados': [
    file(
      'mock-cert-digital',
      'Certificado FNMT.p12',
      'application/x-pkcs12',
      '2026-01-12T09:00:00.000Z',
      4_500
    ),
    file(
      'mock-cert-seg-social',
      'Certificado Seguridad Social.pdf',
      'application/pdf',
      '2026-02-08T11:00:00.000Z',
      210_000
    ),
    file(
      'mock-cert-censo',
      'Certificado censal AEAT.pdf',
      'application/pdf',
      '2026-02-18T15:30:00.000Z',
      178_000
    ),
    file(
      'mock-cert-foto',
      'Foto instalaciones.jpg',
      'image/jpeg',
      '2026-03-01T12:00:00.000Z',
      1_560_000,
      imageThumb
    ),
  ],
}

const mockFileIndex = new Map<string, DriveItem>()

for (const items of Object.values(mockItemsByFolder)) {
  for (const item of items) {
    if (item.kind !== 'folder') {
      mockFileIndex.set(item.id, item)
    }
  }
}

const mockDynamicItemsByFolder: Record<string, DriveItem[]> = {}
const mockDynamicFolderIds = new Set<string>()
const mockDeletedIds = new Set<string>()
const mockRenamedItems = new Map<string, string>()
const mockRemovedFromStaticParent = new Set<string>()
let mockDynamicIdCounter = 0

function nextMockDynamicId(prefix: string): string {
  mockDynamicIdCounter += 1
  return `mock-dynamic-${prefix}-${mockDynamicIdCounter}`
}

function mockFolderExists(folderId: string): boolean {
  return Boolean(mockItemsByFolder[folderId]) || mockDynamicFolderIds.has(folderId)
}

function applyMockItemOverrides(item: DriveItem): DriveItem | null {
  if (mockDeletedIds.has(item.id)) return null
  const renamed = mockRenamedItems.get(item.id)
  if (renamed) return { ...item, name: renamed }
  return item
}

function getMockFolderItems(folderId: string): DriveItem[] {
  const staticItems = (mockItemsByFolder[folderId] ?? []).filter(
    (item) => !mockRemovedFromStaticParent.has(item.id)
  )
  const merged = [...staticItems, ...(mockDynamicItemsByFolder[folderId] ?? [])]
  return sortDriveItems(
    merged
      .map(applyMockItemOverrides)
      .filter((item): item is DriveItem => item !== null)
  )
}

function findMockItemInTree(itemId: string): { item: DriveItem; parentId: string } | null {
  for (const [parentId, entries] of Object.entries(mockItemsByFolder)) {
    const item = entries.find((entry) => entry.id === itemId)
    if (item && !mockRemovedFromStaticParent.has(itemId)) {
      return { item: applyMockItemOverrides(item) ?? item, parentId }
    }
  }
  for (const [parentId, entries] of Object.entries(mockDynamicItemsByFolder)) {
    const item = entries.find((entry) => entry.id === itemId)
    if (item) {
      return { item: applyMockItemOverrides(item) ?? item, parentId }
    }
  }
  return null
}

function removeMockItemFromParent(parentId: string, itemId: string): void {
  if (mockDynamicItemsByFolder[parentId]) {
    const next = mockDynamicItemsByFolder[parentId].filter((entry) => entry.id !== itemId)
    if (next.length !== mockDynamicItemsByFolder[parentId].length) {
      mockDynamicItemsByFolder[parentId] = next
      return
    }
  }
  if (mockItemsByFolder[parentId]?.some((entry) => entry.id === itemId)) {
    mockRemovedFromStaticParent.add(itemId)
  }
}

function isMockFolderDescendant(folderId: string, ancestorFolderId: string): boolean {
  let current: string | null = folderId
  const visited = new Set<string>()
  while (current && !visited.has(current)) {
    visited.add(current)
    if (current === ancestorFolderId) return true
    current = mockParentByFolder[current] ?? null
  }
  return false
}

function appendMockItemToFolder(parentId: string, item: DriveItem): void {
  if (!mockDynamicItemsByFolder[parentId]) {
    mockDynamicItemsByFolder[parentId] = []
  }
  mockDynamicItemsByFolder[parentId].push(item)
  if (item.kind !== 'folder') {
    mockFileIndex.set(item.id, item)
  }
}

function buildMockBreadcrumbs(folderId: string): Array<{ id: string; name: string }> {
  const crumbs: Array<{ id: string; name: string }> = []
  let current: string | null = folderId
  const visited = new Set<string>()

  while (current && !visited.has(current)) {
    visited.add(current)
    crumbs.unshift({
      id: current,
      name: mockFolderNames[current] ?? 'Carpeta',
    })
    current = mockParentByFolder[current] ?? null
  }

  return crumbs
}

function resolveMockFolderId(folderId: string): string {
  return mockFolderExists(folderId) ? folderId : MOCK_ROOT_ID
}

export function getMockDriveRootId(): string {
  return MOCK_ROOT_ID
}

export function isMockDriveEnabled(): boolean {
  return shouldUseMockDrive()
}

export function listMockDriveFolder(folderId: string): DriveFolderListing {
  const currentFolderId = resolveMockFolderId(folderId)
  const items = getMockFolderItems(currentFolderId)

  return {
    items: [...items],
    breadcrumbs: buildMockBreadcrumbs(currentFolderId),
    currentFolderId,
  }
}

export function getMockDriveFile(fileId: string): DriveItem | null {
  const fromIndex = mockFileIndex.get(fileId)
  if (fromIndex && !mockDeletedIds.has(fileId)) {
    return applyMockItemOverrides(fromIndex)
  }
  const located = findMockItemInTree(fileId)
  if (!located || located.item.kind === 'folder') return null
  return located.item
}

export function getMockDriveFileBinary(fileId: string): {
  filename: string
  mimetype: string
  dataBase64: string
} | null {
  const item = getMockDriveFile(fileId)
  if (!item) return null

  if (item.kind === 'image') {
    const ext = item.name.toLowerCase().endsWith('.png') ? 'png' : 'jpeg'
    return {
      filename: item.name,
      mimetype: ext === 'png' ? 'image/png' : 'image/jpeg',
      dataBase64: MOCK_IMAGE_JPEG_BASE64,
    }
  }

  if (
    item.kind === 'pdf' ||
    item.kind === 'google-slide' ||
    item.name.toLowerCase().endsWith('.pdf')
  ) {
    return {
      filename: item.name,
      mimetype: 'application/pdf',
      dataBase64: MOCK_PDF_BASE64,
    }
  }

  return null
}

export function uploadMockDriveFiles(
  parentFolderId: string,
  files: Array<{ name: string; mimeType: string; size: number }>
): DriveItem[] {
  if (!mockFolderExists(parentFolderId)) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }

  const uploaded: DriveItem[] = []
  const now = new Date().toISOString()

  for (const file of files) {
    const item = mapDriveApiFileToItem({
      id: nextMockDynamicId('file'),
      name: file.name,
      mimeType: file.mimeType || 'application/octet-stream',
      modifiedTime: now,
      size: String(file.size),
      thumbnailLink: file.mimeType.startsWith('image/') ? imageThumb : undefined,
    })
    appendMockItemToFolder(parentFolderId, item)
    uploaded.push(item)
  }

  return uploaded
}

export function createMockDriveFolder(parentFolderId: string, name: string): DriveItem {
  if (!mockFolderExists(parentFolderId)) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }

  const id = nextMockDynamicId('folder')
  mockFolderNames[id] = name
  mockParentByFolder[id] = parentFolderId
  mockDynamicFolderIds.add(id)
  mockDynamicItemsByFolder[id] = []

  const item = folder(id, name, new Date().toISOString())
  appendMockItemToFolder(parentFolderId, item)
  return item
}

export function renameMockDriveItem(itemId: string, newName: string): DriveItem {
  const item =
    mockFileIndex.get(itemId) ??
    Object.values(mockDynamicItemsByFolder)
      .flat()
      .find((entry) => entry.id === itemId) ??
    Object.values(mockItemsByFolder)
      .flat()
      .find((entry) => entry.id === itemId)

  if (!item || mockDeletedIds.has(itemId)) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }

  mockRenamedItems.set(itemId, newName)
  const updated = { ...item, name: newName }
  if (item.kind !== 'folder') {
    mockFileIndex.set(itemId, updated)
  }
  return updated
}

export function deleteMockDriveItem(itemId: string): void {
  if (itemId === MOCK_ROOT_ID) {
    throw new Error('DRIVE_ACCESS_FORBIDDEN')
  }
  mockDeletedIds.add(itemId)
}

export function moveMockDriveItem(
  itemId: string,
  targetFolderId: string,
  sourceFolderId: string
): DriveItem {
  if (!mockFolderExists(targetFolderId)) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }

  const located = findMockItemInTree(itemId)
  if (!located || mockDeletedIds.has(itemId)) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }

  if (located.parentId !== sourceFolderId) {
    throw new Error('DRIVE_ITEM_NOT_FOUND')
  }

  if (targetFolderId === sourceFolderId) {
    return located.item
  }

  if (
    located.item.kind === 'folder' &&
    (targetFolderId === itemId || isMockFolderDescendant(targetFolderId, itemId))
  ) {
    throw new Error('DRIVE_ACCESS_FORBIDDEN')
  }

  const item = located.item
  removeMockItemFromParent(sourceFolderId, itemId)
  appendMockItemToFolder(targetFolderId, item)

  if (item.kind === 'folder') {
    mockParentByFolder[itemId] = targetFolderId
  }

  return item
}
