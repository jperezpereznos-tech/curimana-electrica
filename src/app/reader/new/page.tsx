'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ReaderLayout } from '@/components/layouts/reader-layout'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Camera, Search, ArrowLeft, Save, AlertTriangle, Check } from 'lucide-react'
import { CameraCapture } from '@/components/camera-capture'
import { db } from '@/lib/db/dexie'
import Link from 'next/link'

export default function NewReadingPage() {
  const router = useRouter()
  const [supplyNumber, setSupplyNumber] = useState('')
  const [customer, setCustomer] = useState<any>(null)
  const [currentReading, setCurrentReading] = useState('')
  const [notes, setNotes] = useState('')
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null)
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isSearching, setIsSearching] = useState(false)

  const handleSearch = async () => {
    if (!supplyNumber) return
    setIsSearching(true)
    
    try {
      // Primero buscamos en la cache local
      const cachedCustomer = await db.customers_cache
        .where('supply_number')
        .equals(supplyNumber)
        .first()
      
      if (cachedCustomer) {
        setCustomer({
          id: cachedCustomer.id,
          full_name: cachedCustomer.full_name,
          address: cachedCustomer.address,
          previous_reading: cachedCustomer.previous_reading,
        })
      } else {
        // Simulación: En la vida real buscaría en IndexedDB o API
        // Por ahora, simulamos un cliente encontrado
        setTimeout(() => {
          setCustomer({
            id: 'cust-1',
            full_name: 'Juan Perez Garcia',
            address: 'Jr. Lima 123',
            previous_reading: 1250,
          })
          setIsSearching(false)
        }, 500)
      }
    } catch (error) {
      console.error('Error searching customer:', error)
      setIsSearching(false)
    }
  }

  const handleSave = async () => {
    if (!customer || !currentReading) return

    const reading = Number(currentReading)
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

      alert('Lectura guardada localmente')
      router.push('/reader')
    } catch (error) {
      console.error('Error saving reading:', error)
      alert('Error al guardar la lectura')
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
            <Button onClick={handleSearch} disabled={isSearching} size="icon" className="h-12 w-12">
              <Search className="h-5 w-5" />
            </Button>
          </CardContent>
        </Card>

        {customer && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
            {/* Datos del Cliente */}
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
