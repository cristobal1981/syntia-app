import type {
  ClientRecord,
  CreateClientInput,
  CreateClientResult,
  CreateGestorInput,
  CreateGestorResult,
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
  createGestor(input: CreateGestorInput): Promise<CreateGestorResult>
  createClient(input: CreateClientInput): Promise<CreateClientResult>
  updateGestor(input: UpdateGestorInput): Promise<GestorRecord>
  updateClient(input: UpdateClientInput): Promise<ClientRecord>
  deleteGestor(id: string): Promise<void>
  deleteClient(id: string): Promise<void>
  resendClientAccessEmail(clientId: string): Promise<void>
  resendGestorAccessEmail(gestorId: string): Promise<void>
  listAdvisorOptions(): Promise<Array<{ id: string; name: string }>>
}
