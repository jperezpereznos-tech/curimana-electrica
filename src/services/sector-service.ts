import { SectorRepository } from '@/repositories/sector-repository'
import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { createClient as createBrowserClient } from '@/lib/supabase/client'

export class SectorService {
  private sectorRepo: SectorRepository

  constructor(supabaseClient?: SupabaseClient<Database>) {
    this.sectorRepo = new SectorRepository(supabaseClient)
  }

  async getAllSectors() {
    return await this.sectorRepo.getAll()
  }

  async getActiveSectors() {
    return await this.sectorRepo.getActiveSectors()
  }

  async createSector(data: { name: string; code: string; description?: string }) {
    return await this.sectorRepo.create(data)
  }

  async updateSector(id: string, data: { name?: string; code?: string; description?: string; is_active?: boolean }) {
    return await this.sectorRepo.update(id, data)
  }

  async deleteSector(id: string) {
    return await this.sectorRepo.delete(id)
  }

  async getSectorWithReaders(sectorId: string) {
    return await this.sectorRepo.getSectorWithReaders(sectorId)
  }

  async getCustomerCount(sectorId: string) {
    return await this.sectorRepo.getCustomerCount(sectorId)
  }
}

export const sectorService = new SectorService()

export function getSectorService(supabaseClient: SupabaseClient<Database>) {
  return new SectorService(supabaseClient)
}
