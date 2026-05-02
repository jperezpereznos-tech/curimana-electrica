import { createClient as createBrowserClient } from '@/lib/supabase/client'
import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

export class BaseRepository<T extends keyof Database['public']['Tables']> {
  protected supabase: SupabaseClient<Database>

  constructor(protected tableName: T, supabaseClient?: SupabaseClient<Database>) {
    this.supabase = supabaseClient ?? createBrowserClient()
  }

  async getAll() {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')

    if (error) throw error
    return data
  }

  async getById(id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .select('*')
      .eq('id' as any, id)
      .single()

    if (error) throw error
    return data
  }

  async create(payload: Database['public']['Tables'][T]['Insert']) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .insert(payload as any)
      .select()
      .single()

    if (error) throw error
    return data
  }

  async update(id: string, payload: Database['public']['Tables'][T]['Update']) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .update(payload as any)
      .eq('id' as any, id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        throw new Error('No se pudo actualizar. Verifique que tiene permisos de administrador.')
      }
      throw error
    }
    if (!data) {
      throw new Error('No se pudo actualizar el registro. Verifique permisos.')
    }
    return data
  }

  async delete(id: string) {
    const { data, error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id' as any, id)
      .select()

    if (error) throw error
    if (!data || data.length === 0) {
      throw new Error('No se pudo eliminar el registro. Verifique permisos.')
    }
    return true
  }
}
