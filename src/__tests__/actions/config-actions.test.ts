import { describe, it, expect, vi, beforeEach } from 'vitest'

const mockSupabaseFrom = vi.fn()

const mockCreateClient = vi.fn().mockResolvedValue({
  from: mockSupabaseFrom
})

vi.mock('@/lib/supabase/server', () => ({
  createClient: () => mockCreateClient()
}))

const mockRevalidatePath = vi.fn()
vi.mock('next/cache', () => ({
  revalidatePath: (...args: unknown[]) => mockRevalidatePath(...args)
}))

function createAwaitableChain(resolvedValue: any) {
  const promise = Promise.resolve(resolvedValue)
  const chain: any = {
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    update: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    single: vi.fn().mockReturnValue(promise),
    then: promise.then.bind(promise),
  }
  return chain
}

const { updateMunicipalityConfigAction } = await import('@/app/admin/config/actions')

describe('updateMunicipalityConfigAction', () => {
  const validData = {
    name: 'Municipalidad Distrital de Curimana',
    ruc: '20123456789',
    address: 'Plaza de Armas S/N',
    billing_cut_day: 26,
    payment_grace_days: 20,
    logo_url: null
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockCreateClient.mockResolvedValue({ from: mockSupabaseFrom })
  })

  it('debería actualizar la configuración y revalidar las rutas', async () => {
    let updatePayload: any = null

    const fetchChain = createAwaitableChain({ data: { id: 'cfg1' }, error: null })
    const updateChain = (() => {
      const promise = Promise.resolve({ data: { id: 'cfg1' }, error: null })
      const chain: any = {
        eq: vi.fn().mockReturnThis(),
        then: promise.then.bind(promise),
      }
      return chain
    })()

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') {
        const callCount = mockSupabaseFrom.mock.calls.filter((c: any[]) => c[0] === 'municipality_config').length
        if (callCount === 1) return fetchChain
        return {
          update: vi.fn((payload: any) => {
            updatePayload = payload
            return updateChain
          })
        }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await updateMunicipalityConfigAction(validData)

    expect(result).toEqual({ success: true })
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/config')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/cashier')
    expect(mockRevalidatePath).toHaveBeenCalledWith('/admin/receipts')
    expect(updatePayload).toEqual(expect.objectContaining({
      name: validData.name,
      ruc: validData.ruc,
      address: validData.address,
      billing_cut_day: validData.billing_cut_day,
      payment_grace_days: validData.payment_grace_days,
      logo_url: null
    }))
  })

  it('debería retornar error si no existe registro de configuración', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') {
        return createAwaitableChain({ data: null, error: { message: 'No rows found' } })
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await updateMunicipalityConfigAction(validData)

    expect(result).toEqual({ success: false, error: 'No existe registro de configuracion municipal' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería retornar error si el fetch retorna data null sin error', async () => {
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') {
        return createAwaitableChain({ data: null, error: null })
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await updateMunicipalityConfigAction(validData)

    expect(result).toEqual({ success: false, error: 'No existe registro de configuracion municipal' })
  })

  it('debería retornar error si el update falla', async () => {
    const fetchChain = createAwaitableChain({ data: { id: 'cfg1' }, error: null })
    const updateChain = (() => {
      const promise = Promise.resolve({ data: null, error: { message: 'Update failed' } })
      const chain: any = {
        eq: vi.fn().mockReturnThis(),
        then: promise.then.bind(promise),
      }
      return chain
    })()

    let callCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') {
        callCount++
        if (callCount === 1) return fetchChain
        return {
          update: vi.fn().mockReturnValue(updateChain)
        }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await updateMunicipalityConfigAction(validData)

    expect(result).toEqual({ success: false, error: 'Update failed' })
    expect(mockRevalidatePath).not.toHaveBeenCalled()
  })

  it('debería usar logo_url null si se pasa string vacío', async () => {
    let updatePayload: any = null

    const fetchChain = createAwaitableChain({ data: { id: 'cfg1' }, error: null })
    const updateChain = (() => {
      const promise = Promise.resolve({ data: { id: 'cfg1' }, error: null })
      const chain: any = {
        eq: vi.fn().mockReturnThis(),
        then: promise.then.bind(promise),
      }
      return chain
    })()

    let callCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') {
        callCount++
        if (callCount === 1) return fetchChain
        return {
          update: vi.fn((payload: any) => {
            updatePayload = payload
            return updateChain
          })
        }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await updateMunicipalityConfigAction({ ...validData, logo_url: '' })

    expect(result).toEqual({ success: true })
    expect(updatePayload.logo_url).toBeNull()
  })

  it('debería usar logo_url proporcionado si no está vacío', async () => {
    let updatePayload: any = null

    const fetchChain = createAwaitableChain({ data: { id: 'cfg1' }, error: null })
    const updateChain = (() => {
      const promise = Promise.resolve({ data: { id: 'cfg1' }, error: null })
      const chain: any = {
        eq: vi.fn().mockReturnThis(),
        then: promise.then.bind(promise),
      }
      return chain
    })()

    let callCount = 0
    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'municipality_config') {
        callCount++
        if (callCount === 1) return fetchChain
        return {
          update: vi.fn((payload: any) => {
            updatePayload = payload
            return updateChain
          })
        }
      }
      return createAwaitableChain({ data: null, error: null })
    })

    const result = await updateMunicipalityConfigAction({ ...validData, logo_url: 'https://example.com/logo.png' })

    expect(result).toEqual({ success: true })
    expect(updatePayload.logo_url).toBe('https://example.com/logo.png')
  })
})
