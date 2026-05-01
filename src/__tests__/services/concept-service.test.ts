import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ConceptService } from '@/services/concept-service'
import { ConceptRepository } from '@/repositories/concept-repository'

vi.mock('@/repositories/concept-repository')

describe('ConceptService', () => {
  const service = new ConceptService()

  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('getAllConcepts', () => {
    it('debería delegar al repositorio', async () => {
      const mockConcepts = [{ id: 'c1', name: 'Alumbrado' }]
      vi.spyOn(ConceptRepository.prototype, 'getAll').mockResolvedValue(mockConcepts as any)

      const result = await service.getAllConcepts()

      expect(ConceptRepository.prototype.getAll).toHaveBeenCalled()
      expect(result).toEqual(mockConcepts)
    })
  })

  describe('getActiveConcepts', () => {
    it('debería retornar solo conceptos activos', async () => {
      const mockActive = [{ id: 'c1', is_active: true }]
      vi.spyOn(ConceptRepository.prototype, 'getAllActive').mockResolvedValue(mockActive as any)

      const result = await service.getActiveConcepts()

      expect(ConceptRepository.prototype.getAllActive).toHaveBeenCalled()
      expect(result).toEqual(mockActive)
    })
  })

  describe('createConcept', () => {
    it('debería crear el concepto a través del repositorio', async () => {
      vi.spyOn(ConceptRepository.prototype, 'create').mockResolvedValue({ id: 'c1' } as any)

      await service.createConcept({ code: 'ALUM', name: 'Alumbrado', amount: 4.20, type: 'fixed', is_active: true })

      expect(ConceptRepository.prototype.create).toHaveBeenCalledWith(
        expect.objectContaining({ code: 'ALUM', name: 'Alumbrado' })
      )
    })
  })

  describe('toggleConceptStatus', () => {
    it('debería actualizar is_active en el repositorio', async () => {
      vi.spyOn(ConceptRepository.prototype, 'update').mockResolvedValue({} as any)

      await service.toggleConceptStatus('c1', false)

      expect(ConceptRepository.prototype.update).toHaveBeenCalledWith('c1', { is_active: false })
    })
  })

  describe('deleteConcept', () => {
    it('debería eliminar el concepto a través del repositorio', async () => {
      vi.spyOn(ConceptRepository.prototype, 'delete').mockResolvedValue({} as any)

      await service.deleteConcept('c1')

      expect(ConceptRepository.prototype.delete).toHaveBeenCalledWith('c1')
    })
  })
})
