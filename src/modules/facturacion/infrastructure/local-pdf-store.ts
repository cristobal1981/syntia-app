/**
 * PDFs del mock de facturación, en IndexedDB (el `localStorage` se queda corto
 * para archivos). Todo es best-effort: si IndexedDB no está disponible la
 * factura se guarda igual, solo que sin PDF que reabrir.
 */
const DB_NAME = 'syntia-facturacion-mock'
const STORE = 'pdfs'

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1)
    request.onupgradeneeded = () => request.result.createObjectStore(STORE)
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function run<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = action(db.transaction(STORE, mode).objectStore(STORE))
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => reject(request.error)
    })
  } finally {
    db.close()
  }
}

export async function putInvoicePdf(id: string, file: Blob): Promise<boolean> {
  try {
    await run('readwrite', (store) => store.put(file, id))
    return true
  } catch {
    return false
  }
}

export async function getInvoicePdf(id: string): Promise<Blob | null> {
  try {
    return (await run<Blob | undefined>('readonly', (store) => store.get(id))) ?? null
  } catch {
    return null
  }
}

export async function deleteInvoicePdf(id: string): Promise<void> {
  try {
    await run('readwrite', (store) => store.delete(id))
  } catch {
    // Nada que borrar.
  }
}
