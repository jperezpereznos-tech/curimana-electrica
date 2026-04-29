'use client'

import { useRef, useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Camera, X, Check, RotateCcw } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface CameraCaptureProps {
  onCapture: (imageBase64: string) => void
  onClose: () => void
  open: boolean
}

export function CameraCapture({ onCapture, onClose, open }: CameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const startCamera = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' },
        audio: false
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      setError('No se pudo acceder a la cámara. Verifica los permisos.')
      console.error('Error accessing camera:', err)
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop())
      setStream(null)
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
        const imageData = canvas.toDataURL('image/jpeg', 0.8)
        setCapturedImage(imageData)
        stopCamera()
      }
    }
  }, [stopCamera])

  const retakePhoto = useCallback(() => {
    setCapturedImage(null)
    startCamera()
  }, [startCamera])

  const confirmPhoto = useCallback(() => {
    if (capturedImage) {
      onCapture(capturedImage)
      setCapturedImage(null)
      stopCamera()
      onClose()
    }
  }, [capturedImage, onCapture, onClose, stopCamera])

  const handleClose = useCallback(() => {
    stopCamera()
    setCapturedImage(null)
    setError(null)
    onClose()
  }, [onClose, stopCamera])

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Camera className="h-5 w-5" />
            Capturar Foto del Medidor
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">
              {error}
            </div>
          )}

          {!stream && !capturedImage && !error && (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <div className="w-24 h-24 bg-muted rounded-full flex items-center justify-center">
                <Camera className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground text-center">
                Presiona el botón para iniciar la cámara
              </p>
              <Button onClick={startCamera} disabled={isLoading}>
                {isLoading ? 'Iniciando...' : 'Iniciar Cámara'}
              </Button>
            </div>
          )}

          {stream && !capturedImage && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="flex justify-center">
                <Button size="lg" onClick={capturePhoto} className="rounded-full h-16 w-16">
                  <div className="h-12 w-12 rounded-full border-2 border-white" />
                </Button>
              </div>
            </div>
          )}

          {capturedImage && (
            <div className="space-y-4">
              <div className="relative aspect-[4/3] bg-black rounded-lg overflow-hidden">
                <img
                  src={capturedImage}
                  alt="Foto capturada"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="flex justify-center gap-4">
                <Button variant="outline" onClick={retakePhoto} className="gap-2">
                  <RotateCcw className="h-4 w-4" />
                  Reintentar
                </Button>
                <Button onClick={confirmPhoto} className="gap-2">
                  <Check className="h-4 w-4" />
                  Usar Foto
                </Button>
              </div>
            </div>
          )}
        </div>

        <canvas ref={canvasRef} className="hidden" />
      </DialogContent>
    </Dialog>
  )
}
