import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ReadingService } from '@/services/reading-service'
import { ReadingRepository } from '@/repositories/reading-repository'
import { AuditService } from '@/services/audit-service'

vi.mock('@/repositories/reading-repository')
vi.mock('@/services/audit-service')
vi.mock('@/services/storage-service', () => ({
  StorageService: vi.fn().mockImplementation(function() {
    return { uploadReadingPhoto: vi.fn().mockResolvedValue('https://storage.url/photo.jpg') }
  }),
  storageService: { uploadReadingPhoto: vi.fn().mockResolvedValue('https://storage.url/photo.jpg') }
}))

describe('ReadingService - registerReading', () => {
  const service = new ReadingService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería calcular el consumo correctamente', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    }

    const result = await service.registerReading(data as any)

    expect(result.consumption).toBe(50)
    expect(result.needs_review).toBe(false)
  })

  it('debería manejar correctamente las lecturas decrecientes (meter reset)', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: 100, current_reading: 90, reading_date: '2025-06-10'
    }

    const result = await service.registerReading(data as any)

    expect(result.consumption).toBe(0)
    expect(result.needs_review).toBe(true)
  })

  it('debería registrar meter_reader_id si se pasa userId', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    }

    const result = await service.registerReading(data as any, 'reader1')

    expect(result.meter_reader_id).toBe('reader1')
  })

  it('no debería registrar meter_reader_id si no se pasa userId', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    }

    const result = await service.registerReading(data as any)

    expect(result.meter_reader_id).toBeUndefined()
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    }

    await service.registerReading(data as any, 'reader1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'readings',
      action: 'INSERT',
      user_id: 'reader1',
      user_role: 'meter_reader'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    }

    await service.registerReading(data as any)

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: 100, current_reading: 150, reading_date: '2025-06-10'
    }

    const result = await service.registerReading(data as any, 'reader1')

    expect(result.id).toBe('rd1')
  })

  it('debería forzar previous_reading y current_reading a números', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: '100' as any, current_reading: '150' as any, reading_date: '2025-06-10'
    }

    const result = await service.registerReading(data as any)

    expect(result.previous_reading).toBe(100)
    expect(result.current_reading).toBe(150)
    expect(result.consumption).toBe(50)
  })

  it('debería registrar auditoría con needs_review=true en meter reset', async () => {
    vi.spyOn(ReadingRepository.prototype, 'create').mockImplementation(async (data: any) => ({ id: 'rd1', ...data }))
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const data = {
      customer_id: 'cust-1', billing_period_id: 'period-1',
      previous_reading: 100, current_reading: 50, reading_date: '2025-06-10'
    }

    await service.registerReading(data as any, 'reader1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      new_data: expect.objectContaining({ consumption: 0, needs_review: true })
    }))
  })
})

describe('ReadingService - updateReading', () => {
  const service = new ReadingService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería recalcular consumo si se pasan lecturas', async () => {
    vi.spyOn(ReadingRepository.prototype, 'getById').mockResolvedValue({ id: 'rd1', previous_reading: 100, current_reading: 120 } as any)
    vi.spyOn(ReadingRepository.prototype, 'update').mockImplementation(async (_id: string, data: any) => ({ id: 'rd1', ...data }))

    const result = await service.updateReading('rd1', { current_reading: 150 })

    expect(result.consumption).toBe(50)
  })

  it('debería detectar meter reset en actualización', async () => {
    vi.spyOn(ReadingRepository.prototype, 'getById').mockResolvedValue({ id: 'rd1', previous_reading: 100, current_reading: 120 } as any)
    vi.spyOn(ReadingRepository.prototype, 'update').mockImplementation(async (_id: string, data: any) => ({ id: 'rd1', ...data }))

    const result = await service.updateReading('rd1', { current_reading: 50 })

    expect(result.consumption).toBe(0)
    expect(result.needs_review).toBe(true)
  })

  it('debería actualizar solo needs_review si no se pasan lecturas', async () => {
    vi.spyOn(ReadingRepository.prototype, 'update').mockImplementation(async (_id: string, data: any) => ({ id: 'rd1', ...data }))

    const result = await service.updateReading('rd1', { needs_review: false })

    expect(result.needs_review).toBe(false)
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(ReadingRepository.prototype, 'getById').mockResolvedValue({ id: 'rd1', previous_reading: 100, current_reading: 120 } as any)
    vi.spyOn(ReadingRepository.prototype, 'update').mockImplementation(async (_id: string, data: any) => ({ id: 'rd1', ...data }))
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.updateReading('rd1', { current_reading: 150 }, 'admin1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'readings',
      action: 'UPDATE',
      user_id: 'admin1',
      user_role: 'admin'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(ReadingRepository.prototype, 'update').mockImplementation(async (_id: string, data: any) => ({ id: 'rd1', ...data }))

    await service.updateReading('rd1', { needs_review: false })

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(ReadingRepository.prototype, 'getById').mockResolvedValue({ id: 'rd1', previous_reading: 100, current_reading: 120 } as any)
    vi.spyOn(ReadingRepository.prototype, 'update').mockImplementation(async (_id: string, data: any) => ({ id: 'rd1', ...data }))
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.updateReading('rd1', { current_reading: 150 }, 'admin1')

    expect(result.id).toBe('rd1')
  })
})

describe('ReadingService - delegación de métodos', () => {
  const service = new ReadingService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('getLatestReading debería delegar al repositorio', async () => {
    const mockReading = { id: 'rd1', consumption: 50 }
    vi.spyOn(ReadingRepository.prototype, 'getLatestReadingByCustomer').mockResolvedValue(mockReading as any)

    const result = await service.getLatestReading('c1')

    expect(ReadingRepository.prototype.getLatestReadingByCustomer).toHaveBeenCalledWith('c1')
    expect(result).toEqual(mockReading)
  })

  it('getReadingsByPeriod debería delegar al repositorio', async () => {
    const mockReadings = [{ id: 'rd1' }]
    vi.spyOn(ReadingRepository.prototype, 'getReadingsByPeriod').mockResolvedValue(mockReadings as any)

    const result = await service.getReadingsByPeriod('p1')

    expect(ReadingRepository.prototype.getReadingsByPeriod).toHaveBeenCalledWith('p1')
    expect(result).toEqual(mockReadings)
  })

  it('getAllForAdmin debería delegar al repositorio', async () => {
    const mockReadings = [{ id: 'rd1' }]
    vi.spyOn(ReadingRepository.prototype, 'getAllForAdmin').mockResolvedValue(mockReadings as any)

    const result = await service.getAllForAdmin('p1', true)

    expect(ReadingRepository.prototype.getAllForAdmin).toHaveBeenCalledWith('p1', true)
    expect(result).toEqual(mockReadings)
  })

  it('getLatestReadings debería delegar al repositorio', async () => {
    const mockReadings = [{ id: 'rd1' }]
    vi.spyOn(ReadingRepository.prototype, 'getLatestReadings').mockResolvedValue(mockReadings as any)

    const result = await service.getLatestReadings()

    expect(ReadingRepository.prototype.getLatestReadings).toHaveBeenCalled()
    expect(result).toEqual(mockReadings)
  })

  it('getTodayReadingsCount debería delegar al repositorio', async () => {
    vi.spyOn(ReadingRepository.prototype, 'getTodayReadingsCount').mockResolvedValue(5)

    const result = await service.getTodayReadingsCount()

    expect(result).toBe(5)
  })

  it('getActiveCustomersCount debería delegar al repositorio', async () => {
    vi.spyOn(ReadingRepository.prototype, 'getActiveCustomersCount').mockResolvedValue(120)

    const result = await service.getActiveCustomersCount('s1')

    expect(ReadingRepository.prototype.getActiveCustomersCount).toHaveBeenCalledWith('s1')
    expect(result).toBe(120)
  })

  it('getReviewCount debería delegar al repositorio', async () => {
    vi.spyOn(ReadingRepository.prototype, 'getReviewCount').mockResolvedValue(3)

    const result = await service.getReviewCount()

    expect(result).toBe(3)
  })
})
