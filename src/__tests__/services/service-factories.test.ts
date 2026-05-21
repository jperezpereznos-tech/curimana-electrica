import { describe, it, expect, vi } from 'vitest'
import {
  getPaymentService,
  getReceiptService,
  getPeriodService,
  getReadingService,
  getCustomerService,
  getConceptService,
  getTariffService,
  getSectorService,
  getCashClosureService,
  getAuditService,
  getDashboardService,
  getStorageService,
  getProfileService,
  getPdfService,
} from '@/services/index'
import { PaymentService } from '@/services/payment-service'
import { ReceiptService } from '@/services/receipt-service'
import { PeriodService } from '@/services/period-service'
import { ReadingService } from '@/services/reading-service'
import { CustomerService } from '@/services/customer-service'
import { ConceptService } from '@/services/concept-service'
import { TariffService } from '@/services/tariff-service'
import { SectorService } from '@/services/sector-service'
import { CashClosureService } from '@/services/cash-closure-service'
import { AuditService } from '@/services/audit-service'
import { DashboardService } from '@/services/dashboard-service'
import { StorageService } from '@/services/storage-service'
import { ProfileService } from '@/services/profile-service'
import { PdfService } from '@/services/pdf-service'

const mockSupabase = {
  from: vi.fn().mockReturnValue({
    select: vi.fn().mockReturnThis(),
    insert: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    delete: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
  }),
  rpc: vi.fn().mockReturnValue({ data: null, error: null }),
  auth: {
    getUser: vi.fn().mockResolvedValue({ data: { user: null }, error: null }),
  },
  storage: {
    from: vi.fn().mockReturnValue({
      upload: vi.fn().mockResolvedValue({ data: null, error: null }),
      remove: vi.fn().mockResolvedValue({ data: null, error: null }),
      getPublicUrl: vi.fn().mockReturnValue({ data: { publicUrl: 'https://test.url' } }),
    }),
  },
} as any

describe('Service factories - index.ts', () => {
  it('getPaymentService should return PaymentService instance', () => {
    const svc = getPaymentService(mockSupabase)
    expect(svc).toBeInstanceOf(PaymentService)
  })

  it('getReceiptService should return ReceiptService instance', () => {
    const svc = getReceiptService(mockSupabase)
    expect(svc).toBeInstanceOf(ReceiptService)
  })

  it('getPeriodService should return PeriodService instance', () => {
    const svc = getPeriodService(mockSupabase)
    expect(svc).toBeInstanceOf(PeriodService)
  })

  it('getReadingService should return ReadingService instance', () => {
    const svc = getReadingService(mockSupabase)
    expect(svc).toBeInstanceOf(ReadingService)
  })

  it('getCustomerService should return CustomerService instance', () => {
    const svc = getCustomerService(mockSupabase)
    expect(svc).toBeInstanceOf(CustomerService)
  })

  it('getConceptService should return ConceptService instance', () => {
    const svc = getConceptService(mockSupabase)
    expect(svc).toBeInstanceOf(ConceptService)
  })

  it('getTariffService should return TariffService instance', () => {
    const svc = getTariffService(mockSupabase)
    expect(svc).toBeInstanceOf(TariffService)
  })

  it('getSectorService should return SectorService instance', () => {
    const svc = getSectorService(mockSupabase)
    expect(svc).toBeInstanceOf(SectorService)
  })

  it('getCashClosureService should return CashClosureService instance', () => {
    const svc = getCashClosureService(mockSupabase)
    expect(svc).toBeInstanceOf(CashClosureService)
  })

  it('getAuditService should return AuditService instance', () => {
    const svc = getAuditService(mockSupabase)
    expect(svc).toBeInstanceOf(AuditService)
  })

  it('getDashboardService should return DashboardService instance', () => {
    const svc = getDashboardService(mockSupabase)
    expect(svc).toBeInstanceOf(DashboardService)
  })

  it('getStorageService should return StorageService instance', () => {
    const svc = getStorageService(mockSupabase)
    expect(svc).toBeInstanceOf(StorageService)
  })

  it('getProfileService should return ProfileService instance', () => {
    const svc = getProfileService(mockSupabase)
    expect(svc).toBeInstanceOf(ProfileService)
  })

  it('getPdfService should return PdfService instance without supabaseClient', () => {
    const svc = getPdfService()
    expect(svc).toBeInstanceOf(PdfService)
  })

  it('factory should create fresh instances each call', () => {
    const a = getCustomerService(mockSupabase)
    const b = getCustomerService(mockSupabase)
    expect(a).not.toBe(b)
  })
})
