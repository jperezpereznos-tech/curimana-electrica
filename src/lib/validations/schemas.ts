import { z } from 'zod'

export const uuidSchema = z.string().uuid()

export const roleSchema = z.enum(['admin', 'cashier', 'meter_reader'])

export const querySchema = z.string().min(1).max(200)

export const paymentActionSchema = z.object({
  receiptId: uuidSchema,
  customerId: uuidSchema,
  cashClosureId: uuidSchema,
  amount: z.number().positive().finite(),
  paymentMethod: z.enum(['cash']),
  receivedAmount: z.number().min(0).finite(),
  changeAmount: z.number().min(0).finite(),
})

export const batchPaymentActionSchema = z.object({
  payments: z.array(z.object({
    receiptId: uuidSchema,
    amount: z.number().positive().finite(),
  })).min(1),
  customerId: uuidSchema,
  cashClosureId: uuidSchema,
  paymentMethod: z.enum(['cash']),
  receivedAmount: z.number().min(0).finite().optional(),
  changeAmount: z.number().min(0).finite().optional(),
})

export const openClosureSchema = z.number().min(0).finite()

export const dateFilterSchema = z.object({
  from: z.string().date().optional(),
  to: z.string().date().optional(),
})

export const readingActionSchema = z.object({
  customer_id: uuidSchema,
  billing_period_id: uuidSchema,
  previous_reading: z.number().min(0).finite(),
  current_reading: z.number().min(0).finite(),
  reading_date: z.string().date(),
  notes: z.string().max(1000).optional(),
  photo_url: z.string().url().max(500).optional(),
})

export const updateReadingSchema = z.object({
  current_reading: z.number().min(0).finite().optional(),
  previous_reading: z.number().min(0).finite().optional(),
  needs_review: z.boolean().optional(),
  notes: z.string().max(1000).optional(),
})

export const sectorCreateSchema = z.object({
  name: z.string().min(1).max(100),
  code: z.string().min(1).max(20),
  description: z.string().max(500).optional(),
})

export const sectorUpdateSchema = sectorCreateSchema.partial().extend({
  is_active: z.boolean().optional(),
})

export const municipalityConfigSchema = z.object({
  name: z.string().min(1).max(200),
  ruc: z.string().min(1).max(20),
  address: z.string().min(1).max(500),
  billing_cut_day: z.number().int().min(1).max(28),
  payment_grace_days: z.number().int().min(0).max(365),
  logo_url: z.string().url().optional().nullable().or(z.literal('')),
})

export const inviteUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  role: roleSchema,
  sectorId: uuidSchema.nullable().optional(),
})

export const createUserSchema = z.object({
  email: z.string().email(),
  fullName: z.string().min(1).max(200),
  password: z.string().min(8).max(72),
  role: roleSchema,
  sectorId: uuidSchema.nullable().optional(),
})

export const cancelReceiptSchema = z.object({
  id: uuidSchema,
  reason: z.string().min(1).max(500),
})

export const topDebtorsLimitSchema = z.number().int().min(1).max(100)
