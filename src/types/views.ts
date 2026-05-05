import { Database } from '@/types/database'

type DB = Database['public']['Tables']

export type CustomerRow = DB['customers']['Row']
export type TariffRow = DB['tariffs']['Row']
export type TariffTierRow = DB['tariff_tiers']['Row']
export type ConceptRow = DB['billing_concepts']['Row']
export type PeriodRow = DB['billing_periods']['Row']
export type ReadingRow = DB['readings']['Row']
export type ReceiptRow = DB['receipts']['Row']
export type PaymentRow = DB['payments']['Row']
export type CashClosureRow = DB['cash_closures']['Row']
export type SectorRow = DB['sectors']['Row']
export type ProfileRow = DB['profiles']['Row']
export type AuditLogRow = DB['audit_logs']['Row']

export type ProfileWithSector = ProfileRow & {
  sectors: { id: string; name: string; code: string } | null
}

export type ReaderProfilePartial = {
  id: string
  full_name: string | null
  email: string
  assigned_sector_id: string | null
}

export type ReceiptWithPeriod = ReceiptRow & {
  billing_periods: { name: string } | null
  customers: { full_name: string; supply_number: string } | null
}

export type ReceiptForCustomer = ReceiptRow & {
  billing_periods: { name: string } | null
}

export type ReceiptWithFullDetails = ReceiptRow & {
  billing_periods: DB['billing_periods']['Row'] | null
  customers: CustomerRow & {
    tariffs: TariffRow & { tariff_tiers: TariffTierRow[] } | null
  } | null
  readings: DB['readings']['Row'][] | null
}

export type PaymentWithDetails = PaymentRow & {
  receipts: { receipt_number: number; customers: { full_name: string | null; supply_number: string | null } | null } | null
  cashier: { full_name: string | null } | null
}

export type PaymentForCustomer = PaymentRow & {
  receipts: { receipt_number: number; billing_periods: { name: string } | null } | null
}

export type ReadingWithCustomer = ReadingRow & {
  customers: { full_name: string | null; supply_number: string | null; sector_id: string | null; sectors: { id: string; name: string; code: string } | null } | null
  profiles: { id: string; full_name: string | null } | null
}

export type ReadingWithBillingPeriod = ReadingRow & {
  billing_periods: { name: string } | null
}

export type LatestReadingItem = {
  id: string
  previous_reading: number
  current_reading: number
  consumption: number | null
  reading_date: string | null
  photo_url: string | null
  customers: { full_name: string | null; supply_number: string | null } | null
}

export type CustomerWithRelations = CustomerRow & {
  tariffs: { name: string; tariff_tiers: TariffTierRow[] } | null
  sectors: { id: string; name: string; code: string } | null
  readings: { current_reading: number; reading_date: string }[] | null
}

export type CustomerForRoute = {
  id: string
  supply_number: string
  full_name: string
  address: string | null
  sector: string | null
  sector_id: string | null
  is_active: boolean | null
  readings: { id: string; reading_date: string | null }[] | null
  sectors: { id: string; name: string; code: string } | null
}

export type ReadingForRoute = CustomerRow & {
  readings: { id: string; reading_date: string | null }[] | null
  sectors: { id: string; name: string; code: string } | null
}

export type RouteCustomerItem = {
  id: string
  supply_number: string
  full_name: string
  address: string | null
  sector: string | null
  sector_id: string | null
  has_reading: boolean
  previous_reading: number
}

export type CustomerSearchResult = {
  id: string
  full_name: string
  address: string | null
  sector: string | null
  sector_id: string | null
  supply_number: string
  previous_reading: number
}

export type AssignedSectorItem = {
  id: string
  name: string
  code: string
}

export type ReaderProfileSector = {
  assigned_sector_id: string | null
  sectors: AssignedSectorItem | null
}

export type RevenueEntry = { name: string; total: number }
export type SectorEntry = { name: string; value: number }

export type LatestReadingEntry = {
  id: string
  previous_reading: number
  current_reading: number
  consumption: number | null
  reading_date: string | null
  has_photo: boolean
  customer_name: string
  supply_number: string
}

export type CashierPaymentItem = PaymentRow & {
  receipts: { receipt_number: number; customers: { full_name: string; supply_number: string } | null } | null
}

export type PendingReadingItem = {
  id: string
  supply_number: string
  full_name: string
  address: string | null
  sector: string | null
  has_photo: boolean
  status: string
  retry_count: number
}

export type BeforeInstallPromptEvent = Event & {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type TariffWithTiers = TariffRow & {
  tariff_tiers: TariffTierRow[]
}

export type CustomerForList = CustomerRow & {
  sectors: { id: string; name: string; code: string } | null
  tariffs: { id: string; name: string; is_active: boolean | null } | null
}

export type KPIProps = {
  title: string
  value: string | number
  subtext?: string
  icon?: React.ReactNode
  trend?: number
}

export type ChartDataEntry = { name: string; total?: number; value?: number }

export type CashierHistoryPayment = {
  id: string
  receipt_number: string
  customer_name: string
  supply_number: string
  amount: number
  payment_date: string
  status: string
  reference: string | null
}
