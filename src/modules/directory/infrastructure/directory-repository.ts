import type {
  ClientRecord,
  CreateClientInput,
  CreateClientResult,
  DirectoryListScope,
  GestorRecord,
  UpdateClientInput,
  UpdateGestorInput,
} from '@/src/modules/directory/domain/types'

export interface DirectoryRepository {
  listGestores(): Promise<GestorRecord[]>
  listClients(scope: DirectoryListScope): Promise<ClientRecord[]>
  getGestor(id: string): Promise<GestorRecord | null>
  getClient(id: string): Promise<ClientRecord | null>
  createClient(input: CreateClientInput): Promise<CreateClientResult>
  updateGestor(input: UpdateGestorInput): Promise<GestorRecord>
  updateClient(input: UpdateClientInput): Promise<ClientRecord>
  deleteClient(id: string): Promise<void>
  resendClientAccessEmail(clientId: string): Promise<void>
  listAdvisorOptions(): Promise<Array<{ id: string; name: string }>>
}
