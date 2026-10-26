import type {
  ClientRecord,
  PersonStatus,
  CreateClientInput,
  CreateClientResult,
  CreateGestorInput,
  CreateGestorResult,
  DirectoryListScope,
  DirectoryPageParams,
  DirectoryPageResult,
  GestorRecord,
  UpdateClientInput,
  UpdateGestorInput,
} from '@/src/modules/directory/domain/types'

export interface DirectoryRepository {
  listGestores(): Promise<GestorRecord[]>
  listClients(scope: DirectoryListScope): Promise<ClientRecord[]>
  listClientsPage(
    scope: DirectoryListScope,
    params: DirectoryPageParams
  ): Promise<DirectoryPageResult<ClientRecord>>
  listGestoresPage(
    params: DirectoryPageParams
  ): Promise<DirectoryPageResult<GestorRecord>>
  /** Clientes por asesor (`profiles.advisor_id`) — agregado en SQL, ver `gestores-page.tsx`. */
  countClientsByAdvisor(): Promise<Record<string, number>>
  getGestor(id: string): Promise<GestorRecord | null>
  getClient(id: string): Promise<ClientRecord | null>
  createGestor(input: CreateGestorInput): Promise<CreateGestorResult>
  createClient(input: CreateClientInput): Promise<CreateClientResult>
  updateGestor(input: UpdateGestorInput): Promise<GestorRecord>
  updateClient(input: UpdateClientInput): Promise<ClientRecord>
  deleteGestor(id: string): Promise<void>
  deleteClient(id: string): Promise<void>
  /** Activa o desactiva la cuenta (solo el estado, sin tocar datos ni enviar nada); devuelve el estado resultante. */
  setClientActive(clientId: string, active: boolean): Promise<PersonStatus>
  resendClientAccessEmail(clientId: string): Promise<void>
  resendGestorAccessEmail(gestorId: string): Promise<void>
  listAdvisorOptions(): Promise<Array<{ id: string; name: string; email: string }>>
  bulkAssignAdvisor(clientIds: string[], advisorId: string | null): Promise<void>
}
