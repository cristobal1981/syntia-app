import { beforeEach, describe, expect, it, vi } from 'vitest'

import { resolveOdooPartnerDriveFolder } from '@/src/modules/directory/application/resolve-odoo-partner-drive-folder'

const { isOdooApiConfigured, odooSearchRead } = vi.hoisted(() => ({
  isOdooApiConfigured: vi.fn(),
  odooSearchRead: vi.fn(),
}))

vi.mock('@/src/modules/portal/infrastructure/odoo-json-client', () => ({
  isOdooApiConfigured,
  odooSearchRead,
}))

const FOLDER_ID = '1AbCdEfGhIjKlMnOpQrStUvWxYz_-0123'

beforeEach(() => {
  vi.resetAllMocks()
  isOdooApiConfigured.mockReturnValue(true)
  delete process.env.ODOO_PARTNER_PUBLIC_DRIVE_FIELD
})

describe('resolveOdooPartnerDriveFolder', () => {
  it.each([0, -3, 1.5, Number.NaN])('rejects the invalid id %s without calling Odoo', async (id) => {
    expect(await resolveOdooPartnerDriveFolder(id)).toEqual({ ok: false })
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('reads ONLY the requested partner and ONLY the public-folder field', async () => {
    odooSearchRead.mockResolvedValue([
      { id: 7, x_studio_google_drive_publica: FOLDER_ID },
    ])

    const result = await resolveOdooPartnerDriveFolder(7)

    expect(odooSearchRead).toHaveBeenCalledWith('res.partner', {
      domain: [['id', '=', 7]],
      fields: ['x_studio_google_drive_publica'],
      limit: 1,
    })
    expect(result).toEqual({ ok: true, driveFolderId: FOLDER_ID })
  })

  it('honors ODOO_PARTNER_PUBLIC_DRIVE_FIELD', async () => {
    process.env.ODOO_PARTNER_PUBLIC_DRIVE_FIELD = 'x_otro_campo'
    odooSearchRead.mockResolvedValue([{ id: 7, x_otro_campo: FOLDER_ID }])

    expect(await resolveOdooPartnerDriveFolder(7)).toEqual({ ok: true, driveFolderId: FOLDER_ID })
    expect(odooSearchRead.mock.calls[0][1].fields).toEqual(['x_otro_campo'])
  })

  it('accepts a folder URL stored in the field and trims whitespace', async () => {
    odooSearchRead.mockResolvedValue([
      { id: 7, x_studio_google_drive_publica: `  https://drive.google.com/drive/folders/${FOLDER_ID}?usp=sharing ` },
    ])

    expect(await resolveOdooPartnerDriveFolder(7)).toEqual({ ok: true, driveFolderId: FOLDER_ID })
  })

  it.each([false, null, '', '   ', 'corto', 'no es un id válido!', 42])(
    'returns null (not an error) for the empty/invalid value %j',
    async (value) => {
      odooSearchRead.mockResolvedValue([{ id: 7, x_studio_google_drive_publica: value }])

      expect(await resolveOdooPartnerDriveFolder(7)).toEqual({ ok: true, driveFolderId: null })
    }
  )

  it('returns null when Odoo finds no such partner', async () => {
    odooSearchRead.mockResolvedValue([])

    expect(await resolveOdooPartnerDriveFolder(7)).toEqual({ ok: true, driveFolderId: null })
  })

  it('returns null without calling Odoo when it is not configured', async () => {
    isOdooApiConfigured.mockReturnValue(false)

    expect(await resolveOdooPartnerDriveFolder(7)).toEqual({ ok: true, driveFolderId: null })
    expect(odooSearchRead).not.toHaveBeenCalled()
  })

  it('reports ok:false when Odoo fails', async () => {
    odooSearchRead.mockRejectedValue(new Error('ODOO_REQUEST_FAILED'))

    expect(await resolveOdooPartnerDriveFolder(7)).toEqual({ ok: false })
  })
})
