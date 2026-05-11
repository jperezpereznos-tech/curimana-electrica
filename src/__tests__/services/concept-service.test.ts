import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConceptService } from '@/services/concept-service'
import { ConceptRepository } from '@/repositories/concept-repository'
import { AuditService } from '@/services/audit-service'

vi.mock('@/repositories/concept-repository')
vi.mock('@/services/audit-service')

describe('ConceptService - getAllConcepts', () => {
  const service = new ConceptService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería delegar al repositorio', async () => {
    const mockConcepts = [{ id: 'c1', name: 'Alumbrado' }, { id: 'c2', name: 'Cargo Fijo' }]
    vi.spyOn(ConceptRepository.prototype, 'getAll').mockResolvedValue(mockConcepts as any)

    const result = await service.getAllConcepts()

    expect(ConceptRepository.prototype.getAll).toHaveBeenCalled()
    expect(result).toEqual(mockConcepts)
  })
})

describe('ConceptService - getActiveConcepts', () => {
  const service = new ConceptService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería retornar solo conceptos activos', async () => {
    const mockActive = [{ id: 'c1', is_active: true }, { id: 'c2', is_active: true }]
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue(mockActive as any)

    const result = await service.getActiveConcepts()

    expect(ConceptRepository.prototype.getAllActive).toHaveBeenCalled()
    expect(result).toEqual(mockActive)
  })

  it('debería retornar array vacío si no hay conceptos activos', async () => {
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue([] as any)

    const result = await service.getActiveConcepts()

    expect(result).toEqual([])
  })

  it('debería propagar error del repositorio', async () => {
    vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockRejectedValue(new Error('DB error'))

    await expect(service.getActiveConcepts()).rejects.toThrow('DB error')
  })
})

describe('ConceptService - createConcept', () => {
  const service = new ConceptService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería crear el concepto a través del repositorio', async () => {
    vi.spyOn(ConceptRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)

    await service.createConcept({ code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true })

    expect(ConceptRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true })
    )
  })

  it('debería crear concepto con applies_to_tariff_id', async () => {
    vi.spyOn(ConceptRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)

    await service.createConcept({ code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true, applies_to_tariff_id: 't1' })

    expect(ConceptRepository.prototype.create).toHaveBeenCalledWith(
      expect.objectContaining({ applies_to_tariff_id: 't1' })
    )
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(ConceptRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.createConcept({ code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true }, 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'billing_concepts',
      record_id: 'c1',
      action: 'INSERT',
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(ConceptRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)

    await service.createConcept({ code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true })

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(ConceptRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.createConcept({ code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true }, 'user1')

    expect(result).toEqual({ id: 'c1' })
  })

  it('debería propagar error del repositorio', async () => {
    vi.spyOn(ConceptRepository.prototype, 'create').mockRejectedValue(new Error('Duplicate code'))

    await expect(service.createConcept({ code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true }))
      .rejects.toThrow('Duplicate code')
  })
})

describe('ConceptService - updateConcept', () => {
  const service = new ConceptService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería actualizar el concepto a través del repositorio', async () => {
    const mockUpdated = { id: 'c1', name: 'Alumbrado Público', amount: 5.00 }
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue(mockUpdated as any)

    const result = await service.updateConcept('c1', { name: 'Alumbrado Público', amount: 5.00 })

    expect(ConceptRepository.prototype.update).toHaveBeenCalledWith('c1', { name: 'Alumbrado Público', amount: 5.00 })
    expect(result).toEqual(mockUpdated)
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    const updateData = { name: 'Alumbrado Público' }
    await service.updateConcept('c1', updateData, 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'billing_concepts',
      record_id: 'c1',
      action: 'UPDATE',
      new_data: updateData,
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)

    await service.updateConcept('c1', { name: 'Alumbrado Público' })

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.updateConcept('c1', { name: 'Alumbrado Público' }, 'user1')

    expect(result).toEqual({ id: 'c1' })
  })

  it('debería propagar error del repositorio', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockRejectedValue(new Error('Not found'))

    await expect(service.updateConcept('c1', { name: 'Test' })).rejects.toThrow('Not found')
  })
})

describe('ConceptService - toggleConceptStatus', () => {
  const service = new ConceptService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería actualizar is_active en el repositorio', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({ id: 'c1', is_active: false } as any)

    const result = await service.toggleConceptStatus('c1', false)

    expect(ConceptRepository.prototype.update).toHaveBeenCalledWith('c1', { is_active: false })
    expect(result).toEqual({ id: 'c1', is_active: false })
  })

  it('debería activar un concepto', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({ id: 'c1', is_active: true } as any)

    await service.toggleConceptStatus('c1', true)

    expect(ConceptRepository.prototype.update).toHaveBeenCalledWith('c1', { is_active: true })
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.toggleConceptStatus('c1', false, 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'billing_concepts',
      record_id: 'c1',
      action: 'UPDATE',
      new_data: { is_active: false },
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)

    await service.toggleConceptStatus('c1', false)

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({ id: 'c1' } as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.toggleConceptStatus('c1', false, 'user1')

    expect(result).toEqual({ id: 'c1' })
  })
})

describe('ConceptService - deleteConcept', () => {
  const service = new ConceptService()

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('debería eliminar el concepto a través del repositorio', async () => {
    vi.spyOn(ConceptRepository.prototype, 'delete').mockResolvedValue(true as any)

    const result = await service.deleteConcept('c1')

    expect(ConceptRepository.prototype.delete).toHaveBeenCalledWith('c1')
    expect(result).toBe(true)
  })

  it('debería registrar auditoría si se pasa userId', async () => {
    vi.spyOn(ConceptRepository.prototype, 'delete').mockResolvedValue(true as any)
    vi.spyOn(AuditService.prototype, 'log').mockResolvedValue()

    await service.deleteConcept('c1', 'user1')

    expect(AuditService.prototype.log).toHaveBeenCalledWith(expect.objectContaining({
      table_name: 'billing_concepts',
      record_id: 'c1',
      action: 'DELETE',
      old_data: { id: 'c1' },
      user_id: 'user1'
    }))
  })

  it('no debería registrar auditoría si no se pasa userId', async () => {
    vi.spyOn(ConceptRepository.prototype, 'delete').mockResolvedValue(true as any)

    await service.deleteConcept('c1')

    expect(AuditService.prototype.log).not.toHaveBeenCalled()
  })

  it('debería continuar si la auditoría falla', async () => {
    vi.spyOn(ConceptRepository.prototype, 'delete').mockResolvedValue(true as any)
    vi.spyOn(AuditService.prototype, 'log').mockRejectedValue(new Error('Audit down'))

    const result = await service.deleteConcept('c1', 'user1')

    expect(result).toBe(true)
  })

  it('debería propagar error del repositorio', async () => {
    vi.spyOn(ConceptRepository.prototype, 'delete').mockRejectedValue(new Error('FK constraint'))

    await expect(service.deleteConcept('c1')).rejects.toThrow('FK constraint')
  })
})
