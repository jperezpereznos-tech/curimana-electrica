import type { SupabaseClient } from '@supabase/supabase-js'
import { Database } from '@/types/database'
import { PaymentService } from './payment-service'
import { ReceiptService } from './receipt-service'
import { PeriodService } from './period-service'
import { ReadingService } from './reading-service'
import { CustomerService } from './customer-service'
import { ConceptService } from './concept-service'
import { TariffService } from './tariff-service'
import { SectorService } from './sector-service'
import { CashClosureService } from './cash-closure-service'
import { AuditService } from './audit-service'
import { DashboardService } from './dashboard-service'
import { StorageService } from './storage-service'
import { ProfileService } from './profile-service'
import { PdfService } from './pdf-service'

type Client = SupabaseClient<Database>

export function getPaymentService(supabaseClient: Client) { return new PaymentService(supabaseClient) }
export function getReceiptService(supabaseClient: Client) { return new ReceiptService(supabaseClient) }
export function getPeriodService(supabaseClient: Client) { return new PeriodService(supabaseClient) }
export function getReadingService(supabaseClient: Client) { return new ReadingService(supabaseClient) }
export function getCustomerService(supabaseClient: Client) { return new CustomerService(supabaseClient) }
export function getConceptService(supabaseClient: Client) { return new ConceptService(supabaseClient) }
export function getTariffService(supabaseClient: Client) { return new TariffService(supabaseClient) }
export function getSectorService(supabaseClient: Client) { return new SectorService(supabaseClient) }
export function getCashClosureService(supabaseClient: Client) { return new CashClosureService(supabaseClient) }
export function getAuditService(supabaseClient: Client) { return new AuditService(supabaseClient) }
export function getDashboardService(supabaseClient: Client) { return new DashboardService(supabaseClient) }
export function getStorageService(supabaseClient: Client) { return new StorageService(supabaseClient) }
export function getProfileService(supabaseClient: Client) { return new ProfileService(supabaseClient) }
export function getPdfService() { return new PdfService() }
