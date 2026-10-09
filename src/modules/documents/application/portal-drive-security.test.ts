/**
 * Pruebas adversarias de extremo a extremo de la zona Documentos.
 *
 * Solo se simulan los bordes: sesión, resolución de la raíz del cliente, auth
 * de Google y la red (un Drive falso en memoria). Acciones, repositorio y
 * guard de árbol son los REALES.
 *
 * Cada escenario corre en dos mundos:
 *  - "solo Públicas": el Shared Drive está bien configurado y el SA solo ve las
 *    carpetas Pública (lo demás responde 404).
 *  - "TODO visible" (peor caso): el SA es miembro del Shared Drive por error.
 *    La aplicación debe seguir sin dejar salir al cliente de su Pública.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PortalSession } from '@/src/modules/auth/domain/types'

const {
  getSession,
  getAllowedSectionsForWorker,
  getWorkerWriteSections,
  resolveClientDriveRootId,
  shouldUseMockDrive,
  isGoogleDriveApiConfigured,
  getGoogleDriveAccessToken,
  invalidateGoogleDriveAccessToken,
} = vi.hoisted(() => ({
  getSession: vi.fn(),
  getAllowedSectionsForWorker: vi.fn(),
  getWorkerWriteSections: vi.fn(),
  resolveClientDriveRootId: vi.fn(),
  shouldUseMockDrive: vi.fn(),
  isGoogleDriveApiConfigured: vi.fn(),
  getGoogleDriveAccessToken: vi.fn(),
  invalidateGoogleDriveAccessToken: vi.fn(),
}))

vi.mock('@/src/modules/auth/application/get-session', () => ({ getSession }))
vi.mock('@/src/modules/colaboradores/application/get-allowed-sections-for-worker', () => ({
  getAllowedSectionsForWorker,
}))
vi.mock('@/src/modules/colaboradores/application/get-worker-write-sections', () => ({
  getWorkerWriteSections,
}))
vi.mock('@/src/modules/documents/application/resolve-client-drive-root', () => ({
  resolveClientDriveRootId,
}))
vi.mock('@/src/modules/documents/infrastructure/drive-runtime', () => ({ shouldUseMockDrive }))
vi.mock('@/src/modules/documents/infrastructure/google-drive-auth', () => ({
  isGoogleDriveApiConfigured,
  getGoogleDriveAccessToken,
  invalidateGoogleDriveAccessToken,
}))

// ---------------------------------------------------------------------------
// Drive falso
// ---------------------------------------------------------------------------

const SD = 'SHARED_DRIVE_ROOT_0001'
const ZZ = 'ZZ_TEST_FOLDER_00001'
const PUB = 'PUBLICA_CLIENTE_A_001'
const SUB = 'SUBCARPETA_FACTURAS_01'
const F1 = 'FILE_FACTURA_PDF_00001'
const F2 = 'FILE_LEEME_PDF_000001'
const PRIV = 'PRIVADA_CLIENTE_A_001'
const SEC = 'FILE_SECRETO_PDF_00001'
const OC = 'OTRO_CLIENTE_FOLDER_01'
const PUB2 = 'PUBLICA_CLIENTE_B_001'
const AJ = 'FILE_AJENO_PDF_000001'
const MULTI = 'SUBCARPETA_MULTI_PARENT'

const FOLDER = 'application/vnd.google-apps.folder'

type DriveNode = {
  id: string
  name: string
  mimeType: string
  parents: string[]
  trashed?: boolean
  size?: string
  content?: Buffer
}

type RecordedRequest = {
  kind: 'meta' | 'media' | 'export' | 'list' | 'upload' | 'other'
  method: string
  url: string
  targetId: string
  /** En consultas agrupadas ('A' in parents or 'B' in parents): todos los padres. */
  targetIds: string[]
}

function folderNode(id: string, name: string, parents: string[]): DriveNode {
  return { id, name, mimeType: FOLDER, parents }
}

function fileNode(id: string, name: string, parents: string[], text = 'contenido'): DriveNode {
  const content = Buffer.from(text)
  return {
    id,
    name,
    mimeType: 'application/pdf',
    parents,
    size: String(content.length),
    content,
  }
}

function buildNodes(): Map<string, DriveNode> {
  const list = [
    folderNode(SD, 'Shared Drive Syntia', []),
    folderNode(ZZ, 'ZZ-Test', [SD]),
    folderNode(PUB, 'Pública', [ZZ]),
    folderNode(SUB, 'Facturas', [PUB]),
    fileNode(F1, 'factura.pdf', [SUB]),
    fileNode(F2, 'leeme.pdf', [PUB]),
    folderNode(PRIV, 'Privada', [ZZ]),
    fileNode(SEC, 'secreto.pdf', [PRIV], 'TOP-SECRET'),
    folderNode(OC, 'Otro cliente', [SD]),
    folderNode(PUB2, 'Pública B', [OC]),
    fileNode(AJ, 'ajeno.pdf', [PUB2], 'DATOS-DE-OTRO-CLIENTE'),
    // Carpeta con DOS padres: uno privado primero, la Pública después.
    folderNode(MULTI, 'Multi', [PRIV, PUB]),
  ]
  return new Map(list.map((node) => [node.id, node]))
}

class FakeDrive {
  nodes = buildNodes()
  requests: RecordedRequest[] = []
  seq = 0
  /** Fuerza páginas pequeñas en los listados para probar la paginación. */
  forcePageSize: number | null = null
  /** Inyecta un fallo en una petición concreta (respuesta o excepción de red). */
  override: ((info: { kind: RecordedRequest['kind']; url: URL; method: string }) => Response | Error | undefined) | null = null

  constructor(private readonly seesEverything: boolean) {}

  /** ¿Está `id` dentro del árbol de `rootId` (siguiendo TODOS los padres)? */
  isInside(id: string, rootId: string, seen = new Set<string>()): boolean {
    if (id === rootId) return true
    if (seen.has(id)) return false
    seen.add(id)
    const node = this.nodes.get(id)
    return Boolean(node?.parents.some((parent) => this.isInside(parent, rootId, seen)))
  }

  private visible(id: string): boolean {
    if (!this.nodes.has(id)) return false
    if (this.seesEverything) return true
    return this.isInside(id, PUB) || this.isInside(id, PUB2)
  }

  private json(body: unknown, status = 200): Response {
    return new Response(JSON.stringify(body), { status })
  }

  private meta(node: DriveNode) {
    return {
      id: node.id,
      name: node.name,
      mimeType: node.mimeType,
      parents: node.parents,
      trashed: node.trashed ?? false,
      size: node.size,
      modifiedTime: '2026-01-01T00:00:00.000Z',
    }
  }

  fetch = async (input: string | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input))
    const method = (init?.method ?? 'GET').toUpperCase()
    const record = (kind: RecordedRequest['kind'], targetId: string, targetIds?: string[]) =>
      this.requests.push({
        kind,
        method,
        url: url.toString(),
        targetId,
        targetIds: targetIds ?? [targetId],
      })

    if (this.override) {
      const kind: RecordedRequest['kind'] =
        url.pathname.startsWith('/upload/')
          ? 'upload'
          : url.pathname === '/drive/v3/files'
            ? 'list'
            : url.pathname.endsWith('/export')
              ? 'export'
              : url.searchParams.get('alt') === 'media'
                ? 'media'
                : 'meta'
      const forced = this.override({ kind, url, method })
      if (forced) {
        record('other', url.pathname)
        if (forced instanceof Error) throw forced
        return forced
      }
    }

    if (url.pathname === '/upload/drive/v3/files' && method === 'POST') {
      return this.handleUpload(url, init, record)
    }

    if (url.pathname === '/drive/v3/files' && method === 'GET') {
      const q = url.searchParams.get('q') ?? ''
      // Solo se aceptan las dos formas que la aplicación debe generar; cualquier
      // otra (inyección, comillas sueltas...) responde 400 como Drive.
      const single = /^'[A-Za-z0-9_-]+' in parents and trashed=false$/
      const grouped =
        /^\('[A-Za-z0-9_-]+' in parents(?: or '[A-Za-z0-9_-]+' in parents)*\) and trashed=false$/
      const parentIds = [...q.matchAll(/'([A-Za-z0-9_-]+)' in parents/g)].map((m) => m[1])
      if (!single.test(q) && !grouped.test(q)) {
        record('list', q)
        return this.json({ error: 'invalid query' }, 400)
      }
      record('list', parentIds[0], parentIds)
      const all = [...this.nodes.values()]
        .filter(
          (node) =>
            node.parents.some((parent) => parentIds.includes(parent)) &&
            !this.isTrashed(node.id) &&
            this.visible(node.id)
        )
        .sort((a, b) => a.id.localeCompare(b.id))
      const pageSize = this.forcePageSize ?? Number(url.searchParams.get('pageSize') ?? 100)
      const start = Number(url.searchParams.get('pageToken') ?? 0)
      const slice = all.slice(start, start + pageSize)
      const nextPageToken = start + pageSize < all.length ? String(start + pageSize) : undefined
      return this.json({ files: slice.map((node) => this.meta(node)), nextPageToken })
    }

    const itemMatch = /^\/drive\/v3\/files\/([^/]+)(\/export)?$/.exec(url.pathname)
    if (itemMatch && method === 'GET') {
      const id = decodeURIComponent(itemMatch[1])
      const isExport = Boolean(itemMatch[2])
      const isMedia = url.searchParams.get('alt') === 'media'
      record(isExport ? 'export' : isMedia ? 'media' : 'meta', id)
      if (!this.visible(id)) return this.json({ error: 'not found' }, 404)
      const node = this.nodes.get(id)!
      if (isExport || isMedia) {
        return new Response(new Uint8Array(node.content ?? Buffer.alloc(0)), { status: 200 })
      }
      return this.json(this.meta(node))
    }

    record('other', url.pathname)
    return this.json({ error: 'unexpected request' }, 400)
  }

  private async handleUpload(
    url: URL,
    init: RequestInit | undefined,
    record: (kind: RecordedRequest['kind'], targetId: string) => void
  ): Promise<Response> {
    const headers = new Headers(init?.headers)
    const boundary = /boundary=(.+)$/.exec(headers.get('content-type') ?? '')?.[1] ?? ''
    const raw = init?.body as Buffer
    const text = raw.toString('latin1')
    // Un multipart/related correcto tiene exactamente: '', metadatos, medio, '--'.
    const parts = text.split(`--${boundary}`)
    if (parts.length !== 4) {
      record('upload', '(multipart inválido)')
      return this.json({ error: 'invalid multipart' }, 400)
    }
    const metadataJson = parts[1].split('\r\n\r\n')[1].replace(/\r\n$/, '')
    const metadata = JSON.parse(metadataJson) as { name: string; parents: string[] }
    const mediaPart = parts[2]
    const content = Buffer.from(
      mediaPart.slice(mediaPart.indexOf('\r\n\r\n') + 4).replace(/\r\n$/, ''),
      'latin1'
    )
    record('upload', metadata.parents[0])
    if (!this.visible(metadata.parents[0])) return this.json({ error: 'not found' }, 404)
    this.seq += 1
    const node: DriveNode = {
      id: `UPLOADED_FILE_${String(this.seq).padStart(8, '0')}`,
      name: metadata.name,
      mimeType: 'application/pdf',
      parents: metadata.parents,
      size: String(content.length),
      content,
    }
    this.nodes.set(node.id, node)
    void url
    return this.json(this.meta(node))
  }

  /** Como Drive: una carpeta en la papelera arrastra a todo lo que contiene. */
  private isTrashed(id: string, seen = new Set<string>()): boolean {
    if (seen.has(id)) return false
    seen.add(id)
    const node = this.nodes.get(id)
    if (!node) return false
    return Boolean(node.trashed) || node.parents.some((parent) => this.isTrashed(parent, seen))
  }

  /** Peticiones que tocan contenido o escriben fuera de la Pública del cliente A. */
  leaks(): RecordedRequest[] {
    return this.requests.filter(
      (request) =>
        ['media', 'export', 'list', 'upload'].includes(request.kind) &&
        request.targetIds.some((target) => !this.isInside(target, PUB))
    )
  }

  count(kind: RecordedRequest['kind']): number {
    return this.requests.filter((request) => request.kind === kind).length
  }
}

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------

function sessionFor(role: 'client' | 'worker' | 'admin' | 'staff'): PortalSession {
  return {
    user: { id: `u-${role}`, email: `${role}@example.com`, name: role, role },
    expiresAt: Date.now() + 100000,
  } as unknown as PortalSession
}

import * as actions from '@/src/modules/documents/application/portal-drive-document-actions'

type Actions = typeof actions

// La caché de acceso vive en el módulo (TTL 60 s sobre Date.now). En vez de
// recargar módulos (muy pesado), cada prueba avanza el reloj 10 min para que
// ninguna herede autorizaciones o rechazos de otra.
let clock = Date.parse('2030-01-01T00:00:00Z')
function freshCache() {
  clock += 10 * 60_000
  vi.setSystemTime(new Date(clock))
}

function uploadForm(files: File[], parentFolderId: string = PUB): FormData {
  const formData = new FormData()
  formData.set('parentFolderId', parentFolderId)
  for (const file of files) formData.append('files', file)
  return formData
}

function pdf(name = 'nuevo.pdf', text = '%PDF-1.4', type = 'application/pdf'): File {
  return new File([text], name, { type })
}

const ENV_KEYS = [
  'DRIVE_MAX_UPLOAD_BYTES',
  'DRIVE_MAX_FILES_PER_BATCH',
  'DRIVE_MAX_DOWNLOAD_BYTES',
] as const

let fake: FakeDrive

beforeEach(() => {
  vi.resetAllMocks()
  for (const key of ENV_KEYS) delete process.env[key]
  shouldUseMockDrive.mockReturnValue(false)
  isGoogleDriveApiConfigured.mockReturnValue(true)
  getGoogleDriveAccessToken.mockResolvedValue('SECRET-ACCESS-TOKEN')
  resolveClientDriveRootId.mockResolvedValue(PUB)
  getSession.mockResolvedValue(sessionFor('client'))
  getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))
  getWorkerWriteSections.mockResolvedValue(new Set(['/documentos']))
})

afterEach(() => {
  vi.useRealTimers()
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
  for (const key of ENV_KEYS) delete process.env[key]
})

function setup(seesEverything: boolean) {
  fake = new FakeDrive(seesEverything)
  vi.stubGlobal('fetch', vi.fn(fake.fetch))
  freshCache()
}

// ---------------------------------------------------------------------------
// Escenarios
// ---------------------------------------------------------------------------

describe.each([
  ['el SA solo ve las Públicas', false],
  ['el SA ve TODO el Shared Drive (peor caso)', true],
])('%s', (_label, seesEverything) => {
  beforeEach(() => {
    setup(seesEverything)
  })

  describe('camino feliz (si falla, el resto de pruebas no significa nada)', () => {
    it('lista la raíz, una subcarpeta, y descarga y sube dentro de la Pública', async () => {
      const root = await actions.listDriveFolderAction()
      expect(root).toMatchObject({ ok: true })
      if (root.ok) {
        expect(root.listing.items.map((item) => item.name).sort()).toEqual(
          ['Facturas', 'Multi', 'leeme.pdf'].sort()
        )
        expect(root.listing.currentFolderId).toBe(PUB)
      }

      const sub = await actions.listDriveFolderAction({ folderId: SUB })
      expect(sub).toMatchObject({ ok: true })
      if (sub.ok) {
        expect(sub.listing.items.map((item) => item.name)).toEqual(['factura.pdf'])
        expect(sub.listing.breadcrumbs.map((crumb) => crumb.name)).toEqual(['Pública', 'Facturas'])
      }

      const download = await actions.downloadDriveFileAction({ fileId: F1 })
      expect(download).toMatchObject({ ok: true, filename: 'factura.pdf' })

      const upload = await actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))
      expect(upload).toMatchObject({ ok: true })
      expect(fake.leaks()).toEqual([])
    })
  })

  describe('el cliente intenta salirse de su Pública con ids manipulados', () => {
    const outside = [
      ['el padre ZZ-Test', ZZ],
      ['la carpeta Privada', PRIV],
      ['la raíz del Shared Drive', SD],
      ['la carpeta de otro cliente', OC],
      ['la Pública de otro cliente', PUB2],
    ] as const

    it.each(outside)('listar %s → rechazado y Drive nunca lista nada fuera', async (_n, id) => {
      const result = await actions.listDriveFolderAction({ folderId: id })
      expect(result.ok).toBe(false)
      expect(fake.leaks()).toEqual([])
      expect(JSON.stringify(result)).not.toMatch(/Privada|ZZ-Test|secreto|ajeno/)
    })

    const files = [
      ['un archivo de la carpeta Privada', SEC],
      ['un archivo de otro cliente', AJ],
      ['una carpeta (el padre)', ZZ],
    ] as const

    it.each(files)('descargar %s → rechazado y nunca se pide su contenido', async (_n, id) => {
      const result = await actions.downloadDriveFileAction({ fileId: id })
      expect(result.ok).toBe(false)
      expect(fake.count('media') + fake.count('export')).toBe(0)
    })

    it.each(files)('previsualizar %s → rechazado y nunca se pide su contenido', async (_n, id) => {
      const result = await actions.getDriveFilePreviewAction({ fileId: id })
      expect(result.ok).toBe(false)
      expect(fake.count('media') + fake.count('export')).toBe(0)
    })

    it.each(outside)('subir a %s → rechazado y no se crea nada', async (_n, id) => {
      const result = await actions.uploadDriveFilesAction(uploadForm([pdf()], id))
      expect(result.ok).toBe(false)
      expect(fake.count('upload')).toBe(0)
      expect(fake.nodes.size).toBe(buildNodes().size)
    })

    it('el contenido secreto no aparece NUNCA en ninguna respuesta', async () => {
      const results = await Promise.all([
        actions.downloadDriveFileAction({ fileId: SEC }),
        actions.getDriveFilePreviewAction({ fileId: SEC }),
        actions.downloadDriveFileAction({ fileId: AJ }),
      ])
      const dump = JSON.stringify(results)
      expect(dump).not.toContain(Buffer.from('TOP-SECRET').toString('base64'))
      expect(dump).not.toContain(Buffer.from('DATOS-DE-OTRO-CLIENTE').toString('base64'))
    })
  })

  describe('ids hostiles: inyección en la consulta y rutas', () => {
    const hostile = [
      "x' or '1'='1",
      `${PUB}' in parents or '1'='1`,
      `${PUB}' in parents and name contains 'secreto`,
      '../../files',
      '%2e%2e%2f',
      `${SUB}/../${SEC}`,
      `${SUB}?alt=media`,
      `${SUB}#`,
      `${SUB}\n${SEC}`,
      `${SUB}\u0000`,
      'a'.repeat(5000),
      '😀📁',
      '   ',
      '*',
    ]

    it.each(hostile)('listar con id %j nunca construye una consulta fuera de la Pública', async (id) => {
      const result = await actions.listDriveFolderAction({ folderId: id })
      expect(fake.leaks()).toEqual([])
      expect(fake.requests.filter((request) => request.kind === 'list' && request.targetId.includes("'"))).toEqual([])
      if (id.trim() !== '') expect(result.ok).toBe(false)
    })

    it.each(hostile)('el id hostil %j no llega a Drive (ni siquiera como metadatos)', async (id) => {
      if (id.trim() === '') return
      await actions.listDriveFolderAction({ folderId: id })
      await actions.downloadDriveFileAction({ fileId: id })
      await actions.uploadDriveFilesAction(uploadForm([pdf()], id))
      expect(fake.requests).toEqual([])
    })
  })

  describe('archivos en la papelera', () => {
    it('un archivo que el staff envió a la papelera ya no se puede descargar', async () => {
      fake.nodes.get(F1)!.trashed = true

      expect(await actions.downloadDriveFileAction({ fileId: F1 })).toMatchObject({ ok: false })
      expect(await actions.getDriveFilePreviewAction({ fileId: F1 })).toMatchObject({ ok: false })
      expect(fake.count('media')).toBe(0)
    })

    it('una carpeta en la papelera no se puede listar ni subir a ella', async () => {
      fake.nodes.get(SUB)!.trashed = true

      expect(await actions.listDriveFolderAction({ folderId: SUB })).toMatchObject({ ok: false })
      expect(await actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))).toMatchObject({
        ok: false,
      })
      expect(fake.count('upload')).toBe(0)
    })

    it('un archivo dentro de una carpeta en la papelera tampoco se descarga', async () => {
      fake.nodes.get(SUB)!.trashed = true

      expect(await actions.downloadDriveFileAction({ fileId: F1 })).toMatchObject({ ok: false })
      expect(fake.count('media')).toBe(0)
    })
  })

  describe('migas de pan: nunca revelan nombres por encima de la Pública', () => {
    it('una carpeta con dos padres (Privada primero) no filtra los nombres de Privada ni de ZZ-Test', async () => {
      const result = await actions.listDriveFolderAction({ folderId: MULTI })

      const dump = JSON.stringify(result)
      expect(dump).not.toMatch(/Privada|ZZ-Test|Shared Drive/)
      if (result.ok) {
        expect(result.listing.breadcrumbs.map((crumb) => crumb.name)).toEqual(['Pública', 'Multi'])
      }
    })
  })

  describe('cadenas de carpetas patológicas', () => {
    it('una cadena enorme fuera de la Pública termina rápido (no hace cientos de peticiones)', async () => {
      let parent = PRIV
      for (let i = 0; i < 400; i += 1) {
        const id = `CADENA_PRIVADA_${String(i).padStart(6, '0')}`
        fake.nodes.set(id, folderNode(id, `n${i}`, [parent]))
        parent = id
      }

      const result = await actions.listDriveFolderAction({ folderId: parent })

      expect(result.ok).toBe(false)
      expect(fake.requests.length).toBeLessThanOrEqual(60)
    })

    it('un ciclo de padres no cuelga ni autoriza', async () => {
      fake.nodes.set('CICLO_UNO_0000000001', folderNode('CICLO_UNO_0000000001', 'a', ['CICLO_DOS_0000000002']))
      fake.nodes.set('CICLO_DOS_0000000002', folderNode('CICLO_DOS_0000000002', 'b', ['CICLO_UNO_0000000001']))

      const result = await actions.listDriveFolderAction({ folderId: 'CICLO_UNO_0000000001' })

      expect(result.ok).toBe(false)
      expect(fake.requests.length).toBeLessThanOrEqual(5)
    })

    it('una carpeta legítima a profundidad razonable (10 niveles) sí funciona', async () => {
      let parent = PUB
      for (let i = 0; i < 10; i += 1) {
        const id = `NIVEL_LEGITIMO_${String(i).padStart(6, '0')}`
        fake.nodes.set(id, folderNode(id, `nivel${i}`, [parent]))
        parent = id
      }

      expect(await actions.listDriveFolderAction({ folderId: parent })).toMatchObject({ ok: true })
    })
  })

  describe('la caché de acceso no se queda desfasada para siempre', () => {
    it('si el staff mueve un archivo fuera de la Pública, tras el TTL deja de poder descargarse', async () => {
      expect(await actions.downloadDriveFileAction({ fileId: F2 })).toMatchObject({ ok: true })

      fake.nodes.get(F2)!.parents = [PRIV]
      clock += 2 * 60_000
      vi.setSystemTime(new Date(clock))

      expect(await actions.downloadDriveFileAction({ fileId: F2 })).toMatchObject({ ok: false })
    })

    it('una carpeta rechazada no queda autorizada por haber estado permitida con OTRA raíz', async () => {
      expect(await actions.downloadDriveFileAction({ fileId: AJ })).toMatchObject({ ok: false })
      resolveClientDriveRootId.mockResolvedValue(PUB2)
      expect(await actions.downloadDriveFileAction({ fileId: AJ })).toMatchObject({ ok: true })
      resolveClientDriveRootId.mockResolvedValue(PUB)
      expect(await actions.downloadDriveFileAction({ fileId: AJ })).toMatchObject({ ok: false })
    })
  })

  describe('subida: el contenido no puede manipular la petición a Drive', () => {
    it('un archivo que contiene el boundary previsible NO trunca ni inyecta partes', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
      const hostileBody = [
        'inicio',
        `\r\n--syntia_drive_1800000000000\r\nContent-Type: application/json\r\n\r\n{"name":"pwn.pdf","parents":["${PRIV}"]}`,
        `\r\n--syntia_drive_1800000000000--\r\n`,
      ].join('')

      const result = await actions.uploadDriveFilesAction(uploadForm([pdf('x.pdf', hostileBody)], SUB))

      expect(result).toMatchObject({ ok: true })
      const created = [...fake.nodes.values()].filter((node) => node.id.startsWith('UPLOADED'))
      expect(created).toHaveLength(1)
      expect(created[0].parents).toEqual([SUB])
      expect(created[0].content?.toString('latin1')).toBe(hostileBody)
      expect(fake.leaks()).toEqual([])
    })

    it('cada subida usa un boundary distinto aunque sea en el mismo milisegundo', async () => {
      vi.spyOn(Date, 'now').mockReturnValue(1_800_000_000_000)
      await actions.uploadDriveFilesAction(uploadForm([pdf('a.pdf'), pdf('b.pdf')], SUB))

      const boundaries = fake.requests
        .filter((request) => request.kind === 'upload')
        .map(() => undefined)
      expect(boundaries).toHaveLength(2)
      const calls = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls.filter(([url]) =>
        String(url).includes('/upload/')
      )
      const used = calls.map(([, init]) =>
        /boundary=(.+)$/.exec(new Headers((init as RequestInit).headers).get('content-type') ?? '')?.[1]
      )
      expect(new Set(used).size).toBe(2)
    })

    it('un nombre con JSON/comillas/saltos no cambia los padres ni rompe la petición', async () => {
      const result = await actions.uploadDriveFilesAction(
        uploadForm([pdf('a\u0001b.pdf')], SUB)
      )
      expect(result.ok).toBe(false)
      expect(fake.count('upload')).toBe(0)
    })

    it('es atómico: si UN archivo del lote es peligroso, NO se sube ninguno', async () => {
      const result = await actions.uploadDriveFilesAction(
        uploadForm([pdf('bueno.pdf'), pdf('virus.exe', 'MZ', 'application/octet-stream')], SUB)
      )
      expect(result).toMatchObject({ ok: false, error: 'invalid_type' })
      expect(fake.count('upload')).toBe(0)
    })

    it('si Drive falla en el segundo archivo no devuelve ok:true', async () => {
      const original = fake.fetch
      let uploads = 0
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string | URL, init?: RequestInit) => {
          if (String(input).includes('/upload/')) {
            uploads += 1
            if (uploads === 2) return new Response('{}', { status: 500 })
          }
          return original(input, init)
        })
      )

      const result = await actions.uploadDriveFilesAction(uploadForm([pdf('a.pdf'), pdf('b.pdf')], SUB))

      expect(result.ok).toBe(false)
    })
  })

  describe('previsualización: el límite se aplica ANTES de descargar', () => {
    it('un archivo de 16 MB no se descarga para previsualizar', async () => {
      const big = fileNode('FILE_ENORME_PDF_000001', 'enorme.pdf', [PUB], 'x')
      big.size = String(16 * 1024 * 1024)
      fake.nodes.set(big.id, big)

      const result = await actions.getDriveFilePreviewAction({ fileId: big.id })

      expect(result).toMatchObject({ ok: false, error: 'too_large' })
      expect(fake.count('media') + fake.count('export')).toBe(0)
    })

    it('el límite exacto (15 MB) sí se previsualiza y 15 MB + 1 no', async () => {
      const atLimit = fileNode('FILE_LIMITE_PDF_000001', 'limite.pdf', [PUB], 'x')
      atLimit.size = String(15 * 1024 * 1024)
      const over = fileNode('FILE_SOBRE_PDF_0000001', 'sobre.pdf', [PUB], 'x')
      over.size = String(15 * 1024 * 1024 + 1)
      fake.nodes.set(atLimit.id, atLimit)
      fake.nodes.set(over.id, over)

      expect(await actions.getDriveFilePreviewAction({ fileId: atLimit.id })).toMatchObject({ ok: true })
      expect(await actions.getDriveFilePreviewAction({ fileId: over.id })).toMatchObject({
        ok: false,
        error: 'too_large',
      })
    })
  })

  describe('límites de subida', () => {
    it('un archivo mayor que el máximo se rechaza sin tocar Drive; el exacto pasa', async () => {
      process.env.DRIVE_MAX_UPLOAD_BYTES = '100'

      expect(
        await actions.uploadDriveFilesAction(uploadForm([pdf('a.pdf', 'x'.repeat(101))], SUB))
      ).toMatchObject({ ok: false, error: 'too_large' })
      expect(fake.count('upload')).toBe(0)

      expect(
        await actions.uploadDriveFilesAction(uploadForm([pdf('a.pdf', 'x'.repeat(100))], SUB))
      ).toMatchObject({ ok: true })
    })

    it('por defecto el máximo por archivo es 15 MB: 15 MB sube, 15 MB + 1 se rechaza sin tocar Drive', async () => {
      const MB = 1024 * 1024
      expect(
        await actions.uploadDriveFilesAction(uploadForm([pdf('justo.pdf', 'x'.repeat(15 * MB))], SUB))
      ).toMatchObject({ ok: true })

      const before = fake.count('upload')
      expect(
        await actions.uploadDriveFilesAction(uploadForm([pdf('pasado.pdf', 'x'.repeat(15 * MB + 1))], SUB))
      ).toMatchObject({ ok: false, error: 'too_large' })
      expect(fake.count('upload')).toBe(before)
    })

    it('más archivos que el máximo por lote → rechazo total', async () => {
      process.env.DRIVE_MAX_FILES_PER_BATCH = '2'

      const result = await actions.uploadDriveFilesAction(
        uploadForm([pdf('a.pdf'), pdf('b.pdf'), pdf('c.pdf')], SUB)
      )

      expect(result).toMatchObject({ ok: false })
      expect(fake.count('upload')).toBe(0)
    })

    it('sin archivos o con entradas que no son File → rechazo', async () => {
      expect(await actions.uploadDriveFilesAction(uploadForm([], SUB))).toMatchObject({ ok: false })
      const form = new FormData()
      form.set('parentFolderId', SUB)
      form.append('files', 'esto-no-es-un-archivo')
      expect(await actions.uploadDriveFilesAction(form)).toMatchObject({ ok: false })
      expect(fake.count('upload')).toBe(0)
    })

    it('sin parentFolderId → rechazo', async () => {
      const form = new FormData()
      form.append('files', pdf())
      expect(await actions.uploadDriveFilesAction(form)).toMatchObject({ ok: false })
      expect(fake.requests).toEqual([])
    })

    it.each(['abc', '-5', '0', 'NaN', 'Infinity', ''])(
      'DRIVE_MAX_UPLOAD_BYTES=%j (valor roto) cae al límite por defecto, no a "sin límite"',
      async (value) => {
        process.env.DRIVE_MAX_UPLOAD_BYTES = value
        const { getDriveMaxUploadBytes } = await import(
          '@/src/modules/documents/infrastructure/drive-env'
        )
        expect(getDriveMaxUploadBytes()).toBe(15 * 1024 * 1024)
      }
    )
  })

  describe('descarga: tope de tamaño alto pero prudente', () => {
    const sized = (id: string, size: number, mimeType = 'application/pdf'): DriveNode => ({
      id,
      name: `${id}.pdf`,
      mimeType,
      parents: [PUB],
      size: String(size),
      content: Buffer.from('x'),
    })
    const MB = 1024 * 1024

    it('por defecto: 15 MB descarga y 15 MB + 1 no (y no se pide el contenido)', async () => {
      fake.nodes.set('FILE_50MB_EXACT_00001', sized('FILE_50MB_EXACT_00001', 15 * MB))
      fake.nodes.set('FILE_50MB_PLUS1_00001', sized('FILE_50MB_PLUS1_00001', 15 * MB + 1))

      expect(await actions.downloadDriveFileAction({ fileId: 'FILE_50MB_EXACT_00001' })).toMatchObject({ ok: true })
      const before = fake.count('media')
      expect(await actions.downloadDriveFileAction({ fileId: 'FILE_50MB_PLUS1_00001' })).toMatchObject({
        ok: false,
        error: 'too_large',
      })
      expect(fake.count('media')).toBe(before)
    })

    it('DRIVE_MAX_DOWNLOAD_BYTES configurable', async () => {
      process.env.DRIVE_MAX_DOWNLOAD_BYTES = '1000'
      fake.nodes.set('FILE_1000_EXACT_00001', sized('FILE_1000_EXACT_00001', 1000))
      fake.nodes.set('FILE_1001_BYTES_00001', sized('FILE_1001_BYTES_00001', 1001))

      expect(await actions.downloadDriveFileAction({ fileId: 'FILE_1000_EXACT_00001' })).toMatchObject({ ok: true })
      expect(await actions.downloadDriveFileAction({ fileId: 'FILE_1001_BYTES_00001' })).toMatchObject({
        ok: false,
        error: 'too_large',
      })
    })

    it.each(['abc', '-1', '0', 'NaN', 'Infinity', ''])(
      'DRIVE_MAX_DOWNLOAD_BYTES=%j (roto) vuelve a 15 MB, no a "sin límite"',
      async (value) => {
        process.env.DRIVE_MAX_DOWNLOAD_BYTES = value
        fake.nodes.set('FILE_HUGE_BYTES_00001', sized('FILE_HUGE_BYTES_00001', 16 * MB))
        expect(await actions.downloadDriveFileAction({ fileId: 'FILE_HUGE_BYTES_00001' })).toMatchObject({
          ok: false,
          error: 'too_large',
        })
      }
    )

    it('un Google Doc (sin tamaño declarado) cuyo export supera el tope también se rechaza', async () => {
      process.env.DRIVE_MAX_DOWNLOAD_BYTES = '1000'
      const doc = sized('NATIVE_DOC_BIG_0000001', 0, 'application/vnd.google-apps.document')
      doc.size = undefined
      doc.content = Buffer.alloc(2000, 1)
      fake.nodes.set(doc.id, doc)

      expect(await actions.downloadDriveFileAction({ fileId: doc.id })).toMatchObject({
        ok: false,
        error: 'too_large',
      })
    })

    it('la previsualización usa el menor entre su tope (15 MB) y el de descarga', async () => {
      process.env.DRIVE_MAX_DOWNLOAD_BYTES = '100'
      fake.nodes.set('FILE_200_BYTES_000001', sized('FILE_200_BYTES_000001', 200))

      expect(await actions.getDriveFilePreviewAction({ fileId: 'FILE_200_BYTES_000001' })).toMatchObject({
        ok: false,
        error: 'too_large',
      })
    })
  })

  describe('duplicados: mismo nombre en la carpeta de destino o más abajo', () => {
    const CHAIN = {
      padre: 'CARPETA_PADRE_0000001',
      hija: 'CARPETA_HIJA_00000001',
      nueva: 'CARPETA_NUEVA_0000001',
      facturas: 'FACTURAS_PROFUNDA_001',
    }
    function addChain(fileName = 'uno.jpg') {
      fake.nodes.set(CHAIN.padre, folderNode(CHAIN.padre, 'Carpeta Padre', [PUB]))
      fake.nodes.set(CHAIN.hija, folderNode(CHAIN.hija, 'Carpeta Hija', [CHAIN.padre]))
      fake.nodes.set(CHAIN.nueva, folderNode(CHAIN.nueva, 'Carpeta Nueva', [CHAIN.hija]))
      fake.nodes.set(CHAIN.facturas, folderNode(CHAIN.facturas, 'Facturas', [CHAIN.nueva]))
      const file = fileNode('FILE_UNO_JPG_00000001', fileName, [CHAIN.facturas])
      fake.nodes.set(file.id, file)
      return file
    }
    const img = (name = 'uno.jpg') => pdf(name, 'img', 'image/jpeg')

    it('el caso del enunciado: "uno.jpg" en Pública y otro en .../Facturas → falla indicando la ruta', async () => {
      addChain()

      const result = await actions.uploadDriveFilesAction(uploadForm([img()], PUB))

      expect(result).toMatchObject({
        ok: false,
        error: 'duplicate',
        duplicate: {
          name: 'uno.jpg',
          folders: ['Carpeta Padre', 'Carpeta Hija', 'Carpeta Nueva', 'Facturas'],
        },
      })
      // El nombre real de la carpeta raíz ("Pública") no se expone al cliente.
      expect(JSON.stringify(result)).not.toContain('Pública')
      expect(fake.count('upload')).toBe(0)
      expect(fake.leaks()).toEqual([])
    })

    it('mismo nombre en la propia carpeta de destino', async () => {
      const result = await actions.uploadDriveFilesAction(uploadForm([img('leeme.pdf')], PUB))
      expect(result).toMatchObject({
        ok: false,
        error: 'duplicate',
        duplicate: { name: 'leeme.pdf', folders: [] },
      })
      expect(JSON.stringify(result)).not.toContain('Pública')
      expect(fake.count('upload')).toBe(0)
    })

    it.each([
      ['mayúsculas', 'UNO.JPG'],
      ['espacios alrededor', '  uno.jpg  '],
      ['mezcla', 'Uno.JpG'],
    ])('detecta el duplicado aunque cambie: %s', async (_n, name) => {
      addChain()
      const result = await actions.uploadDriveFilesAction(uploadForm([img(name)], PUB))
      expect(result).toMatchObject({ ok: false, error: 'duplicate' })
      expect(fake.count('upload')).toBe(0)
    })

    it('detecta el duplicado cuando el que YA está en Drive tiene espacios sobrantes en el nombre', async () => {
      addChain('  uno.jpg ')
      const result = await actions.uploadDriveFilesAction(uploadForm([img('uno.jpg')], PUB))
      expect(result).toMatchObject({ ok: false, error: 'duplicate' })
    })

    it('acentos compuestos y descompuestos (ñ vs n + ~) cuentan como el mismo nombre', async () => {
      addChain('niño.jpg')
      const result = await actions.uploadDriveFilesAction(uploadForm([img('niño.jpg')], PUB))
      expect(result).toMatchObject({ ok: false, error: 'duplicate' })
    })

    it('SÍ permite: mismo nombre solo en la papelera, o en una carpeta enviada a la papelera', async () => {
      const file = addChain()
      file.trashed = true
      expect(await actions.uploadDriveFilesAction(uploadForm([img()], PUB))).toMatchObject({ ok: true })

      freshCache()
      file.trashed = false
      fake.nodes.get(CHAIN.nueva)!.trashed = true
      expect(await actions.uploadDriveFilesAction(uploadForm([img('dos.jpg')], PUB))).toMatchObject({ ok: true })
    })

    it('SÍ permite: el mismo nombre existe ARRIBA o en una carpeta hermana (solo se mira hacia abajo)', async () => {
      // 'leeme.pdf' vive en la raíz; se sube a la subcarpeta Facturas (SUB).
      expect(await actions.uploadDriveFilesAction(uploadForm([img('leeme.pdf')], SUB))).toMatchObject({ ok: true })
    })

    it('SÍ permite: una CARPETA con ese nombre no cuenta como archivo duplicado', async () => {
      fake.nodes.set('CARPETA_LLAMADA_UNO_001', folderNode('CARPETA_LLAMADA_UNO_001', 'uno.jpg', [PUB]))
      expect(await actions.uploadDriveFilesAction(uploadForm([img()], PUB))).toMatchObject({ ok: true })
    })

    it('SÍ permite: el mismo nombre en la Pública de OTRO cliente, sin siquiera consultarla', async () => {
      const result = await actions.uploadDriveFilesAction(uploadForm([img('ajeno.pdf')], PUB))
      expect(result).toMatchObject({ ok: true })
      expect(fake.leaks()).toEqual([])
    })

    it('encuentra el duplicado aunque esté en la 2.ª página del listado', async () => {
      fake.forcePageSize = 2
      for (let i = 0; i < 6; i += 1) {
        const f = fileNode(`RELLENO_PAGINA_${String(i).padStart(6, '0')}`, `relleno${i}.pdf`, [PUB])
        fake.nodes.set(f.id, f)
      }
      const dup = fileNode('ZZZ_DUPLICADO_FINAL_001', 'final.pdf', [PUB])
      fake.nodes.set(dup.id, dup)

      const result = await actions.uploadDriveFilesAction(uploadForm([img('final.pdf')], PUB))

      expect(result).toMatchObject({ ok: false, error: 'duplicate' })
      expect(fake.requests.filter((r) => r.kind === 'list').length).toBeGreaterThan(2)
    })

    it('es atómico: si UNO del lote choca, no se sube ninguno', async () => {
      addChain()
      const result = await actions.uploadDriveFilesAction(
        uploadForm([img('nuevo1.jpg'), img('uno.jpg'), img('nuevo2.jpg')], PUB)
      )
      expect(result).toMatchObject({ ok: false, error: 'duplicate' })
      expect(fake.count('upload')).toBe(0)
    })

    it('dos archivos con el mismo nombre en la misma selección → rechazo, sin escanear Drive', async () => {
      const result = await actions.uploadDriveFilesAction(uploadForm([img('a.jpg'), img('A.JPG')], PUB))
      expect(result).toMatchObject({
        ok: false,
        error: 'duplicate',
        duplicate: { inSelection: true, folders: [] },
      })
      expect(JSON.stringify(result)).not.toContain('Pública')
      expect(fake.count('upload')).toBe(0)
      expect(fake.count('list')).toBe(0)
    })

    it('nombres inválidos o peligrosos se rechazan ANTES de escanear nada', async () => {
      await actions.uploadDriveFilesAction(uploadForm([img('a/b.jpg')], PUB))
      await actions.uploadDriveFilesAction(uploadForm([pdf('virus.exe', 'MZ', 'application/octet-stream')], PUB))
      expect(fake.count('list')).toBe(0)
    })

    it('el archivo se sube con el nombre recortado (el mismo con el que se comparó)', async () => {
      await actions.uploadDriveFilesAction(uploadForm([img('  nuevo.jpg  ')], PUB))
      const created = [...fake.nodes.values()].find((n) => n.id.startsWith('UPLOADED'))
      expect(created?.name).toBe('nuevo.jpg')
    })

    it('un hijo con id raro devuelto por Drive no se mete en una consulta posterior', async () => {
      fake.nodes.set("BAD'ID_0000000001", folderNode("BAD'ID_0000000001", 'raro', [PUB]))
      const result = await actions.uploadDriveFilesAction(uploadForm([img('nuevo.jpg')], PUB))
      expect(result).toMatchObject({ ok: true })
      expect(
        fake.requests.filter((r) => r.kind === 'list').some((r) => decodeURIComponent(r.url).includes("BAD'ID"))
      ).toBe(false)
    })

    it('árbol demasiado grande para comprobarlo entero → falla cerrado y no sube', async () => {
      for (let i = 0; i < 1100; i += 1) {
        const id = `CARPETA_MASIVA_${String(i).padStart(6, '0')}`
        fake.nodes.set(id, folderNode(id, `m${i}`, [PUB]))
      }
      const result = await actions.uploadDriveFilesAction(uploadForm([img('nuevo.jpg')], PUB))
      expect(result.ok).toBe(false)
      expect(fake.count('upload')).toBe(0)
      expect(fake.requests.length).toBeLessThanOrEqual(80)
    })

    it('jerarquía de 10 niveles: se comprueba entera y el duplicado del fondo se encuentra', async () => {
      let parent = PUB
      for (let i = 0; i < 10; i += 1) {
        const id = `NIVEL_DUP_${String(i).padStart(10, '0')}`
        fake.nodes.set(id, folderNode(id, `n${i}`, [parent]))
        parent = id
      }
      const f = fileNode('FILE_FONDO_0000000001', 'fondo.pdf', [parent])
      fake.nodes.set(f.id, f)
      const result = await actions.uploadDriveFilesAction(uploadForm([img('fondo.pdf')], PUB))
      expect(result).toMatchObject({ ok: false, error: 'duplicate' })
    })

    it('si Drive falla mientras escanea → no sube (nunca "en la duda, sube")', async () => {
      const original = fake.fetch
      vi.stubGlobal(
        'fetch',
        vi.fn(async (input: string | URL, init?: RequestInit) => {
          if (new URL(String(input)).searchParams.get('q')) return new Response('{}', { status: 500 })
          return original(input, init)
        })
      )
      const result = await actions.uploadDriveFilesAction(uploadForm([img('nuevo.jpg')], PUB))
      expect(result.ok).toBe(false)
      expect(fake.count('upload')).toBe(0)
    })

    it('el escaneo de una subida a una carpeta ajena nunca llega a listar', async () => {
      await actions.uploadDriveFilesAction(uploadForm([img('x.jpg')], PUB2))
      await actions.uploadDriveFilesAction(uploadForm([img('x.jpg')], PRIV))
      expect(fake.count('list')).toBe(0)
      expect(fake.count('upload')).toBe(0)
    })
  })

  describe('errores de Drive → códigos para el cliente (cada fallo × cada operación)', () => {
    const KNOWN = new Set([
      'not_found', 'drive_unavailable', 'rate_limited', 'timeout', 'storage_full',
      'not_downloadable', 'too_large', 'unexpected', 'name_conflict',
    ])
    const jsonError = (status: number, reason?: string) =>
      new Response(JSON.stringify({ error: { code: status, errors: reason ? [{ reason }] : [] } }), { status })

    const failures: Array<[string, () => Response | Error, string]> = [
      ['404', () => jsonError(404), 'not_found'],
      ['403 sin permiso', () => jsonError(403, 'insufficientFilePermissions'), 'not_found'],
      ['403 rateLimitExceeded', () => jsonError(403, 'rateLimitExceeded'), 'rate_limited'],
      ['403 userRateLimitExceeded', () => jsonError(403, 'userRateLimitExceeded'), 'rate_limited'],
      ['429', () => jsonError(429), 'rate_limited'],
      ['408', () => jsonError(408), 'timeout'],
      ['500', () => jsonError(500), 'drive_unavailable'],
      ['502 con HTML', () => new Response('<html>Bad Gateway</html>', { status: 502 }), 'drive_unavailable'],
      ['503', () => jsonError(503), 'drive_unavailable'],
      ['timeout de red', () => new DOMException('timed out', 'TimeoutError'), 'timeout'],
      ['petición abortada', () => new DOMException('aborted', 'AbortError'), 'timeout'],
      ['red caída (TypeError)', () => new TypeError('fetch failed'), 'drive_unavailable'],
      ['200 con cuerpo basura', () => new Response('<<<nada>>>', { status: 200 }), 'drive_unavailable'],
      ['401 persistente', () => jsonError(401), 'drive_unavailable'],
    ]

    const operations: Array<[string, () => Promise<{ ok: boolean; error?: string }>]> = [
      ['listar', () => actions.listDriveFolderAction({ folderId: SUB })],
      ['descargar', () => actions.downloadDriveFileAction({ fileId: F1 })],
      ['previsualizar', () => actions.getDriveFilePreviewAction({ fileId: F1 })],
      ['subir', () => actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))],
    ]

    for (const [failName, make, expected] of failures) {
      for (const [opName, call] of operations) {
        it(`${opName} con ${failName} al comprobar la carpeta → ${expected}`, async () => {
          fake.override = ({ kind }) => (kind === 'meta' ? make() : undefined)

          const result = await call()

          expect(result).toEqual({ ok: false, error: expected })
          expect(fake.count('media') + fake.count('export') + fake.count('upload')).toBe(0)
        })
      }
    }

    it('todas las respuestas de error usan solo códigos conocidos y nunca texto técnico', async () => {
      const seen = new Set<string>()
      for (const [, make] of failures) {
        for (const [, call] of operations) {
          freshCache()
          fake.override = ({ kind }) => (kind === 'meta' ? make() : undefined)
          const result = await call()
          expect(JSON.stringify(result)).not.toMatch(/GOOGLE_|DRIVE_|Bearer|SECRET|googleapis|stack/)
          if (!result.ok && result.error) seen.add(result.error)
        }
      }
      for (const code of seen) expect(KNOWN.has(code)).toBe(true)
    })

    it('un 401 puntual NO se nota: se renueva el token y la operación sale bien', async () => {
      let first = true
      fake.override = ({ kind }) => {
        if (kind === 'meta' && first) {
          first = false
          return jsonError(401)
        }
        return undefined
      }

      expect(await actions.listDriveFolderAction({ folderId: SUB })).toMatchObject({ ok: true })
      expect(invalidateGoogleDriveAccessToken).toHaveBeenCalledTimes(1)
    })

    it('un fallo pasajero NO se cachea: la siguiente petición, ya sana, funciona', async () => {
      let broken = true
      fake.override = ({ kind }) => (kind === 'meta' && broken ? jsonError(500) : undefined)

      expect(await actions.downloadDriveFileAction({ fileId: F1 })).toMatchObject({ ok: false })
      broken = false
      expect(await actions.downloadDriveFileAction({ fileId: F1 })).toMatchObject({ ok: true })
    })

    describe('fallos en fases posteriores', () => {
      it('el archivo desaparece entre la comprobación y la descarga (404 en el contenido) → not_found', async () => {
        fake.override = ({ kind }) => (kind === 'media' ? jsonError(404) : undefined)
        expect(await actions.downloadDriveFileAction({ fileId: F1 })).toEqual({ ok: false, error: 'not_found' })
        expect(await actions.getDriveFilePreviewAction({ fileId: F1 })).toEqual({ ok: false, error: 'not_found' })
      })

      it.each([
        ['archivo no descargable (403 fileNotDownloadable)', 'media', jsonError(403, 'fileNotDownloadable'), 'not_downloadable'],
        ['descarga limitada por cuota (403 rateLimit)', 'media', jsonError(403, 'userRateLimitExceeded'), 'rate_limited'],
        ['descarga cortada (red)', 'media', new TypeError('terminated'), 'drive_unavailable'],
        ['descarga que tarda demasiado', 'media', new DOMException('t', 'TimeoutError'), 'timeout'],
      ] as const)('%s', async (_n, kind, failure, expected) => {
        fake.override = (info) => (info.kind === kind ? failure : undefined)
        expect(await actions.downloadDriveFileAction({ fileId: F1 })).toEqual({ ok: false, error: expected })
      })

      it('exportar un Google Doc demasiado grande (403 exportSizeLimitExceeded) → too_large', async () => {
        const doc = fileNode('NATIVE_DOC_EXPORT_0001', 'informe', [PUB])
        doc.mimeType = 'application/vnd.google-apps.document'
        doc.size = undefined
        fake.nodes.set(doc.id, doc)
        fake.override = ({ kind }) => (kind === 'export' ? jsonError(403, 'exportSizeLimitExceeded') : undefined)

        expect(await actions.downloadDriveFileAction({ fileId: doc.id })).toEqual({ ok: false, error: 'too_large' })
      })

      it.each([
        ['espacio lleno (403 storageQuotaExceeded)', jsonError(403, 'storageQuotaExceeded'), 'storage_full'],
        ['la carpeta de destino desaparece (404)', jsonError(404), 'not_found'],
        ['límite de peticiones (429)', jsonError(429), 'rate_limited'],
        ['Drive caído (503)', jsonError(503), 'drive_unavailable'],
        ['subida que tarda demasiado', new DOMException('t', 'TimeoutError'), 'timeout'],
        ['respuesta de Drive sin datos', new Response('{}', { status: 200 }), 'drive_unavailable'],
      ] as const)('subir: %s', async (_n, failure, expected) => {
        fake.override = ({ kind }) => (kind === 'upload' ? failure : undefined)
        expect(await actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))).toEqual({ ok: false, error: expected })
      })

      it.each([
        ['404', jsonError(404), 'not_found'],
        ['500', jsonError(500), 'drive_unavailable'],
        ['429', jsonError(429), 'rate_limited'],
        ['JSON roto', new Response('no json', { status: 200 }), 'drive_unavailable'],
        ['timeout', new DOMException('t', 'TimeoutError'), 'timeout'],
      ] as const)('listar: la consulta de contenidos falla con %s', async (_n, failure, expected) => {
        fake.override = ({ kind }) => (kind === 'list' ? failure : undefined)
        expect(await actions.listDriveFolderAction({ folderId: SUB })).toEqual({ ok: false, error: expected })
      })

      it('subir: el escaneo de duplicados falla con 500 → drive_unavailable y no se sube nada', async () => {
        fake.override = ({ kind }) => (kind === 'list' ? jsonError(500) : undefined)
        expect(await actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))).toEqual({
          ok: false,
          error: 'drive_unavailable',
        })
        expect(fake.count('upload')).toBe(0)
      })
    })
  })

  describe('Drive cambia por detrás del cliente (estados obsoletos)', () => {
    it('la carpeta se borra mientras el cliente tiene la página abierta → not_found en todo', async () => {
      fake.nodes.delete(SUB)

      expect(await actions.listDriveFolderAction({ folderId: SUB })).toEqual({ ok: false, error: 'not_found' })
      expect(await actions.downloadDriveFileAction({ fileId: F1 })).toMatchObject({ ok: false, error: 'not_found' })
      expect(await actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))).toEqual({
        ok: false,
        error: 'not_found',
      })
    })

    it('la carpeta se mueve FUERA de la Pública → not_found (no "sin permiso", no revela que existe)', async () => {
      fake.nodes.get(SUB)!.parents = [PRIV]

      expect(await actions.listDriveFolderAction({ folderId: SUB })).toEqual({ ok: false, error: 'not_found' })
      expect(await actions.downloadDriveFileAction({ fileId: F1 })).toEqual({ ok: false, error: 'not_found' })
      expect(await actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))).toEqual({
        ok: false,
        error: 'not_found',
      })
    })

    it('un archivo movido a otra carpeta de la Pública sigue descargándose por su id', async () => {
      fake.nodes.get(F1)!.parents = [PUB]
      expect(await actions.downloadDriveFileAction({ fileId: F1 })).toMatchObject({ ok: true })
    })

    it('el staff lo devuelve a la Pública: tras el TTL vuelve a ser accesible (nada queda "envenenado")', async () => {
      fake.nodes.get(SUB)!.parents = [PRIV]
      expect(await actions.listDriveFolderAction({ folderId: SUB })).toMatchObject({ ok: false })

      fake.nodes.get(SUB)!.parents = [PUB]
      clock += 2 * 60_000
      vi.setSystemTime(new Date(clock))

      expect(await actions.listDriveFolderAction({ folderId: SUB })).toMatchObject({ ok: true })
    })

    it('un id inexistente y un id real pero ajeno dan EXACTAMENTE la misma respuesta (sin oráculo de existencia)', async () => {
      for (const real of [SEC, AJ, PRIV, ZZ]) {
        freshCache()
        const fantasma = 'NO_EXISTE_NADA_0000001'
        expect(await actions.listDriveFolderAction({ folderId: real })).toEqual(
          await actions.listDriveFolderAction({ folderId: fantasma })
        )
        expect(await actions.downloadDriveFileAction({ fileId: real })).toEqual(
          await actions.downloadDriveFileAction({ fileId: fantasma })
        )
        expect(await actions.getDriveFilePreviewAction({ fileId: real })).toEqual(
          await actions.getDriveFilePreviewAction({ fileId: fantasma })
        )
        expect(await actions.uploadDriveFilesAction(uploadForm([pdf()], real))).toEqual(
          await actions.uploadDriveFilesAction(uploadForm([pdf()], fantasma))
        )
      }
    })

    it('tras un error de "no encontrado", la Pública sigue funcionando con normalidad', async () => {
      await actions.listDriveFolderAction({ folderId: 'NO_EXISTE_NADA_0000001' })
      expect(await actions.listDriveFolderAction()).toMatchObject({ ok: true })
    })
  })

  describe('registro en servidor y secretos', () => {
    it('un fallo real de Drive deja UNA línea en el log con estado y motivo, sin token', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      fake.override = ({ kind }) =>
        kind === 'meta'
          ? new Response(JSON.stringify({ error: { errors: [{ reason: 'backendError' }] } }), { status: 503 })
          : undefined

      await actions.downloadDriveFileAction({ fileId: F1 })

      expect(errorSpy).toHaveBeenCalledTimes(1)
      const line = String(errorSpy.mock.calls[0][0])
      expect(line).toContain('"status":503')
      expect(line).toContain('"reason":"backendError"')
      expect(line).toContain('"action":"download"')
      expect(line).not.toContain('SECRET-ACCESS-TOKEN')
    })

    it('los resultados esperados (no encontrado, fuera de la Pública) NO ensucian el log', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})

      await actions.listDriveFolderAction({ folderId: SEC })
      await actions.downloadDriveFileAction({ fileId: 'NO_EXISTE_NADA_0000001' })
      await actions.uploadDriveFilesAction(uploadForm([pdf()], PRIV))

      expect(errorSpy).not.toHaveBeenCalled()
      expect(warnSpy).not.toHaveBeenCalled()
    })

    it('ninguna salida de consola contiene jamás el token, ni con todos los fallos juntos', async () => {
      const out: string[] = []
      for (const method of ['error', 'warn', 'log', 'info'] as const) {
        vi.spyOn(console, method).mockImplementation((...args: unknown[]) => {
          out.push(args.map(String).join(' '))
        })
      }
      const bodies = [new Response('x', { status: 500 }), new TypeError('fetch failed Bearer SECRET-ACCESS-TOKEN'), new Response('x', { status: 429 })]
      for (const failure of bodies) {
        freshCache()
        fake.override = () => (failure instanceof Response ? failure.clone() : failure)
        await actions.listDriveFolderAction({ folderId: SUB })
        await actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))
      }
      expect(out.length).toBeGreaterThan(0)
      expect(out.join('\n')).not.toContain('SECRET-ACCESS-TOKEN')
    })
  })

  describe('las acciones nunca lanzan, pase lo que pase por dentro', () => {
    beforeEach(() => {
      vi.spyOn(console, 'error').mockImplementation(() => {})
      vi.spyOn(console, 'warn').mockImplementation(() => {})
    })

    const all = [
      ['listar', () => actions.listDriveFolderAction()],
      ['descargar', () => actions.downloadDriveFileAction({ fileId: F2 })],
      ['previsualizar', () => actions.getDriveFilePreviewAction({ fileId: F2 })],
      ['subir', () => actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))],
    ] as const

    it.each(all)('%s: getSession lanza (BD de sesiones caída) → unexpected', async (_n, call) => {
      getSession.mockRejectedValue(new Error('connection refused'))
      expect(await call()).toEqual({ ok: false, error: 'unexpected' })
    })

    it.each(all)('%s: resolver la carpeta del cliente lanza (Supabase caído) → unexpected', async (_n, call) => {
      resolveClientDriveRootId.mockRejectedValue(new Error('supabase timeout'))
      expect(await call()).toEqual({ ok: false, error: 'unexpected' })
    })

    it.each(all)('%s: lanzar un texto en vez de un Error → unexpected', async (_n, call) => {
      resolveClientDriveRootId.mockImplementation(() => {
        throw 'boom'
      })
      expect(await call()).toEqual({ ok: false, error: 'unexpected' })
    })

    it.each(all)('%s: consultar permisos del colaborador lanza → unexpected', async (_n, call) => {
      getSession.mockResolvedValue(sessionFor('worker'))
      getAllowedSectionsForWorker.mockRejectedValue(new Error('db down'))
      getWorkerWriteSections.mockRejectedValue(new Error('db down'))
      expect(await call()).toEqual({ ok: false, error: 'unexpected' })
    })

    it.each(all)('%s: la autenticación con Google falla → drive_unavailable', async (_n, call) => {
      getGoogleDriveAccessToken.mockRejectedValue(new Error('GOOGLE_DRIVE_AUTH_FAILED'))
      expect(await call()).toEqual({ ok: false, error: 'drive_unavailable' })
    })

    it.each(all)('%s: la autenticación lanza algo que no es Error → unexpected', async (_n, call) => {
      getGoogleDriveAccessToken.mockRejectedValue('token roto')
      expect(await call()).toEqual({ ok: false, error: 'unexpected' })
    })
  })

  describe('fallos de Drive: nunca éxito falso ni filtración de secretos', () => {
    it.each([
      ['500', () => new Response('{}', { status: 500 })],
      ['403', () => new Response('{}', { status: 403 })],
      ['429', () => new Response('{}', { status: 429 })],
      ['JSON roto', () => new Response('<<<no json>>>', { status: 200 })],
      ['cuerpo vacío', () => new Response('', { status: 200 })],
    ])('respuesta %s en cada acción → ok:false', async (_n, make) => {
      vi.stubGlobal('fetch', vi.fn(async () => make()))

      const results = await Promise.all([
        actions.listDriveFolderAction({ folderId: SUB }),
        actions.downloadDriveFileAction({ fileId: F1 }),
        actions.getDriveFilePreviewAction({ fileId: F1 }),
        actions.uploadDriveFilesAction(uploadForm([pdf()], SUB)),
      ])

      for (const result of results) expect(result.ok).toBe(false)
    })

    it('la red caída (fetch lanza) → ok:false sin propagar la excepción', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => {
        throw new TypeError('fetch failed: https://www.googleapis.com ... Bearer SECRET-ACCESS-TOKEN')
      }))

      const result = await actions.listDriveFolderAction({ folderId: SUB })

      expect(result.ok).toBe(false)
      expect(JSON.stringify(result)).not.toMatch(/SECRET-ACCESS-TOKEN|Bearer|googleapis/)
    })

    it('metadatos sin parents (respuesta anómala) cierran el acceso, no lo abren', async () => {
      vi.stubGlobal('fetch', vi.fn(async () =>
        new Response(JSON.stringify({ id: SUB, name: 'x', mimeType: FOLDER }), { status: 200 })
      ))

      expect(await actions.listDriveFolderAction({ folderId: SUB })).toMatchObject({ ok: false })
    })

    it('parents con valores raros (null, números, objeto) cierran el acceso', async () => {
      for (const parents of [null, 7, {}, [null], [7], [{}], ['']]) {
        vi.stubGlobal('fetch', vi.fn(async () =>
          new Response(JSON.stringify({ id: SUB, name: 'x', mimeType: FOLDER, parents }), { status: 200 })
        ))
        freshCache()
        const fetchMock = vi.fn(async () =>
          new Response(JSON.stringify({ id: SUB, name: 'x', mimeType: FOLDER, parents }), { status: 200 })
        )
        vi.stubGlobal('fetch', fetchMock)
        expect(await actions.listDriveFolderAction({ folderId: SUB })).toMatchObject({ ok: false })
        // Solo la consulta inicial: los "padres" basura no se siguen como si fueran ids.
        expect(fetchMock).toHaveBeenCalledTimes(1)
      }
    })

    it('el resultado de error nunca contiene el token, el email del SA ni el id de raíz', async () => {
      vi.stubGlobal('fetch', vi.fn(async () => new Response('{}', { status: 500 })))
      const result = await actions.listDriveFolderAction({ folderId: SUB })
      expect(JSON.stringify(result)).not.toMatch(/SECRET-ACCESS-TOKEN|Bearer|PUBLICA_CLIENTE/)
    })
  })
})

// ---------------------------------------------------------------------------
// Puerta de acceso: quién puede llamar a qué
// ---------------------------------------------------------------------------

describe('puerta de acceso (sesión, rol, sección, vínculo)', () => {
  beforeEach(() => {
    setup(true)
  })

  const run = (a: Actions) =>
    [
      ['listar', () => a.listDriveFolderAction()],
      ['descargar', () => a.downloadDriveFileAction({ fileId: F2 })],
      ['previsualizar', () => a.getDriveFilePreviewAction({ fileId: F2 })],
      ['subir', () => a.uploadDriveFilesAction(uploadForm([pdf()], SUB))],
    ] as const

  it.each(['listar', 'descargar', 'previsualizar', 'subir'])(
    '%s sin sesión → session_expired y Drive no se toca',
    async (name) => {
      getSession.mockResolvedValue(null)
      const call = run(actions).find(([n]) => n === name)![1]
      expect(await call()).toMatchObject({ ok: false, error: 'session_expired' })
      expect(fake.requests).toEqual([])
    }
  )

  it.each(['admin', 'staff', 'cualquier-otro'])(
    'el rol %s no puede usar NINGUNA acción de Documentos del portal cliente',
    async (role) => {
      getSession.mockResolvedValue(sessionFor(role as 'admin'))
      for (const [, call] of run(actions)) {
        expect(await call()).toMatchObject({ ok: false, error: 'forbidden' })
      }
      expect(fake.requests).toEqual([])
    }
  )

  it('un colaborador sin /documentos no puede hacer NADA', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/tramites']))
    getWorkerWriteSections.mockResolvedValue(new Set(['/tramites']))

    for (const [, call] of run(actions)) {
      expect(await call()).toMatchObject({ ok: false, error: 'forbidden' })
    }
    expect(fake.requests).toEqual([])
  })

  it('un colaborador con /documentos solo en lectura: lista y descarga, NO sube', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    getAllowedSectionsForWorker.mockResolvedValue(new Set(['/documentos']))
    getWorkerWriteSections.mockResolvedValue(new Set())

    expect(await actions.listDriveFolderAction()).toMatchObject({ ok: true })
    expect(await actions.downloadDriveFileAction({ fileId: F2 })).toMatchObject({ ok: true })
    expect(await actions.uploadDriveFilesAction(uploadForm([pdf()], SUB))).toMatchObject({
      ok: false,
      error: 'forbidden',
    })
    expect(fake.count('upload')).toBe(0)
  })

  it('el colaborador usa la raíz de SU cliente, nunca una que pase por parámetro', async () => {
    getSession.mockResolvedValue(sessionFor('worker'))
    resolveClientDriveRootId.mockResolvedValue(PUB2)

    expect(await actions.downloadDriveFileAction({ fileId: F2 })).toMatchObject({ ok: false })
    expect(await actions.downloadDriveFileAction({ fileId: AJ })).toMatchObject({ ok: true })
  })

  it.each(['listar', 'descargar', 'previsualizar', 'subir'])(
    '%s con cliente sin carpeta vinculada → not_linked y Drive no se toca',
    async (name) => {
      resolveClientDriveRootId.mockResolvedValue(null)
      const call = run(actions).find(([n]) => n === name)![1]
      expect(await call()).toMatchObject({ ok: false, error: 'not_linked' })
      expect(fake.requests).toEqual([])
    }
  )

  it.each(['', '   '])('una raíz vacía (%j) equivale a no vinculada, no a "todo"', async (root) => {
    resolveClientDriveRootId.mockResolvedValue(root as unknown as string)
    expect(await actions.listDriveFolderAction()).toMatchObject({ ok: false })
    expect(fake.requests).toEqual([])
  })

  it('una raíz malformada en BD (URL, espacios, comillas) no llega a Drive', async () => {
    for (const root of ['https://drive.google.com/drive/folders/' + PUB, `${PUB}' or '1`, 'x y', '../..']) {
      resolveClientDriveRootId.mockResolvedValue(root)
      freshCache()
      expect(await actions.listDriveFolderAction()).toMatchObject({ ok: false })
      expect(await actions.downloadDriveFileAction({ fileId: F2 })).toMatchObject({ ok: false })
    }
    expect(fake.requests).toEqual([])
  })

  it('una raíz con espacios alrededor (dato sucio en BD) se normaliza y funciona', async () => {
    resolveClientDriveRootId.mockResolvedValue(`  ${PUB}\n`)
    expect(await actions.listDriveFolderAction()).toMatchObject({ ok: true })
    expect(await actions.downloadDriveFileAction({ fileId: F2 })).toMatchObject({ ok: true })
  })

  it.each(['listar', 'descargar', 'previsualizar', 'subir'])(
    '%s con Drive sin configurar (sin modo demo) → not_configured y NINGUNA llamada',
    async (name) => {
      isGoogleDriveApiConfigured.mockReturnValue(false)
      const call = run(actions).find(([n]) => n === name)![1]
      expect(await call()).toMatchObject({ ok: false, error: 'not_configured' })
      expect(fake.requests).toEqual([])
      expect(resolveClientDriveRootId).not.toHaveBeenCalled()
    }
  )

  it('el resultado de listar jamás incluye el id de la raíz de OTRO cliente', async () => {
    const result = await actions.listDriveFolderAction()
    expect(JSON.stringify(result)).not.toContain(PUB2)
  })
})
