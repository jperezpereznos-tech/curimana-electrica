import { describe, it, expect } from 'vitest'
import { Database, Tables, TablesInsert } from '@/types/database'

describe('tariff_tier_history - TypeScript type alignment', () => {
  it('debería permitir construir un Row válido de tariff_tier_history', () => {
    const row: Tables<'tariff_tier_history'> = {
      id: '00000000-0000-0000-0000-000000000000',
      tier_id: '00000000-0000-0000-0000-000000000001',
      tariff_id: '00000000-0000-0000-0000-000000000002',
      min_kwh: 0,
      max_kwh: 30,
      price_per_kwh: 0.31,
      order_index: 1,
      valid_from: '2026-01-01T00:00:00Z',
      valid_until: null,
      created_at: '2026-01-01T00:00:00Z',
    }
    expect(row.min_kwh).toBe(0)
    expect(row.valid_until).toBeNull()
  })

  it('debería permitir construir un Insert válido sin campos opcionales', () => {
    const insert: TablesInsert<'tariff_tier_history'> = {
      tier_id: '00000000-0000-0000-0000-000000000000',
      tariff_id: '00000000-0000-0000-0000-000000000001',
      min_kwh: 30,
      max_kwh: 100,
      price_per_kwh: 0.62,
      order_index: 2,
      valid_from: '2026-01-01T00:00:00Z',
    }
    expect(insert.order_index).toBe(2)
  })

  it('debería permitir Insert con valid_until', () => {
    const insert: TablesInsert<'tariff_tier_history'> = {
      tier_id: '00000000-0000-0000-0000-000000000000',
      tariff_id: '00000000-0000-0000-0000-000000000001',
      min_kwh: 0,
      max_kwh: null,
      price_per_kwh: 1.0,
      order_index: 3,
      valid_from: '2026-01-01T00:00:00Z',
      valid_until: '2026-06-01T00:00:00Z',
    }
    expect(insert.valid_until).toBe('2026-06-01T00:00:00Z')
  })

  it('debería reflejar schema: max_kwh nullable en Row', () => {
    const row: Tables<'tariff_tier_history'> = {
      id: '1',
      tier_id: '2',
      tariff_id: '3',
      min_kwh: 100,
      max_kwh: null,
      price_per_kwh: 0.76,
      order_index: 3,
      valid_from: '2026-01-01T00:00:00Z',
      valid_until: null,
      created_at: null,
    }
    expect(row.max_kwh).toBeNull()
  })
})

describe('void_payment - RPC signature alignment', () => {
  it('debería aceptar p_user_id como parámetro opcional', () => {
    type VoidPaymentArgs = Database['public']['Functions']['void_payment']['Args']
    const withUser: VoidPaymentArgs = { p_payment_id: 'test-id', p_user_id: 'user-id' }
    const withoutUser: VoidPaymentArgs = { p_payment_id: 'test-id' }
    expect(withUser.p_payment_id).toBe('test-id')
    expect(withoutUser.p_payment_id).toBe('test-id')
  })
})
