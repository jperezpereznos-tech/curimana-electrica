import { describe, it, expect, vi } from 'vitest'
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

describe('Service constructors', () => {
  it('PaymentService constructs with supabaseClient', () => {
    const svc = new PaymentService(mockSupabase)
    expect(svc).toBeInstanceOf(PaymentService)
  })

  it('ReceiptService constructs with supabaseClient', () => {
    const svc = new ReceiptService(mockSupabase)
    expect(svc).toBeInstanceOf(ReceiptService)
  })

  it('PeriodService constructs with supabaseClient', () => {
    const svc = new PeriodService(mockSupabase)
    expect(svc).toBeInstanceOf(PeriodService)
  })

  it('ReadingService constructs with supabaseClient', () => {
    const svc = new ReadingService(mockSupabase)
    expect(svc).toBeInstanceOf(ReadingService)
  })

  it('CustomerService constructs with supabaseClient', () => {
    const svc = new CustomerService(mockSupabase)
    expect(svc).toBeInstanceOf(CustomerService)
  })

  it('ConceptService constructs with supabaseClient', () => {
    const svc = new ConceptService(mockSupabase)
    expect(svc).toBeInstanceOf(ConceptService)
  })

  it('TariffService constructs with supabaseClient', () => {
    const svc = new TariffService(mockSupabase)
    expect(svc).toBeInstanceOf(TariffService)
  })

  it('SectorService constructs with supabaseClient', () => {
    const svc = new SectorService(mockSupabase)
    expect(svc).toBeInstanceOf(SectorService)
  })

  it('CashClosureService constructs with supabaseClient', () => {
    const svc = new CashClosureService(mockSupabase)
    expect(svc).toBeInstanceOf(CashClosureService)
  })

  it('AuditService constructs with supabaseClient', () => {
    const svc = new AuditService(mockSupabase)
    expect(svc).toBeInstanceOf(AuditService)
  })

  it('DashboardService constructs with supabaseClient', () => {
    const svc = new DashboardService(mockSupabase)
    expect(svc).toBeInstanceOf(DashboardService)
  })

  it('StorageService constructs with supabaseClient', () => {
    const svc = new StorageService(mockSupabase)
    expect(svc).toBeInstanceOf(StorageService)
  })

  it('ProfileService constructs with supabaseClient', () => {
    const svc = new ProfileService(mockSupabase)
    expect(svc).toBeInstanceOf(ProfileService)
  })

  it('PdfService constructs without supabaseClient', () => {
    const svc = new PdfService()
    expect(svc).toBeInstanceOf(PdfService)
  })

  it('each call creates a fresh instance', () => {
    const a = new CustomerService(mockSupabase)
    const b = new CustomerService(mockSupabase)
    expect(a).not.toBe(b)
  })
})
