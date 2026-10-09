import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  isProductionRuntime,
  shouldUseMockDrive,
} from '@/src/modules/documents/infrastructure/drive-runtime'

const { isGoogleDriveApiConfigured } = vi.hoisted(() => ({ isGoogleDriveApiConfigured: vi.fn() }))
vi.mock('@/src/modules/documents/infrastructure/google-drive-auth', () => ({
  isGoogleDriveApiConfigured,
}))

type Setup = { vercelEnv?: string; nodeEnv: string; flag?: string; configured: boolean }

function apply({ vercelEnv, nodeEnv, flag, configured }: Setup) {
  vi.unstubAllEnvs()
  vi.stubEnv('NODE_ENV', nodeEnv)
  vi.stubEnv('VERCEL_ENV', vercelEnv ?? '')
  vi.stubEnv('DRIVE_DOCUMENTS_MOCK', flag ?? '')
  isGoogleDriveApiConfigured.mockReturnValue(configured)
}

beforeEach(() => vi.resetAllMocks())
afterEach(() => vi.unstubAllEnvs())

const flags = [undefined, 'true', 'TRUE', ' true ', 'false', 'basura']
const configured = [true, false]

describe('modo demo en PRODUCCIÓN: nunca, pase lo que pase', () => {
  const productions: Array<[string, Pick<Setup, 'vercelEnv' | 'nodeEnv'>]> = [
    ['VERCEL_ENV=production', { vercelEnv: 'production', nodeEnv: 'production' }],
    ['VERCEL_ENV=PRODUCTION con espacios', { vercelEnv: ' PRODUCTION ', nodeEnv: 'production' }],
    ['fuera de Vercel con NODE_ENV=production', { vercelEnv: undefined, nodeEnv: 'production' }],
    ['VERCEL_ENV desconocido (ante la duda, producción)', { vercelEnv: 'staging', nodeEnv: 'production' }],
    ['VERCEL_ENV=production aunque NODE_ENV sea development', { vercelEnv: 'production', nodeEnv: 'development' }],
  ]

  for (const [label, env] of productions) {
    for (const flag of flags) {
      for (const isConfigured of configured) {
        it(`${label} · flag=${JSON.stringify(flag)} · configurado=${isConfigured} → sin demo`, () => {
          apply({ ...env, flag, configured: isConfigured })
          expect(isProductionRuntime()).toBe(true)
          expect(shouldUseMockDrive()).toBe(false)
        })
      }
    }
  }
})

describe('modo demo FUERA de producción (previews y local)', () => {
  const nonProd: Array<[string, Pick<Setup, 'vercelEnv' | 'nodeEnv'>]> = [
    ['preview de Vercel', { vercelEnv: 'preview', nodeEnv: 'production' }],
    ['VERCEL_ENV=development', { vercelEnv: 'development', nodeEnv: 'development' }],
    ['local', { vercelEnv: undefined, nodeEnv: 'development' }],
    ['tests', { vercelEnv: undefined, nodeEnv: 'test' }],
  ]

  for (const [label, env] of nonProd) {
    it(`${label}: sin flag y sin configurar → demo`, () => {
      apply({ ...env, configured: false })
      expect(isProductionRuntime()).toBe(false)
      expect(shouldUseMockDrive()).toBe(true)
    })
    it(`${label}: sin flag y configurado → Drive real`, () => {
      apply({ ...env, configured: true })
      expect(shouldUseMockDrive()).toBe(false)
    })
    it(`${label}: flag=true fuerza demo aunque esté configurado`, () => {
      apply({ ...env, flag: 'true', configured: true })
      expect(shouldUseMockDrive()).toBe(true)
    })
    it(`${label}: flag=false desactiva la demo aunque no esté configurado`, () => {
      apply({ ...env, flag: 'false', configured: false })
      expect(shouldUseMockDrive()).toBe(false)
    })
  }
})
