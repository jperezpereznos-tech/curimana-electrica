'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ReaderLayout } from '@/components/layouts/reader-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Search, ArrowLeft, Save, AlertTriangle, Check, Loader2 } from 'lucide-react'
import { CameraCapture } from '@/components/camera-capture'
import { db } from '@/lib/db/dexie'
import { customerService } from '@/services/customer-service'
import { getLatestReadingAction } from '../actions'
import Link from 'next/link'

export default function NewReadingPage() {
  return (
    <Suspense fallback={<ReaderLayout><div className="flex items-center justify-center min-h-[60vh]"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div></ReaderLayout>}>
      <NewReadingContent />
    </Suspense>
  )
}

function NewReadingContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialSupply = searchParams.get('supply') || ''
  const [supplyNumber, setSupplyNumber] = useState(initialSupply)
  const [customer, setCustomer] = useState<any>(null)
  const [currentReading, setCurrentReading] = useState('')
  const [notes, setNotes] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saveSuccess, setSaveSuccess] = useState(false)

  const handleSearch = useCallback(async (supply: string) => {
    if (!supply) return

    setIsSearching(true)
    setNotFound(false)
    setCustomer(null)

    try {
      const cachedCustomer = await db.customers_cache
        .where('supply_number')
        .equals(supply)
        .first()

      if (cachedCustomer) {
        setCustomer({
          id: cachedCustomer.id,
          full_name: cachedCustomer.full_name,
          address: cachedCustomer.address,
          previous_reading: cachedCustomer.previous_reading,
        })
      } else if (navigator.onLine) {
        const results = await customerService.searchCustomers(supply)
        const found = results?.find((c: any) => c.supply_number === supply)
        if (found) {
          let previousReading = 0
          try {
            const latestReading = await getLatestReadingAction(found.id)
            if (latestReading) {
              previousReading = Number(latestReading.current_reading) || 0
            }
          } catch {}
          await db.customers_cache.put({
            id: found.id,
            supply_number: found.supply_number,
            full_name: found.full_name,
            address: found.address || '',
            sector: found.sector || '',
            tariff_id: found.tariff_id || '',
            previous_reading: previousReading,
          })
          setCustomer({
            id: found.id,
            full_name: found.full_name,
            address: found.address,
            previous_reading: previousReading,
          })
        } else {
          setNotFound(true)
        }
      } else {
        setNotFound(true)
      }
  } catch {
    setNotFound(true)
    } finally {
      setIsSearching(false)
    }
  }, [])

  useEffect(() => {
    if (supplyNumber.length >= 2) {
      const timer = setTimeout(() => {
        handleSearch(supplyNumber)
      }, 300)
      return () => clearTimeout(timer)
    }
  }, [supplyNumber, handleSearch])

  const handleSave = async () => {
    if (!customer || !currentReading) return
    setSaveError(null)
    setSaveSuccess(false)

    const reading = Number(currentReading)
    if (isNaN(reading) || reading < 0) {
      setSaveError('La lectura debe ser un número válido mayor o igual a cero')
      return
    }

    const previous = customer.previous_reading

    // Handle decreasing meter readings properly (meter resets)
    if (reading < previous) {
      if (!confirm('La lectura es MENOR a la anterior. ¿Estás seguro?')) {
        return
      }
    }

  try {
    await db.pending_readings.add({
        customer_id: customer.id,
        supply_number: supplyNumber,
        full_name: customer.full_name,
        previous_reading: previous,
        current_reading: reading,
        reading_date: new Date().toISOString().split('T')[0],
        notes,
        photo_base64: capturedPhoto || undefined,
        status: 'pending',
        created_at: new Date().toISOString(),
      needs_review: reading < previous
    })

    setSaveSuccess(true)
    router.push('/reader')
  } catch {
    setSaveError('Error al guardar la lectura')
    }
  }

  return (
    <ReaderLayout>
      <div className="flex flex-col gap-6 pb-20">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" render={<Link href="/reader"><ArrowLeft className="h-5 w-5" /></Link>} />
          <h2 className="text-xl font-bold">Nueva Lectura</h2>
        </div>

        {/* Buscador de Suministro */}
        <Card>
          <CardContent className="p-4 flex gap-2">
            <div className="flex-1">
              <Label htmlFor="supply" className="sr-only">Suministro</Label>
              <Input
                id="supply"
                placeholder="N° Suministro"
                className="text-lg h-12 font-mono"
                value={supplyNumber}
                onChange={(e) => setSupplyNumber(e.target.value)}
                type="number"
              />
            </div>
                <Button onClick={() => handleSearch(supplyNumber)} disabled={isSearching} size="icon" className="h-12 w-12">
              <Search className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

    {notFound && !customer && (
      <div className="bg-destructive/10 text-destructive p-4 rounded-lg text-sm text-center">
        No se encontró el suministro <strong className="font-mono">{supplyNumber}</strong>.
        {!navigator.onLine && ' Verifica tu conexión e intenta de nuevo.'}
      </div>
    )}

    {customer && (
      <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            <div className="bg-muted/50 p-4 rounded-lg">
              <p className="text-sm font-semibold text-primary">{customer.full_name}</p>
              <p className="text-xs text-muted-foreground">{customer.address}</p>
            </div>

            {/* Lectura Anterior */}
            <div className="flex justify-between items-center bg-card border p-4 rounded-lg">
              <span className="text-sm text-muted-foreground font-medium">Lectura Anterior:</span>
              <span className="text-2xl font-mono font-bold">{customer.previous_reading}</span>
            </div>

            {/* Input Lectura Actual */}
            <div className="space-y-2">
              <Label htmlFor="current" className="text-lg">Lectura Actual</Label>
              <Input
                id="current"
                type="number"
                placeholder="00000"
                className="text-4xl h-24 text-center font-mono font-bold"
                value={currentReading}
                onChange={(e) => setCurrentReading(e.target.value)}
              />
              {currentReading && Number(currentReading) < customer.previous_reading && (
                <div className="flex items-center gap-2 text-destructive text-sm font-medium mt-1">
                  <AlertTriangle className="h-4 w-4" /> La lectura es menor a la anterior
                </div>
              )}
            </div>

      {/* Botón Foto */}
      {!capturedPhoto ? (
        <Button 
          variant="outline" 
          size="lg" 
          className="w-full h-16 gap-3 border-dashed"
          onClick={() => setIsCameraOpen(true)}
        >
          <Camera className="h-6 w-6" /> Tomar Foto del Medidor
        </Button>
      ) : (
        <div className="relative">
          <div className="w-full h-32 rounded-lg overflow-hidden border-2 border-dashed border-green-500">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={capturedPhoto}
                  alt="Medidor capturado"
                  className="w-full h-full object-cover"
                />
          </div>
          <div className="absolute top-2 right-2 flex gap-2">
            <Button 
              size="sm" 
              variant="destructive"
              onClick={() => setCapturedPhoto(null)}
            >
              Eliminar
            </Button>
          </div>
          <div className="absolute bottom-2 left-2 bg-green-500 text-white px-2 py-1 rounded text-xs flex items-center gap-1">
            <Check className="h-3 w-3" /> Foto capturada
          </div>
        </div>
      )}

      <CameraCapture
        open={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(photo) => setCapturedPhoto(photo)}
      />

            {/* Notas */}
            <div className="space-y-2">
              <Label htmlFor="notes">Notas / Observaciones</Label>
              <Input
                id="notes"
                placeholder="Ej: Medidor empañado, perro bravo..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

    {/* Botón Guardar */}
    {saveError && (
      <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg">
        {saveError}
      </div>
    )}
    {saveSuccess && (
      <div className="bg-green-500/10 text-green-700 text-sm p-3 rounded-lg">
        Lectura guardada localmente
      </div>
    )}
    <Button
              className="w-full h-20 text-xl gap-3 shadow-lg" 
              onClick={handleSave}
              disabled={!currentReading}
            >
              <Save className="h-6 w-6" /> Guardar Lectura
            </Button>
          </div>
        )}
      </div>
    </ReaderLayout>
  )
}
