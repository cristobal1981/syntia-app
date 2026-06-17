import type { DirectoryRepository } from '@/src/modules/directory/infrastructure/directory-repository'
import { isDirectoryMockMode } from '@/src/modules/directory/infrastructure/directory-env'
import { mockDirectoryRepository } from '@/src/modules/directory/infrastructure/directory-repository.mock'
import { supabaseDirectoryRepository } from '@/src/modules/directory/infrastructure/directory-repository.supabase'

export function getDirectoryRepository(): DirectoryRepository {
  if (isDirectoryMockMode()) {
    return mockDirectoryRepository
  }
  return supabaseDirectoryRepository
}

export function isUsingDirectoryMock(): boolean {
  return isDirectoryMockMode()
}
