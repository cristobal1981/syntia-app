import type { DirectoryRepository } from '@/src/modules/directory/infrastructure/directory-repository'
import { supabaseDirectoryRepository } from '@/src/modules/directory/infrastructure/directory-repository.supabase'

export function getDirectoryRepository(): DirectoryRepository {
  return supabaseDirectoryRepository
}
