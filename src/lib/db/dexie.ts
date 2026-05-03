import Dexie, { type Table } from 'dexie'

export interface PendingReading {
  id?: number
  customer_id: string
  supply_number: string
  full_name: string
  address?: string
  sector?: string
  previous_reading: number
  current_reading: number
  reading_date: string
  photo_base64?: string
  notes?: string
  status: 'pending' | 'syncing' | 'failed'
  created_at: string
  needs_review?: boolean
  retry_count?: number
  last_attempt_time?: number
}

export interface CustomerCache {
  id: string
  supply_number: string
  full_name: string
  address: string
  sector: string
  sector_id: string
  tariff_id: string
  previous_reading: number
}

export class CurimanaDB extends Dexie {
  pending_readings!: Table<PendingReading>
  customers_cache!: Table<CustomerCache>

  constructor() {
    super('CurimanaDB')
    this.version(1).stores({
      pending_readings: '++id, customer_id, supply_number, status',
      customers_cache: 'id, supply_number, sector, sector_id'
    })
  }
}

export const db = new CurimanaDB()
