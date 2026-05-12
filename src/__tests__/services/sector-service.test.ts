import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SectorService } from '@/services/sector-service'
import { SectorRepository } from '@/repositories/sector-repository'

vi.mock('@/repositories/sector-repository')

describe('SectorService - getAllSectors', () => {
  const service = new SectorService()

  beforeEach(() => { vi.clearAllMocks() })

  it('debería delegar al repositorio', async () => {
    const mockSectors = [{ id: 's1', name: 'Centro' }]
    vi.spyOn(SectorRepository.prototype, 'getAll').mockResolvedValue(mockSectors as any)

    const result = await service.getAllSectors()

    expect(SectorRepository.prototype.getAll).toHaveBeenCalled()
    expect(result).toEqual(mockSectors)
  })
})

describe('SectorService - getActiveSectors', () => {
  const service = new SectorService()

  beforeEach(() => { vi.clearAllMocks() })

  it('debería delegar al repositorio', async () => {
    const mockSectors = [{ id: 's1', name: 'Centro', is_active: true }]
    vi.spyOn(SectorRepository.prototype, 'getActiveSectors').mockResolvedValue(mockSectors as any)

    const result = await service.getActiveSectors()

    expect(SectorRepository.prototype.getActiveSectors).toHaveBeenCalled()
    expect(result).toEqual(mockSectors)
  })
})

describe('SectorService - createSector', () => {
  const service = new SectorService()

  beforeEach(() => { vi.clearAllMocks() })

  it('debería crear sector a través del repositorio', async () => {
    const mockResult = { id: 's1', name: 'Centro', code: 'CTR' }
    vi.spyOn(SectorRepository.prototype, 'create').mockResolvedValue(mockResult as any)

    const result = await service.createSector({ name: 'Centro', code: 'CTR' })

    expect(SectorRepository.prototype.create).toHaveBeenCalledWith({ name: 'Centro', code: 'CTR' })
    expect(result).toEqual(mockResult)
  })
})

describe('SectorService - updateSector', () => {
  const service = new SectorService()

  beforeEach(() => { vi.clearAllMocks() })

  it('debería actualizar sector a través del repositorio', async () => {
    const mockResult = { id: 's1', name: 'Norte' }
    vi.spyOn(SectorRepository.prototype, 'update').mockResolvedValue(mockResult as any)

    const result = await service.updateSector('s1', { name: 'Norte' })

    expect(SectorRepository.prototype.update).toHaveBeenCalledWith('s1', { name: 'Norte' })
    expect(result).toEqual(mockResult)
  })
})

describe('SectorService - deleteSector', () => {
  const service = new SectorService()

  beforeEach(() => { vi.clearAllMocks() })

  it('debería eliminar sector a través del repositorio', async () => {
    vi.spyOn(SectorRepository.prototype, 'delete').mockResolvedValue(true as any)

    const result = await service.deleteSector('s1')

    expect(SectorRepository.prototype.delete).toHaveBeenCalledWith('s1')
    expect(result).toBe(true)
  })
})

describe('SectorService - getSectorWithReaders', () => {
  const service = new SectorService()

  beforeEach(() => { vi.clearAllMocks() })

  it('debería delegar al repositorio', async () => {
    const mockData = { id: 's1', profiles: [{ id: 'u1', full_name: 'Lector' }] }
    vi.spyOn(SectorRepository.prototype, 'getSectorWithReaders').mockResolvedValue(mockData as any)

    const result = await service.getSectorWithReaders('s1')

    expect(SectorRepository.prototype.getSectorWithReaders).toHaveBeenCalledWith('s1')
    expect(result).toEqual(mockData)
  })
})

describe('SectorService - getCustomerCount', () => {
  const service = new SectorService()

  beforeEach(() => { vi.clearAllMocks() })

  it('debería delegar al repositorio', async () => {
    vi.spyOn(SectorRepository.prototype, 'getCustomerCount').mockResolvedValue(25)

    const result = await service.getCustomerCount('s1')

    expect(SectorRepository.prototype.getCustomerCount).toHaveBeenCalledWith('s1')
    expect(result).toBe(25)
  })
})
