import { cache } from 'react'

import { getSession } from '@/src/modules/auth/application/get-session'

/**
 * La sesión se resuelve una sola vez por petición: la página y las acciones de
 * Documentos que ella invoca al renderizar compartían tres consultas a la base
 * de datos cada una. Solo vive durante esa petición; nada se retiene entre
 * peticiones, así que una cuenta archivada se nota igual de rápido que antes.
 */
export const getDocumentsSession = cache(getSession)
