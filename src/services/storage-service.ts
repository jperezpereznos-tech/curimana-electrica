import { createClient } from '@/lib/supabase/client'

export class StorageService {
  private supabase = createClient()
  private bucketName = 'reading-photos'

  /**
   * Sube una foto de lectura a Supabase Storage
   * @param base64Image - Imagen en formato base64
   * @param fileName - Nombre del archivo (opcional, se genera uno si no se proporciona)
   * @returns URL pública de la imagen subida
   */
  async uploadReadingPhoto(base64Image: string, fileName?: string): Promise<string> {
    try {
      // Generar nombre único si no se proporciona
      const finalFileName = fileName || `reading_${Date.now()}_${Math.random().toString(36).substring(7)}.jpg`
      
      // Convertir base64 a blob
      const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '')
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      
      const byteArray = new Uint8Array(byteNumbers)
      const blob = new Blob([byteArray], { type: 'image/jpeg' })
      const file = new File([blob], finalFileName, { type: 'image/jpeg' })

      // Subir archivo
      const { data, error } = await this.supabase.storage
        .from(this.bucketName)
        .upload(`public/${finalFileName}`, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (error) {
        throw error
      }

      // Obtener URL pública
      const { data: { publicUrl } } = this.supabase.storage
        .from(this.bucketName)
        .getPublicUrl(`public/${finalFileName}`)

      return publicUrl
    } catch (error) {
      console.error('Error uploading photo:', error)
      throw new Error('Error al subir la foto')
    }
  }

  /**
   * Elimina una foto de lectura
   * @param filePath - Ruta del archivo en el bucket
   */
  async deleteReadingPhoto(filePath: string): Promise<void> {
    try {
      const { error } = await this.supabase.storage
        .from(this.bucketName)
        .remove([filePath])

      if (error) {
        throw error
      }
    } catch (error) {
      console.error('Error deleting photo:', error)
      throw new Error('Error al eliminar la foto')
    }
  }

  /**
   * Obtiene la URL de una foto
   * @param fileName - Nombre del archivo
   * @returns URL pública
   */
  getPhotoUrl(fileName: string): string {
    const { data: { publicUrl } } = this.supabase.storage
      .from(this.bucketName)
      .getPublicUrl(`public/${fileName}`)
    
    return publicUrl
  }
}

export const storageService = new StorageService()
