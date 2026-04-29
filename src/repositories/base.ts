import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'

export class BaseRepository<T extends keyof Database['public']['Tables']> {
  protected supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  constructor(protected tableName: T) {}

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

    if (error) throw error
    return data
  }

  async delete(id: string) {
    const { error } = await this.supabase
      .from(this.tableName)
      .delete()
      .eq('id' as any, id)

    if (error) throw error
    return true
  }
}
