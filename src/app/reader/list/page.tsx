'use client'

import { useState, useEffect } from 'react'
import { ReadingRouteClient } from './reading-route-client'
import { StaggerReveal } from '@/components/stagger-reveal'
import { getReaderAssignedSectorAction } from '../actions'
import { db } from '@/lib/db/dexie'
import { useOfflineSync } from '@/hooks/use-offline-sync'
import type { AssignedSectorItem } from '@/types/views'
import { Loader2 } from 'lucide-react'

interface RouteCustomer {
  id: string
  supply_number: string
  full_name: string
  address: string | null
  sectorName: string | null
  sector_id: string | null
  is_active: boolean | null
  last_reading: string | null
}

export default function ReadingRoutePage() {
  const [assignedSector, setAssignedSector] = useState<AssignedSectorItem | null>(null)
  const [customers, setCustomers] = useState<RouteCustomer[]>([])
  const [loading, setLoading] = useState(true)
  const { isOnline } = useOfflineSync()

  useEffect(() => {
    let cancelled = false

    async function loadData() {
      try {
        if (isOnline) {
          const sectorResult = await getReaderAssignedSectorAction()
          if (cancelled) return
          if (sectorResult.success && sectorResult.data) {
            const profile = sectorResult.data as { assigned_sector_id: string | null; sectors: AssignedSectorItem | null }
            if (profile.assigned_sector_id && profile.sectors) {
              setAssignedSector(profile.sectors)
              const cached = await db.customers_cache.where('sector_id').equals(profile.assigned_sector_id).toArray()
              if (cancelled) return
              setCustomers(cached.map(c => ({
                id: c.id,
                supply_number: c.supply_number,
                full_name: c.full_name,
                address: c.address || null,
                sectorName: c.sectorName || c.sector || null,
                sector_id: c.sector_id,
                is_active: true,
                last_reading: null,
              })))
            }
          }
        } else {
          const allCached = await db.customers_cache.toArray()
          if (cancelled) return
          if (allCached.length > 0) {
            const firstSectorId = allCached[0].sector_id
            const sectorCustomers = firstSectorId
              ? allCached.filter(c => c.sector_id === firstSectorId)
              : allCached
            setCustomers(sectorCustomers.map(c => ({
              id: c.id,
              supply_number: c.supply_number,
              full_name: c.full_name,
              address: c.address || null,
              sectorName: c.sectorName || c.sector || null,
              sector_id: c.sector_id,
              is_active: true,
              last_reading: null,
            })))

            if (firstSectorId && sectorCustomers.length > 0) {
              const sectorName = sectorCustomers[0].sectorName || sectorCustomers[0].sector
              setAssignedSector({ id: firstSectorId, name: sectorName || 'Sector', code: '' })
            }
          }
        }
      } catch (e) {
        console.error('Error loading reading route:', e)
        try {
          const allCached = await db.customers_cache.toArray()
          if (cancelled) return
          setCustomers(allCached.map(c => ({
            id: c.id,
            supply_number: c.supply_number,
            full_name: c.full_name,
            address: c.address || null,
            sectorName: c.sectorName || c.sector || null,
            sector_id: c.sector_id,
            is_active: true,
            last_reading: null,
          })))
        } catch {
          // IndexedDB unavailable
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadData()
    return () => { cancelled = true }
  }, [isOnline])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <StaggerReveal>
      <ReadingRouteClient assignedSector={assignedSector} customers={customers} />
    </StaggerReveal>
  )
}
